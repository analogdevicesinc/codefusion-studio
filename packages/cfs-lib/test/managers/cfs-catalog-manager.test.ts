/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CatalogError, CfsApiClient, SocCatalog } from "cfs-ccm-lib";

import { CatalogManager } from "../../src/catalog/cfs-catalog-manager.js";

describe("CatalogManager.loadCatalog", () => {
	let storeDir: string;
	let manager: CatalogManager;

	beforeEach(() => {
		storeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cfs-catalog-"));
		// SocCatalog only reads rest.socs from the client; refresh() itself is stubbed.
		manager = new CatalogManager({
			catalogStoreDir: storeDir,
			apiClient: { rest: { socs: {} } } as unknown as CfsApiClient
		});
		sinon.stub(SocCatalog.prototype, "validate").resolves();
		sinon.stub(SocCatalog.prototype, "isEmpty").resolves(false);
	});

	afterEach(() => {
		sinon.restore();
		fs.rmSync(storeDir, { recursive: true, force: true });
	});

	it("resolves true when the catalog was refreshed", async () => {
		sinon.stub(SocCatalog.prototype, "refresh").resolves();

		expect(await manager.loadCatalog()).to.equal(true);
	});

	it("resolves false without refreshing when the manager is offline", async () => {
		const refresh = sinon
			.stub(SocCatalog.prototype, "refresh")
			.resolves();
		const offlineManager = new CatalogManager({
			catalogStoreDir: storeDir
		});

		expect(await offlineManager.loadCatalog()).to.equal(false);
		expect(refresh.called).to.equal(false);
	});

	it("resolves false when the service is unreachable but a cached catalog exists", async () => {
		sinon.stub(SocCatalog.prototype, "refresh").rejects(
			new CatalogError({
				type: "SERVICE_ERROR",
				message: "Network failure"
			})
		);

		expect(await manager.loadCatalog()).to.equal(false);
	});

	it("rethrows refresh errors that are not network failures", async () => {
		sinon.stub(SocCatalog.prototype, "refresh").rejects(
			new CatalogError({
				type: "INVALID_CONTENTS",
				message: "Corrupt catalog"
			})
		);

		let thrown: unknown;
		try {
			await manager.loadCatalog();
		} catch (error) {
			thrown = error;
		}

		expect(thrown).to.be.instanceOf(CatalogError);
	});
});

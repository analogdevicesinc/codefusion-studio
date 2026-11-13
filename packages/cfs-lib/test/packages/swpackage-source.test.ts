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

import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createSWPackageCatalogMock } from "cfs-ccm-lib/mocks";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	createCatalogSWPackageSource,
	type SWPackageSource
} from "../../src/packages/swpackage-source.js";

chai.use(chaiAsPromised);

describe("swpackage-source", () => {
	let dir: string;
	const sources: SWPackageSource[] = [];

	before(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "swpkg-source-"));
	});

	afterEach(async () => {
		while (sources.length > 0) {
			await sources.pop()?.dispose();
		}
	});

	after(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	describe("createCatalogSWPackageSource", () => {
		let backupZip: string;

		before(async () => {
			backupZip = path.join(dir, "backup.zip");
			const mock = createSWPackageCatalogMock({ dataset: "example" });
			await mock.export(backupZip);
			await mock.dispose();
		});

		it("loads the on-disk catalog and exposes the same lifecycle", async () => {
			const storeDir = path.join(dir, "catalog-store");
			const source = await createCatalogSWPackageSource({
				catalogStoreDir: storeDir,
				catalogBackupZipFile: backupZip
			});
			sources.push(source);
			await expect(source.getAll()).to.eventually.have.length(5);
			expect(fs.existsSync(path.join(storeDir, "swpackage"))).to.be
				.true;
			await source.purge();
			await expect(source.getAll()).to.eventually.be.empty;
			await source.refresh();
			await expect(source.getAll()).to.eventually.have.length(5);
		});

		it("rejects when nothing can populate the catalog", async () => {
			await expect(
				createCatalogSWPackageSource({
					catalogStoreDir: path.join(dir, "empty-store")
				})
			).to.be.rejectedWith(/No catalog backup configured/);
		});
	});
});

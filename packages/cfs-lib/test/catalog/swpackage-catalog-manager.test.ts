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
import type { CfsApiClient, SWPackage } from "cfs-ccm-lib";
import { createSWPackageCatalogMock } from "cfs-ccm-lib/mocks";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CatalogManager } from "../../src/catalog/cfs-catalog-manager.js";
import { SWPackageCatalogManager } from "../../src/catalog/swpackage-catalog-manager.js";

chai.use(chaiAsPromised);

/** A CfsApiClient whose only working route is the software package list. */
const stubClient = (
	getAll: (args: { cfsVersion?: string }) => Promise<SWPackage[]>
): CfsApiClient =>
	({
		rest: { swPackages: { TAG: "swpackage", getAll } }
	}) as unknown as CfsApiClient;

describe("SWPackageCatalogManager", () => {
	let dir: string;
	let backupZip: string;
	let examplePackages: SWPackage[];
	const managers: SWPackageCatalogManager[] = [];

	before(async () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "swpkg-catalog-"));
		backupZip = path.join(dir, "backup.zip");
		const mock = createSWPackageCatalogMock({ dataset: "example" });
		examplePackages = (await mock.getAll()) as SWPackage[];
		await mock.export(backupZip);
		await mock.dispose();
	});

	afterEach(async () => {
		while (managers.length > 0) {
			await managers.pop()?.dispose();
		}
	});

	after(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const make = (
		options: Partial<
			ConstructorParameters<typeof SWPackageCatalogManager>[0]
		> = {}
	): SWPackageCatalogManager => {
		const manager = new SWPackageCatalogManager({
			catalogStoreDir: fs.mkdtempSync(path.join(dir, "store-")),
			...options
		});
		managers.push(manager);
		return manager;
	};

	it("creates the store directory and exposes an empty catalog", async () => {
		const storeDir = path.join(dir, "fresh", "nested");
		const manager = make({ catalogStoreDir: storeDir });
		expect(fs.existsSync(storeDir)).to.be.true;
		await expect(manager.swPackageCatalog.isEmpty()).to.eventually.be
			.true;
	});

	it("fails to load offline with no backup and no contents", async () => {
		const manager = make();
		await expect(manager.loadCatalog()).to.be.rejectedWith(
			/No catalog backup configured/
		);
	});

	it("imports the backup zip when offline and empty", async () => {
		const manager = make({ catalogBackupZipFile: backupZip });
		await manager.loadCatalog();
		await expect(
			manager.swPackageCatalog.getAll()
		).to.eventually.deep.equal(examplePackages);
	});

	it("refreshes from the API when online, passing the CFS version", async () => {
		const seen: string[] = [];
		const client = stubClient(async ({ cfsVersion }) => {
			seen.push(cfsVersion ?? "");
			return examplePackages.slice(0, 2);
		});
		const manager = make({ apiClient: client, cfsVersion: "2.4.0" });
		await manager.loadCatalog();
		expect(seen).to.deep.equal(["2.4.0"]);
		await expect(
			manager.swPackageCatalog.getAll()
		).to.eventually.have.length(2);
	});

	it("keeps going on a network error and falls back to the backup", async () => {
		const client = stubClient(async () => {
			throw new Error("getaddrinfo ENOTFOUND");
		});
		const manager = make({
			apiClient: client,
			catalogBackupZipFile: backupZip
		});
		await manager.loadCatalog();
		await expect(
			manager.swPackageCatalog.getAll()
		).to.eventually.have.length(examplePackages.length);
	});

	it("rejects when the server answers Unauthorized", async () => {
		const client = stubClient(async () => {
			throw new Error("Unauthorized");
		});
		const manager = make({
			apiClient: client,
			catalogBackupZipFile: backupZip
		});
		await expect(manager.loadCatalog()).to.be.rejected;
	});

	it("empties the catalog on purge", async () => {
		const manager = make({ catalogBackupZipFile: backupZip });
		await manager.loadCatalog();
		await expect(manager.swPackageCatalog.isEmpty()).to.eventually.be
			.false;
		await manager.purgeCatalog();
		await expect(manager.swPackageCatalog.isEmpty()).to.eventually.be
			.true;
	});

	it("shares a store directory with the SoC catalog manager", async () => {
		const storeDir = fs.mkdtempSync(path.join(dir, "shared-"));
		const soc = new CatalogManager({ catalogStoreDir: storeDir });
		const sw = make({
			catalogStoreDir: storeDir,
			catalogBackupZipFile: backupZip
		});
		await sw.loadCatalog();
		await expect(soc.socCatalog.isEmpty()).to.eventually.be.true;
		await expect(sw.swPackageCatalog.isEmpty()).to.eventually.be
			.false;
		expect(fs.existsSync(path.join(storeDir, "swpackage", "db"))).to
			.be.true;
		expect(fs.existsSync(path.join(storeDir, "soc", "db"))).to.be
			.true;
		await soc.dispose();
	});
});

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

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sinon from "sinon";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { ConanRemoteManager } from "../src/conan-backend/conan-remote.js";

use(chaiAsPromised);

describe("Package manager lock order", function () {
	let dir: string;
	let api: ConanPkgManager;
	let order: string[];
	let releaseInstall: () => void;
	let installEntered: Promise<void>;

	beforeEach(function () {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "packman-lock-"));
		api = new ConanPkgManager({
			conanHome: path.join(dir, "conan"),
			indexDir: dir,
			conanConfigPath: path.join(dir, "config")
		});
		order = [];

		// install() holds the lock until the test releases it
		let entered!: () => void;
		installEntered = new Promise((resolve) => (entered = resolve));
		const released = new Promise<void>(
			(resolve) => (releaseInstall = resolve)
		);
		sinon
			.stub(ConanPkgManager.prototype, "install")
			.callsFake(async () => {
				entered();
				await released;
				return [];
			});
		sinon
			.stub(ConanPkgManager.prototype, "listRemoteStates")
			.callsFake(async () => {
				order.push("listRemoteStates");
				return [];
			});
		sinon
			.stub(ConanPkgManager.prototype, "search")
			.callsFake(async (pattern?: string) => {
				order.push(`search ${pattern}`);
				return [];
			});
	});

	afterEach(function () {
		sinon.restore();
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("runs waiting calls in the order they were made", async function () {
		const holder = api.install([{ name: "pkg", version: "1.0" }]);
		await installEntered;

		const waiting = [
			api.listRemoteStates(),
			api.search("a/*"),
			api.search("b/*"),
			api.search("c/*")
		];
		releaseInstall();
		await Promise.all([holder, ...waiting]);

		expect(order).to.deep.equal([
			"listRemoteStates",
			"search a/*",
			"search b/*",
			"search c/*"
		]);
	});

	it("runs the next call after one that fails", async function () {
		(ConanPkgManager.prototype.search as sinon.SinonStub).callsFake(
			async () => {
				throw new Error("search failed");
			}
		);
		const holder = api.install([{ name: "pkg", version: "1.0" }]);
		await installEntered;

		const failing = api.search("a/*");
		const next = api.listRemoteStates();
		releaseInstall();

		await holder;
		await expect(failing).to.be.rejectedWith("search failed");
		await next;
		expect(order).to.deep.equal(["listRemoteStates"]);
	});

	it("queues a remote cache miss before later proxied calls sharing the lock file", async function () {
		const otherApi = new ConanPkgManager({
			conanHome: path.join(dir, "conan"),
			indexDir: dir,
			conanConfigPath: path.join(dir, "config")
		});
		const cacheChecks = sinon.stub(
			ConanRemoteManager.prototype,
			"getCachedRemotes"
		);
		cacheChecks.onFirstCall().resolves(undefined);
		cacheChecks.onSecondCall().callsFake(async () => {
			order.push("listRemotes");
			return [];
		});

		const holder = api.install([{ name: "pkg", version: "1.0" }]);
		await installEntered;

		const listing = api.listRemotes();
		// Let the initial asynchronous cache check finish before queuing a later call.
		await Promise.resolve();
		const search = otherApi.search("a/*");
		releaseInstall();
		await Promise.all([holder, listing, search]);

		expect(order).to.deep.equal(["listRemotes", "search a/*"]);
		expect(cacheChecks.callCount).to.equal(2);
	});

	it("runs the next proxied call after a queued remote cache miss fails", async function () {
		const cacheChecks = sinon.stub(
			ConanRemoteManager.prototype,
			"getCachedRemotes"
		);
		cacheChecks.onFirstCall().resolves(undefined);
		cacheChecks.onSecondCall().callsFake(async () => {
			order.push("listRemotes");
			throw new Error("cache read failed");
		});

		const holder = api.install([{ name: "pkg", version: "1.0" }]);
		await installEntered;

		const listing = api.listRemotes();
		const rejected = expect(listing).to.be.rejectedWith(
			"cache read failed"
		);
		await Promise.resolve();
		const search = api.search("a/*");
		releaseInstall();
		await Promise.all([holder, rejected, search]);

		expect(order).to.deep.equal(["listRemotes", "search a/*"]);
	});
});

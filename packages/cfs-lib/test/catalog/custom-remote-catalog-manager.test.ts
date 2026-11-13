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

import { expect } from "chai";
import type { SWPackage } from "cfs-ccm-lib";
import type {
	CfsPackage,
	CfsPackageRemoteState
} from "cfs-package-manager";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	CustomRemoteCatalogManager,
	type CustomRemoteIndexer
} from "../../src/catalog/custom-remote-catalog-manager.js";

const remote = (
	name: string,
	{ custom = true, disabled = false } = {}
): CfsPackageRemoteState => ({
	name,
	url: new URL(`https://example.com/${name}`),
	disabled,
	custom
});

const info = (ref: string): CfsPackage => {
	const [name, version] = ref.split("#")[0].split("/");
	return {
		reference: { name, version },
		description: `${name} package`,
		license: "MIT",
		cfsVersion: "^2.4.0",
		soc: ["SOC1"],
		type: "sdk"
	};
};

/** A fake package manager serving `refs` per remote; records fetched refs. */
class FakeIndexer implements CustomRemoteIndexer {
	remotes: CfsPackageRemoteState[] = [];
	refs: Record<string, string[] | { error: string; auth?: boolean }> =
		{};
	fetched: string[] = [];
	/** How many references each fetch call asked for. */
	callSizes: number[] = [];
	failing = new Set<string>();
	broken = new Set<string>();

	listRemoteStates = async () => this.remotes;
	listRemoteRefs = async (names: string[]) =>
		Object.fromEntries(names.map((name) => [name, this.refs[name]]));
	getRemotePackageInfo = async (remote: string, refs: string[]) => {
		this.callSizes.push(refs.length);
		if (
			this.failing.has(remote) ||
			refs.some((ref) => this.broken.has(ref))
		) {
			throw new Error(`${remote} failed`);
		}
		this.fetched.push(...refs);
		return Object.fromEntries(refs.map((ref) => [ref, info(ref)]));
	};
}

describe("CustomRemoteCatalogManager", () => {
	let dir: string;
	let indexer: FakeIndexer;
	let manager: CustomRemoteCatalogManager;

	const update = async () => {
		const changes = await manager.check();
		if (changes.changed) {
			await manager.apply(changes);
		}
		return changes;
	};
	const ids = async () =>
		(await manager.getPackages()).map((pkg) => pkg.id).sort();

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "custom-catalog-"));
		indexer = new FakeIndexer();
		indexer.remotes = [
			remote("remote1"),
			remote("managed1", { custom: false })
		];
		indexer.refs = { remote1: ["package1/1.0.0"] };
		manager = new CustomRemoteCatalogManager(dir, indexer);
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("indexes the packages of custom remotes only", async () => {
		await update();

		const [pkg] = await manager.getPackages();
		expect(await ids()).to.deep.equal(["remote1:package1/1.0.0"]);
		expect(pkg).to.deep.include({
			name: "package1",
			version: "1.0.0",
			license: "MIT",
			type: "sdk",
			cfsVersionConstraint: "^2.4.0",
			compatibleHardware: { soc: ["SOC1"] }
		});
		expect(pkg.repo).to.deep.include({
			id: "remote1",
			repoUrl: "https://example.com/remote1",
			authRequired: false
		});
		expect(
			fs.existsSync(path.join(dir, "custom-remotes.json"))
		).to.equal(true);
	});

	it("finds nothing to do when the remotes are unchanged", async () => {
		await update();
		indexer.fetched = [];

		expect((await update()).changed).to.equal(false);
		expect(indexer.fetched).to.deep.equal([]);
	});

	it("fetches only new versions and drops unlisted ones", async () => {
		indexer.refs = {
			remote1: ["package1/1.0.0", "package2/1.0.0"]
		};
		await update();
		indexer.fetched = [];
		indexer.refs = {
			remote1: ["package1/1.0.0", "package1/1.1.0"]
		};

		await update();

		expect(indexer.fetched).to.deep.equal(["package1/1.1.0"]);
		expect(await ids()).to.deep.equal([
			"remote1:package1/1.0.0",
			"remote1:package1/1.1.0"
		]);
	});

	it("keeps an index written with revisions without fetching it again", async () => {
		await update();
		const file = path.join(dir, "custom-remotes.json");
		const [pkg] = JSON.parse(
			fs.readFileSync(file, "utf8")
		) as SWPackage[];
		fs.writeFileSync(
			file,
			JSON.stringify([{ ...pkg, id: "remote1:package1/1.0.0#rev1" }])
		);
		indexer.fetched = [];

		const changes = await update();

		expect(changes.changed).to.equal(false);
		expect(indexer.fetched).to.deep.equal([]);
		expect(await ids()).to.deep.equal([
			"remote1:package1/1.0.0#rev1"
		]);
	});

	it("keeps the packages of a disabled or unreachable remote", async () => {
		await update();

		indexer.remotes = [remote("remote1", { disabled: true })];
		const disabled = await update();
		expect(disabled.changed).to.equal(false);
		expect(disabled.failures).to.deep.equal([]);

		indexer.remotes = [remote("remote1")];
		indexer.refs = { remote1: { error: "unreachable", auth: false } };
		const unreachable = await update();
		expect(unreachable.changed).to.equal(false);
		expect(unreachable.failures).to.deep.equal([
			{ remote: "remote1", error: "unreachable", auth: false }
		]);

		expect(await ids()).to.deep.equal(["remote1:package1/1.0.0"]);
	});

	it("drops the packages of a remote that rejects authentication", async () => {
		await update();
		const error = "Authentication error on remote 'remote1'";
		indexer.refs = { remote1: { error, auth: true } };

		const changes = await update();

		expect(changes.failures).to.deep.equal([
			{ remote: "remote1", error, auth: true }
		]);
		expect(await ids()).to.deep.equal([]);
	});

	it("indexes the other remotes when one cannot be fetched", async () => {
		indexer.remotes = [remote("remote1"), remote("remote2")];
		indexer.refs = {
			remote1: ["package1/1.0.0"],
			remote2: ["package2/1.0.0"]
		};
		indexer.failing.add("remote2");

		const changes = await manager.check();
		const { failures } = await manager.apply(changes);

		expect(failures.map((f) => f.remote)).to.deep.equal(["remote2"]);
		expect(await ids()).to.deep.equal(["remote1:package1/1.0.0"]);

		indexer.failing.clear();
		await update();
		expect(await ids()).to.deep.equal([
			"remote1:package1/1.0.0",
			"remote2:package2/1.0.0"
		]);
	});

	it("skips a broken recipe and indexes the rest of the remote", async () => {
		indexer.refs = {
			remote1: ["package1/1.0.0", "package2/1.0.0"]
		};
		indexer.broken.add("package2/1.0.0");

		const changes = await manager.check();
		const { failures } = await manager.apply(changes);

		expect(failures.map((f) => f.remote)).to.deep.equal(["remote1"]);
		expect(await ids()).to.deep.equal(["remote1:package1/1.0.0"]);

		indexer.broken.clear();
		indexer.fetched = [];
		await update();
		expect(indexer.fetched).to.deep.equal(["package2/1.0.0"]);
	});

	it("drops the packages of a removed remote", async () => {
		await update();

		indexer.remotes = [];
		await update();

		expect(await ids()).to.deep.equal([]);
	});

	describe("fetching in chunks", () => {
		const versions = (count: number) =>
			Array.from({ length: count }, (_, i) => `package${i}/1.0.0`);

		beforeEach(() => {
			indexer.refs = { remote1: versions(25) };
		});

		it("fetches a few packages per call and reports progress", async () => {
			const progress: number[] = [];

			await manager.apply(await manager.check(), {
				onProgress: (_remote, done, total) => {
					expect(total).to.equal(25);
					progress.push(done);
				}
			});

			expect(indexer.callSizes).to.deep.equal([5, 5, 5, 5, 5]);
			expect(progress).to.deep.equal([0, 5, 10, 15, 20, 25]);
			expect(await ids()).to.have.length(25);
		});

		it("stops between chunks when cancelled and keeps what was fetched", async () => {
			const controller = new AbortController();

			const result = await manager.apply(await manager.check(), {
				signal: controller.signal,
				// Cancelled once the first chunk is done
				onProgress: (_remote, done) => {
					if (done > 0) {
						controller.abort();
					}
				}
			});

			expect(result.cancelled).to.deep.equal(["remote1"]);
			expect(indexer.callSizes).to.deep.equal([5]);
			expect(await ids()).to.have.length(5);

			// The next run fetches only what is left
			indexer.fetched = [];
			await update();
			expect(indexer.fetched).to.have.length(20);
			expect(await ids()).to.have.length(25);
		});
	});
});

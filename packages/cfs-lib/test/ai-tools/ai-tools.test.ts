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

import AIToolsPlugin, {
	type AiToolsData
} from "../../src/ai-tools/ai-tools.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { type AiBackend, type CfsSocDataModel } from "cfs-types";
import type {
	CfsInstalledPackage,
	CfsPackageManagerProvider
} from "cfs-package-manager";
import fs from "node:fs/promises";
import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { type SinonStub, stub } from "sinon";

chai.use(chaiAsPromised);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("AIToolsPlugin", () => {
	let plugin: AIToolsPlugin;
	let dataModel: CfsSocDataModel;

	before(async () => {
		const dataModelFile = await fs.readFile(
			path.resolve(
				__dirname,
				"../fixtures/data-models/max32690-tqfn.json"
			),
			"utf-8"
		);
		dataModel = JSON.parse(dataModelFile) as CfsSocDataModel;
	});

	beforeEach(() => {
		plugin = new AIToolsPlugin("/dummy/path", "2.3.0");
	});

	describe("getAIDataFromSOCModel", () => {
		it("GIVEN uppercase coreId WHEN the canonical core uses mixed case THEN preserve canonical casing", () => {
			const mixedCaseDataModel = structuredClone(dataModel);
			mixedCaseDataModel.Cores[0].Id = "mIxEd";

			const result = plugin.getAIDataFromSOCModel(
				mixedCaseDataModel,
				"MAX32690",
				"TQFN",
				"MIXED"
			);

			expect(result.Target.Core).to.equal("mIxEd");
		});

		it("GIVEN invalid coreId WHEN getAIDataFromSOCModel THEN error", () => {
			expect(() =>
				plugin.getAIDataFromSOCModel(
					dataModel,
					"MAX32690",
					"TQFN",
					"CM7"
				)
			).to.throw("Core 'CM7' is not found for 'MAX32690'");
		});
	});

	describe("readBackendJson", () => {
		let tmpDir: string;
		let sdkPath: string;
		let pkgPath: string;
		let warnStub: SinonStub;
		let errorStub: SinonStub;

		const makeTarget = (
			soc: string,
			core: string
		): AiBackend["Targets"][number] => ({
			Hardware: { Soc: soc, Core: core, Family: "MAX" },
			FirmwarePlatform: null
		});

		const makeBackend = (
			name: string,
			targets: AiBackend["Targets"],
			overrides: Partial<AiBackend> = {}
		): AiBackend => ({
			Name: name,
			Description: `${name} description`,
			AdvancedTools: false,
			Formats: ["tflite"],
			Package: name,
			Module: name,
			MaxModels: 1,
			Targets: targets,
			...overrides
		});

		const writeBackendFile = async (
			dir: string,
			fileName: string,
			data: Partial<AiToolsData>
		) => {
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(
				path.join(dir, fileName),
				JSON.stringify(data),
				"utf-8"
			);
		};

		const fakePkgMgr = (packagePaths: string[]) =>
			({
				getInstalledPackageInfo: () =>
					Promise.resolve(
						packagePaths.map(
							(p) =>
								({
									name: path.basename(p),
									path: p,
									version: "1.0.0",
									type: "sdk"
								}) as CfsInstalledPackage
						)
					)
			}) as unknown as CfsPackageManagerProvider;

		beforeEach(async () => {
			tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "cfs-ai-tools-test-")
			);
			sdkPath = path.join(tmpDir, "sdk", "cfsai");
			pkgPath = path.join(tmpDir, "pkg");
			warnStub = stub(console, "warn");
			errorStub = stub(console, "error");
		});

		afterEach(async () => {
			warnStub.restore();
			errorStub.restore();
			await fs.rm(tmpDir, { recursive: true, force: true });
		});

		it("GIVEN backend files in the cfsai path WHEN readBackendJson THEN return their combined content", async () => {
			await writeBackendFile(
				path.join(sdkPath, "backends"),
				"a.json",
				{
					properties: { model: [] },
					SupportedBackends: {
						a: makeBackend("a", [makeTarget("MAX32690", "CM4")])
					}
				}
			);
			await writeBackendFile(
				path.join(sdkPath, "backends"),
				"b.json",
				{
					properties: {},
					SupportedBackends: {
						b: makeBackend("b", [makeTarget("MAX78002", "CM4")])
					}
				}
			);

			const result = await new AIToolsPlugin(
				sdkPath,
				"2.3.0"
			).readBackendJson();

			expect(result?.SupportedBackends).to.have.all.keys("a", "b");
			expect(result?.properties).to.have.key("model");
			expect(warnStub.called).to.be.false;
		});

		it("GIVEN backend files in installed packages WHEN readBackendJson THEN include them", async () => {
			await writeBackendFile(
				path.join(pkgPath, "nested", "cfsai", "backends"),
				"pkg.json",
				{
					properties: {},
					SupportedBackends: {
						pkg: makeBackend("pkg", [makeTarget("MAX32690", "CM4")])
					}
				}
			);

			const result = await new AIToolsPlugin(
				sdkPath,
				"2.3.0",
				fakePkgMgr([pkgPath])
			).readBackendJson();

			expect(result?.SupportedBackends).to.have.key("pkg");
		});

		it("GIVEN no backend files WHEN readBackendJson THEN return undefined", async () => {
			const result = await new AIToolsPlugin(
				sdkPath,
				"2.3.0"
			).readBackendJson();

			expect(result).to.be.undefined;
			expect(errorStub.calledOnce).to.be.true;
		});

		it("GIVEN an invalid JSON backend file WHEN readBackendJson THEN reject", async () => {
			await fs.mkdir(path.join(sdkPath, "backends"), {
				recursive: true
			});
			await fs.writeFile(
				path.join(sdkPath, "backends", "broken.json"),
				"{ not json",
				"utf-8"
			);

			await expect(
				new AIToolsPlugin(sdkPath, "2.3.0").readBackendJson()
			).to.be.rejectedWith("Failed to parse JSON file");
		});

		it("GIVEN a duplicate backend key WHEN readBackendJson THEN the first (sdk) read takes precedence and targets are merged without duplicates", async () => {
			const sharedTarget = makeTarget("MAX32690", "CM4");
			const sdkOnlyTarget = makeTarget("MAX78002", "CM4");
			const pkgOnlyTarget = makeTarget("MAX32657", "CM33");

			await writeBackendFile(
				path.join(sdkPath, "backends"),
				"tflm.json",
				{
					properties: {},
					SupportedBackends: {
						tflm: makeBackend("tflm", [sharedTarget, sdkOnlyTarget], {
							Description: "from sdk",
							MaxModels: 1
						})
					}
				}
			);
			await writeBackendFile(
				path.join(pkgPath, "cfsai", "backends"),
				"tflm.json",
				{
					properties: {},
					SupportedBackends: {
						tflm: makeBackend(
							"tflm",
							[
								// Same content, different key order
								{
									FirmwarePlatform: null,
									Hardware: {
										Family: "MAX",
										Core: "CM4",
										Soc: "MAX32690"
									}
								},
								pkgOnlyTarget
							],
							{ Description: "from package", MaxModels: 4 }
						)
					}
				}
			);

			const result = await new AIToolsPlugin(
				sdkPath,
				"2.3.0",
				fakePkgMgr([pkgPath])
			).readBackendJson();

			const tflm = result?.SupportedBackends.tflm;
			expect(tflm?.Description).to.equal("from sdk");
			expect(tflm?.MaxModels).to.equal(1);
			expect(tflm?.Targets).to.have.deep.members([
				sharedTarget,
				sdkOnlyTarget,
				pkgOnlyTarget
			]);
			expect(tflm?.Targets).to.have.lengthOf(3);
			expect(warnStub.called).to.be.false;
		});

		it("GIVEN backend data was read WHEN readBackendJson is called again THEN return the cached result", async () => {
			await writeBackendFile(
				path.join(sdkPath, "backends"),
				"a.json",
				{
					properties: {},
					SupportedBackends: {
						a: makeBackend("a", [makeTarget("MAX32690", "CM4")])
					}
				}
			);

			const plugin = new AIToolsPlugin(sdkPath, "2.3.0");
			const first = await plugin.readBackendJson();

			await fs.rm(path.join(sdkPath, "backends"), {
				recursive: true
			});

			expect(await plugin.readBackendJson()).to.equal(first);
		});
	});
});

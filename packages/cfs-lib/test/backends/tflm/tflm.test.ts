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
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import {
	generateTflm,
	generateTflmSharedHeader,
	type TflmDeferredHeaders
} from "../../../src/ai-tools/tflm/tflm.js";
import { hashFile } from "../../../src/utils/file-utils.js";
import { type AiCommandResult, type VerifiedConfig } from "cfs-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.resolve(
	__dirname,
	"../../../../../cfs-ai/tests/data/models"
);
const CUSTOM_OUT_DIR = "custom";

describe("generateTflm", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "cfs-tflm-test-")
		);
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("GIVEN valid hello_world_f32 model WHEN generateTflm THEN exit with 0", async () => {
		const config: VerifiedConfig = {
			name: "hello_world_f32",
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: {
				Model: path.join(MODEL_DIR, "hello_world_f32.tflite")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(0);
		expect(result.events).to.be.an("array");
		expect(
			result.events.some(
				(e) =>
					e.type === "FILE" &&
					e.message.includes("hello_world_f32.cpp")
			)
		).to.be.true;
		const normalize = (p: string) => p.replace(/\\/g, "/");
		expect(result.artifacts?.files).to.include.members(
			[
				path.join(tmpDir, "src", "adi_tflm", "hello_world_f32.cpp"),
				path.join(tmpDir, "src", "adi_tflm", "hello_world_f32.hpp"),
				path.join(tmpDir, "src", "adi_tflm", "adi_tflm.hpp")
			].map(normalize)
		);

		const expectedHash = await hashFile(config.files.Model);
		const hppContent = await fs.readFile(
			path.join(tmpDir, "src", "adi_tflm", "hello_world_f32.hpp"),
			"utf8"
		);
		const cppContent = await fs.readFile(
			path.join(tmpDir, "src", "adi_tflm", "hello_world_f32.cpp"),
			"utf8"
		);
		expect(cppContent).to.include(
			"alignas(16) unsigned char hello_world_f32_arena[HELLO_WORLD_F32_ARENA_SIZE];"
		);
		expect(hppContent).to.include(
			`${config.files.Model} (sha256: ${expectedHash})`
		);
	});

	it("GIVEN valid hello_world_f32 with custom out_dir model WHEN generateTflm THEN exit with 0", async () => {
		const config: VerifiedConfig = {
			name: "hello_world_f32",
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: CUSTOM_OUT_DIR
			},
			files: {
				Model: path.join(MODEL_DIR, "hello_world_f32.tflite")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(0);
		expect(result.events).to.be.an("array");
		expect(
			result.events.some(
				(e) =>
					e.type === "FILE" &&
					e.message.includes("hello_world_f32.cpp")
			)
		).to.be.true;
		const normalize = (p: string) => p.replace(/\\/g, "/");
		expect(result.artifacts?.files).to.include.members(
			[
				path.join(tmpDir, CUSTOM_OUT_DIR, "hello_world_f32.cpp"),
				path.join(tmpDir, CUSTOM_OUT_DIR, "hello_world_f32.hpp"),
				path.join(tmpDir, CUSTOM_OUT_DIR, "adi_tflm.hpp")
			].map(normalize)
		);
	});

	it("GIVEN absolute out_dir WHEN generateTflm THEN files are written directly to that path", async () => {
		const absOutDir = path.join(tmpDir, "absolute-output");
		const config: VerifiedConfig = {
			name: "hello_world_f32",
			prj_info: {
				name: ".",
				workspace: ".",
				out_dir: absOutDir
			},
			files: {
				Model: path.join(MODEL_DIR, "hello_world_f32.tflite")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(0);
		const normalize = (p: string) => p.replace(/\\/g, "/");
		expect(result.artifacts?.files).to.include.members(
			[
				path.join(absOutDir, "hello_world_f32.cpp"),
				path.join(absOutDir, "hello_world_f32.hpp"),
				path.join(absOutDir, "adi_tflm.hpp")
			].map(normalize)
		);
	});

	it("GIVEN valid resnet model WHEN generateTflm THEN exit with 0", async () => {
		const config: VerifiedConfig = {
			name: "resnet",
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: {
				Model: path.join(MODEL_DIR, "resnet.tflite")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(0);
		expect(
			result.events.some(
				(e) => e.type === "FILE" && e.message.includes("resnet")
			)
		).to.be.true;
		const normalize = (p: string) => p.replace(/\\/g, "/");
		expect(result.artifacts?.files).to.include.members(
			[
				path.join(tmpDir, "src", "adi_tflm", "resnet.cpp"),
				path.join(tmpDir, "src", "adi_tflm", "resnet.hpp"),
				path.join(tmpDir, "src", "adi_tflm", "adi_tflm.hpp")
			].map(normalize)
		);

		const expectedHash = await hashFile(config.files.Model);
		const hppContent = await fs.readFile(
			path.join(tmpDir, "src", "adi_tflm", "resnet.hpp"),
			"utf8"
		);
		expect(hppContent).to.include(
			`${config.files.Model} (sha256: ${expectedHash})`
		);
	});

	it("GIVEN corrupt model WHEN generateTflm THEN exit with 1", async () => {
		const config: VerifiedConfig = {
			name: "corrupt",
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: {
				Model: path.join(MODEL_DIR, "corrupt.tflite")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(1);
		expect(
			result.events.some(
				(e) =>
					e.type === "ERROR" &&
					e.message.includes("not a valid TFLite file")
			)
		).to.be.true;
		expect(result.artifacts?.files ?? []).to.be.empty;
	});

	it("GIVEN invalid tflite model WHEN generateTflm THEN exit with 1", async () => {
		const config: VerifiedConfig = {
			name: "invalid",
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: {
				Model: path.join(MODEL_DIR, "ai85-catsdogs-qat8-q.pth.tar")
			},
			target: {
				Soc: "MAX32690",
				Core: "CM4"
			},
			backend: {
				Name: "tflm",
				Extensions: {}
			}
		};

		const result = await generateTflm([config]);

		expect(result.code).to.equal(1);
		expect(
			result.events.some(
				(e) =>
					e.type === "ERROR" &&
					e.message.includes("not a valid TFLite file")
			)
		).to.be.true;
		expect(result.artifacts?.files ?? []).to.be.empty;
	});

	it("GIVEN two models sharing an out_dir WHEN generateTflm THEN adi_tflm.hpp includes both", async () => {
		const makeConfig = (
			name: string,
			model: string
		): VerifiedConfig => ({
			name,
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: { Model: path.join(MODEL_DIR, model) },
			target: { Soc: "MAX32690", Core: "CM4" },
			backend: { Name: "tflm", Extensions: {} }
		});

		const result = await generateTflm(
			[
				makeConfig("hello_world_f32", "hello_world_f32.tflite"),
				makeConfig("hello_world_int8", "hello_world_int8.tflite")
			],
			[
				{ additionalSummary: "summary for f32" },
				{ additionalSummary: "summary for int8" }
			]
		);

		expect(result.code).to.equal(0);

		const outDir = path.join(tmpDir, "src", "adi_tflm");
		const topLevel = await fs.readFile(
			path.join(outDir, "adi_tflm.hpp"),
			"utf8"
		);
		expect(topLevel).to.include('#include "hello_world_f32.hpp"');
		expect(topLevel).to.include('#include "hello_world_int8.hpp"');

		const f32Hpp = await fs.readFile(
			path.join(outDir, "hello_world_f32.hpp"),
			"utf8"
		);
		const int8Hpp = await fs.readFile(
			path.join(outDir, "hello_world_int8.hpp"),
			"utf8"
		);
		expect(f32Hpp).to.include("summary for f32");
		expect(f32Hpp).to.not.include("summary for int8");
		expect(int8Hpp).to.include("summary for int8");
	});

	it("GIVEN deferred headers across two generateTflm calls WHEN generateTflmSharedHeader THEN adi_tflm.hpp includes models from both", async () => {
		const makeConfig = (
			name: string,
			model: string
		): VerifiedConfig => ({
			name,
			prj_info: {
				name: ".",
				workspace: tmpDir,
				out_dir: "."
			},
			files: {
				Model: path.join(MODEL_DIR, model)
			},
			target: { Soc: "MAX32690", Core: "CM4" },
			backend: { Name: "tflm", Extensions: {} }
		});

		const deferred: TflmDeferredHeaders = {
			symbolsByDir: new Map(),
			reportDirByBuildDir: new Map()
		};

		const r1 = await generateTflm(
			[makeConfig("hello_world_f32", "hello_world_f32.tflite")],
			undefined,
			deferred
		);
		expect(r1.code).to.equal(0);

		const r2 = await generateTflm(
			[makeConfig("resnet", "resnet.tflite")],
			undefined,
			deferred
		);
		expect(r2.code).to.equal(0);

		const outDir = path.join(tmpDir, "src", "adi_tflm");

		expect(
			await fs
				.stat(path.join(outDir, "adi_tflm.hpp"))
				.catch(() => null)
		).to.be.null;

		const finalResult: AiCommandResult = {
			code: 0,
			validCodes: [0],
			events: [],
			artifacts: { files: [] as string[] }
		};
		await generateTflmSharedHeader(deferred, finalResult);

		const header = await fs.readFile(
			path.join(outDir, "adi_tflm.hpp"),
			"utf8"
		);
		expect(header).to.include('#include "hello_world_f32.hpp"');
		expect(header).to.include('#include "resnet.hpp"');
	});
});

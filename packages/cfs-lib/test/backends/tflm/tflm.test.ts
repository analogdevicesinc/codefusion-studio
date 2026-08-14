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

import { generateTflm } from "../../../src/ai-tools/tflm/tflm.js";
import { type VerifiedConfig } from "cfs-types";

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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
				Core: "CM4",
				Accelerator: undefined,
				Package: "ctbga",
				firmware_platform: "cfsai"
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
});

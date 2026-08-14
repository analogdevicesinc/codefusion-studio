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
import { FlatcRunner } from "flatc-wasm";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Note: cfsai-tflite schema is still required from the cfs-ai package (saves duplicating schema.fbs for now)
const SCHEMA_PATH = path.join(
	process.cwd(),
	"../../cfs-ai/packages/cfsai-tflite/schema.fbs"
);
const OUT_DIR = path.join(process.cwd(), "src/ai-tools/tflm/schema");

const flatc = await FlatcRunner.init();
const schema = readFileSync(SCHEMA_PATH, "utf8");

const files = flatc.generateCode(
	{ entry: "/schema.fbs", files: { "/schema.fbs": schema } },
	"ts"
);

mkdirSync(OUT_DIR, { recursive: true });

for (const [filename, content] of Object.entries(files)) {
	const filePath = path.resolve(OUT_DIR, filename);
	if (!filePath.startsWith(OUT_DIR + path.sep)) {
		throw new Error(
			`Generated file path escapes output directory: ${filename}`
		);
	}
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, content);
}

/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(
	__dirname,
	"src",
	"project-generation",
	"templates"
);
const destDir = path.join(
	process.cwd(),
	"out",
	"packages",
	"cfs-lib",
	"dist",
	"project-generation",
	"templates"
);

try {
	fs.copySync(sourceDir, destDir);
	console.log(
		`Templates from '${sourceDir}' copied successfully to '${destDir}'`
	);
} catch (err) {
	console.error("Error copying templates:", err);
}

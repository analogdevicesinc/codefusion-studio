/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

/**
 * This script creates a .cfsdatamodels file which contains metadata information
 * about the contained packages in the form:
 *
 *   .cfsdatamodels[<SoC>][<package>] = metadata
 *
 * That is, the entries follow a hierarchy where the first level is the SoC name
 * and the second level is the package. The values include schema version, data
 * model version, description and timestamp.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'socs');
const destDir = path.join(__dirname, '..', 'socs');
const destFile = path.join(destDir, '.cfsdatamodels');

function isAiSupported(datamodel) {
	const cores = datamodel["Cores"];

	if (cores) {
		return cores.some(c => 'Ai' in c);
	}
	return false;
}

// Function to scan data model files and generate index
function generateDataModelIndex() {
	const dataModelIndex = {};

	// Check if source directory exists
	if (!fs.existsSync(sourceDir)) {
		console.error(`Source directory does not exist: ${sourceDir}`);
		return;
	}

	// Read all files in the source directory
	const files = fs.readdirSync(sourceDir);

	files.forEach(file => {
		if (file.endsWith('.json')) {
			const filePath = path.join(sourceDir, file);

			try {
				const content = fs.readFileSync(filePath, 'utf8');
				const dataModel = JSON.parse(content);

				// Extract metadata from the data model
				const { Name, Version, Schema, Timestamp, Description, Parts } = dataModel;

				if (Name && Version && Schema && Parts && Parts.length > 0) {
					// Initialize the SoC entry if it doesn't exist
					if (!dataModelIndex[Name]) {
						dataModelIndex[Name] = {};
					}

					// Process each part (package) in the data model
					Parts.forEach(part => {
						const packageName = part.Package;
						if (packageName) {
							dataModelIndex[Name][packageName] = {
								version: Version,
								schema: Schema,
								timestamp: Timestamp,
								description: Description,
								path: file,
								ai: isAiSupported(dataModel)
							};
						}
					});
				} else {
					console.warn(`Skipping file ${file}: Missing required fields`);
				}
			} catch (error) {
				console.error(`Error processing file ${file}:`, error.message);
			}
		}
	});

	return dataModelIndex;
}

// Generate the index
const dataModelIndex = generateDataModelIndex();

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
	throw new Error(`Error writing data model index: Destination directory does not exist: ${destDir}`);
}

// Write the data model index file
fs.writeFileSync(destFile, JSON.stringify(dataModelIndex, null, '\t'));

console.log(`Generated data model index file: ${destFile}`);

// Log summary of what was found
Object.keys(dataModelIndex).forEach(soc => {
	const packages = Object.keys(dataModelIndex[soc]);
	console.log(`  ${soc}: ${packages.join(', ')}`);
});


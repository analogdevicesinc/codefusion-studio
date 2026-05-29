
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

/**
 * AI-Generated script: Validates JSON data model files against a datamodel-schema.json.
 *
 * This script loads data model JSON schema and validates target JSON files against it using AJV.
 * Supports glob patterns for matching multiple files.
 * Usage: node validate-datamodel.js <path-or-pattern> [<path-or-pattern> ...]
 *
 * @example
 * // Validate a single data model file
 * node validate-datamodel.js ./path/to/datamodel.json
 *
 * // Validate multiple data model files
 * node validate-datamodel.js ./socs/file1.json ./socs/file2.json ./socs/file3.json
 *
 * // Validate using glob patterns
 * node validate-datamodel.js "./socs/*.json"
 * node validate-datamodel.js "./socs/max3265*.json" "./socs/max3266*.json"
 *
 * @exitcode 0 - All validations successful
 * @exitcode 1 - One or more validations failed or error occurred
 */


// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the schema
const schemaPath = path.join(__dirname, '../socs/datamodel-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Initialize AJV validator for JSON Schema 2020-12
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// Compile the schema
const validate = ajv.compile(schema);

// Get the patterns/paths from command line arguments
const patterns = process.argv.slice(2);

if (patterns.length === 0) {
	console.error('Usage: node validate-datamodel.js <path-or-pattern> [<path-or-pattern> ...]');
	process.exit(1);
}

// Expand glob patterns to file paths
const jsonFilePaths = [];
for (const pattern of patterns) {
	const matches = globSync(pattern, { nodir: true });
	if (matches.length === 0) {
		// If no glob matches, treat as literal path (might not exist, will be handled later)
		jsonFilePaths.push(pattern);
	} else {
		jsonFilePaths.push(...matches);
	}
}

// Remove duplicates
const uniqueFilePaths = [...new Set(jsonFilePaths)];

if (uniqueFilePaths.length === 0) {
	console.error('Error: No files found matching the provided patterns');
	process.exit(1);
}

// Track validation results
let totalFiles = 0;
let successfulFiles = 0;
let failedFiles = 0;
const results = [];

// Validate each file
for (const jsonFilePath of uniqueFilePaths) {
	totalFiles++;

	// Check if file exists
	if (!fs.existsSync(jsonFilePath)) {
		console.error(`✗ Error: File not found: ${jsonFilePath}\n`);
		results.push({ file: jsonFilePath, success: false, error: 'File not found' });
		failedFiles++;
		continue;
	}

	// Load and validate the JSON file
	try {
		const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
		const valid = validate(jsonData);

		if (valid) {
			console.log(`✓ Validation successful: ${jsonFilePath}`);
			results.push({ file: jsonFilePath, success: true });
			successfulFiles++;
		} else {
			console.error(`✗ Validation failed: ${jsonFilePath}`);
			console.error('  Errors:');
			validate.errors.forEach((error, index) => {
				console.error(`    ${index + 1}. ${error.instancePath || '/'}: ${error.message}`);
				if (error.params) {
					console.error(`       Details: ${JSON.stringify(error.params)}`);
				}
			});
			console.error(''); // Empty line for readability
			results.push({ file: jsonFilePath, success: false, errors: validate.errors });
			failedFiles++;
		}
	} catch (error) {
		console.error(`✗ Error reading or parsing JSON file: ${jsonFilePath}`);
		console.error(`  ${error.message}\n`);
		results.push({ file: jsonFilePath, success: false, error: error.message });
		failedFiles++;
	}
}

// Print summary
console.log('='.repeat(60));
console.log('Validation Summary:');
console.log(`  Total files: ${totalFiles}`);
console.log(`  Successful: ${successfulFiles}`);
console.log(`  Failed: ${failedFiles}`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(failedFiles > 0 ? 1 : 0);

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
import alasql from "alasql";
import { Buffer } from "node:buffer";
import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { CallGraph } from "./CallGraph.js";
import * as Enums from "./enums.js";
import { ElfDataModel } from "./ElfDataModel.js";
import { SYMBOLS_TABLE_ID } from "./constants/symbols.js";
import { DataResult } from "./enums.js";

// Create a list of write operations
const writeOperations = [
	"INSERT",
	"UPDATE",
	"DELETE",
	"DROP",
	"CREATE",
	"ALTER",
];

// Function to check if a query is a write operation
function isWriteOperation(query: string): boolean {
	return writeOperations.some((op) =>
		query.trim().toUpperCase().startsWith(op),
	);
}

// Store the original exec method
const originalExec = alasql.Database.prototype.exec;

// Override the exec method to make the database read-only
function applyReadOnlyMode(database: any) {
	if (database === undefined) {
		throw new Error("Database is undefined");
	}
	database.exec = function (query: string, params?: any): any {
		if (isWriteOperation(query)) {
			throw new Error(
				"Database is read-only. Write operations are not allowed.",
			);
		}
		return originalExec.call(this, query, params);
	};
}

// Function to temporarily disable read-only mode
function disableReadOnlyMode(database: any) {
	if (database === undefined) {
		throw new Error("Database is undefined");
	}
	database.exec = originalExec;
}

// ElfFileParser is responsible for parsing ELF files and extracting relevant data.
export class ElfFileParser {
	// The path to the ELF file.
	private path: string;
	// The parsed ELF data model.
	private model?: ElfDataModel;
	// The ELF reader used by the ElfFileParser.
	private elfReader: ElfReader;
	// Indicates whether debug mode is enabled.
	private debug = false;
	// The database instance used for executing SQL queries.
	private database: any;
	// The number of .su files found during parsing.
	private _numberOfSuFiles = 0;

	// Getter for the number of .su files
	public get numberOfSuFiles(): number {
		return this._numberOfSuFiles;
	}

	// Constructor initializes the parser with a file path.
	constructor(filePath: string, debug = false) {
		if (!filePath) {
			throw new Error("Error initializing parser: No valid path provided");
		}
		this.path = filePath;
		this.debug = debug;
		this.elfReader = new ElfReader();
	}

	// Loads stack data (.su and .cgraph) data from files found in the same directory as the ELF file.
	private async loadStackData(rootDir: string): Promise<StackData> {
		const suFileList: string[] = [];
		const graphFileList: string[] = [];

		if (this.debug) {
			console.log(`DBG: SU: rootDir:` + rootDir);
		}

		const ret = new StackData();

		try {
			await this.elfReader.findStackFiles(rootDir, suFileList, graphFileList);
			this._numberOfSuFiles = suFileList.length;
			if (this._numberOfSuFiles > 0) {
				for (const file of suFileList) {
					const stackUsage = await this.elfReader.parseSuFile(file);

					// Find corresponding graph file
					const prefix: string = file.replace(/\.su$/g, ".");
					let graphFile: string = null;
					//console.log(`DBG: SU: prefix: "${prefix}"`);
					for (const g of graphFileList) {
						if (g.startsWith(prefix) && g.endsWith(".cgraph")) {
							//console.log(`DBG: GRAPH: "${g}" corresponds to "${file}"`);
							graphFile = g;
							break;
						}
					}
					if (graphFile != null) {
						const graph = await CallGraph.parseGraphFile(graphFile, this.debug);
						graph.compute(stackUsage);
						ret.graphs.push(graph);
					} else {
						console.warn(`GRAPH: Could not find graph file for ${file}`);
					}

					ret.stackUsage.push(stackUsage);
				}
			}

			if (this.debug) {
				console.log(`DBG: SU: Found ${suFileList.length} su and ${graphFileList.length} graph files in "${rootDir}"`);
				let i = 0;
				for (const f of suFileList) {
					console.log(`DBG: SU: [${++i}/${suFileList.length}]: "${f}"`);
				}
				i = 0;
				for (const f of graphFileList) {
					console.log(`DBG: GRAPH: [${++i}]/${graphFileList.length}: "${f}"`);
				}
			}

			return ret;
		} catch (error) {
			console.error("Error loading stack files:", error);
			throw error;
		}
	}

	// Returns the loaded ELF data model, throwing an error if it's not yet loaded.
	public getDataModel(): ElfDataModel {
		if (this.model === undefined || this.model === null) {
			throw new Error(
				"ELF Data Model is not loaded. Please ensure 'initialize' method is successfully called before accessing the model.",
			);
		}

		return this.model;
	}

	// Loads the ELF file, parses it, and initializes the data model.
	public async initialize(noDb = false, debug = false): Promise<DataResult> {
		this.debug = debug;

		// Check if the path is valid
		if (!this.path) return DataResult.INVALID;

		try {
			// Read the content of the ELF file
			const dataBuffer = await this.elfReader.readFile(this.path);

			const MIN_BUFFER_LENGTH = 52;
			// Check if the buffer length is sufficient
			if (dataBuffer.byteLength < MIN_BUFFER_LENGTH) return DataResult.INVALID;

			// Load .stack data from files found in the same directory as the ELF file
			let rootDir =  path.dirname(this.path);
			// Workaround for zephyr where the .su and .cgraph files are in both ../CMakeFiles and ../zephyr
			// So we will search in th parent folder
			const idx = rootDir.lastIndexOf("zephyr");
			if (idx !== -1) {
				const newRootDir = rootDir.substring(0, idx);
				if (this.debug) {
					console.log(`DBG: SU: zephyr: search stack files in "${newRootDir}". oldRootDir:"${rootDir}" ...`);
				}
				rootDir = newRootDir;
			}
			const stackData = await this.loadStackData(rootDir);

			// Init db
			this.database = new alasql.Database();

			// Create an instance of the ElfDataModel. Required to have a valid database instance.
			this.model = new ElfDataModel(dataBuffer, this.debug, this.database);

			// Load the ELF data model with the .su data
			const result = this.model.load(stackData, noDb);
			if (result !== Enums.DataResult.OK)
				throw new Error(
					"Failed to open ELF file " +
						this.path +
						". result:" +
						Enums.DataResult[result],
				);

			// Apply read-only mode for the database
			applyReadOnlyMode(this.database);

			return result;
		} catch (error) {
			if (error instanceof Error) {
				console.error(
					"An error occurred while getting the ELF Data Model:",
					error.message,
				);
			}
			throw error;
		}
	}

	// Executes a SQL query against the loaded data using alasql.
	public query(query: string, param?: unknown) {
		try {
			return param
				? this.database.exec(query, param)
				: this.database.exec(query);
		} catch (error) {
			throw new Error(error as string);
		}
	}

	// Drops the symbols table from the database.
	public async dropSymbolsTable(): Promise<void> {
		disableReadOnlyMode(this.database);
		try {
			this.database.exec(`DROP TABLE ${SYMBOLS_TABLE_ID}`);
		} catch (error) {
			throw new Error(error as string);
		} finally {
			applyReadOnlyMode(this.database);
		}
	}
}

// ElfReader is a utility class for reading and processing ELF files.
class ElfReader {
	// Reads the content of a file and returns it as an ArrayBuffer.
	public async readFile(filePath: string): Promise<ArrayBuffer> {
		try {
			const buf: Buffer = await fs.readFile(filePath);
			return buf.buffer;
		} catch (error) {
			console.error("Error reading file:", error);
			throw new Error(error.message);
		}
	}

	// Recursively searches for .su files in a directory and its subdirectories.
	public async findStackFiles(
		rootDir: string,
		suFileList: string[],
		graphFileList: string[],
	): Promise<void> {
		try {
			const files = await fs.readdir(rootDir);
			for (const f of files) {
				const dirPath = path.join(rootDir, f);
				if (statSync(dirPath).isDirectory()) {
					await this.findStackFiles(dirPath, suFileList, graphFileList);
				} else if (f.endsWith(".su")) {
					suFileList.push(dirPath);
				} else if (f.endsWith(".cgraph")) {
					graphFileList.push(dirPath);
				}
			}
		} catch (error) {
			console.error("Error finding stack files:", error);
			throw error;
		}
	}

	// Parses .su file to extract function names and their stack sizes, returning a map of function names to stack sizes.
	public async parseSuFile(file: string): Promise<Map<string, StackUsageData>> {
		const result = new Map<string, StackUsageData>();
		try {
			const fileContent = await fs.readFile(file, "utf-8");
			const lines = fileContent.split("\n");

			for (const line of lines) {
				const [funcName, stackSize, type] = line
					.split("\t")
					.map((data) => data.trim());
				if (funcName && stackSize && type == "static") {
					// only static types
					let lastIdx = funcName.lastIndexOf('/');
					if (lastIdx === -1)
						lastIdx = funcName.lastIndexOf('\\');
					const startPos = lastIdx === -1 ? 0 : lastIdx + 1;

					const splits = funcName.substring(startPos).split(":", 3);
					if (startPos > 0) {
						splits[0] = funcName.substring(0, startPos) + splits[0];
					}
					const sourceAndPosition = splits.join(":"); // path + line + column
					const path = splits[0];
					const func = funcName.substring(sourceAndPosition.length + 1);
					//console.log(`sourceAndPosition: "${sourceAndPosition}" line:${funcName} path:"${path}" func:"${func}"`);
					const stack = Number(stackSize);
					if (!isNaN(stack)) {
						const found = result.get(func);
						const val = found === undefined ? new StackUsageData() : found;

						// Buggy .su file containing duplicates
						if (found !== undefined) {
							if (val.stack != stack) {
								// warn only if stack is different
								console.warn(
									`SU: duplicate symbol (same su file) "${func}"! file:${file}" oldStack:${val.stack} newStack:${stack}`,
								);
							}
							val.suDuplicates++;
						}
						val.stack = stack;
						val.type = type;
						val.path = path;
						if (found === undefined) {
							result.set(func, val);
						}
					}
					//console.log(`sourceAndPosition: "${sourceAndPosition}" func:"${func}" type:${type}`);
				}
			}
		} catch (error) {
			console.error(`Error reading file ${file}:`, error);
			// Optionally, handle the error as needed
		}
		return result;
	}
} // ElfReader

// info about .su entry
export class StackUsageData {
	stack: number; // local stack from .su file
	type: string; // type from .su file
	suDuplicates = 0; // in case of multiple demangled names
	path: string;
	mangledNames = new Array<string>(); // Could have multiple demangled names!
}

// all stack stats for all source files
export class StackData {
	public stackUsage = new Array<Map<string, StackUsageData>>(); // from .su. Keys are demangled
	public graphs = new Array<CallGraph>(); // from .cgraph. One array item corresponds to a single source file
}


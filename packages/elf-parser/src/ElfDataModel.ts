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
import { CALLERS_TABLE_ID } from "./constants/constants.js";
import { SYMBOLS_TABLE_ID } from "./constants/symbols.js";
import { ElfArmAttributes } from "./ElfArmAttributes.js";
import { ElfDemangler } from "./ElfDemangler.js";
import * as Enums from "./enums.js";
import { ElfFileData } from "./ElfFileData.js";
import { ElfProgramHeader } from "./ElfProgramHeader.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";
import { ElfSymbol, ElfSymbolData } from "./ElfSymbol.js";
import { ElfHeader } from "./ElfHeader.js";
import { ElfHeuristics } from "./ElfHeuristics.js";
import { Helper } from "./Helper.js";
import { Dwarf } from "./Dwarf.js";
import { StackData, StackUsageData } from "./ElfFileParser.js";
import { ElfCommentParser } from "./ElfCommentParser.js";

/**
 * ELF Data Model
 * Represents the model for an ELF file, including its headers, program headers, section headers, symbols, and arm attributes.
 */
export class ElfDataModel {
	/**
	 * Represents the access to the ELF file data.
	 */
	public elfFileAccess: ElfFileData;

	/**
	 * Represents the ELF header of the file.
	 */
	public elfHeader: ElfHeader;

	/**
	 * Represents an array of ELF program headers.
	 */
	public elfProgramHeaders: ElfProgramHeader[] = [];

	/**
	 * Represents an array of ELF section headers.
	 */
	public elfSectionHeaders: ElfSectionHeader[] = [];

	/**
	 * Represents an array of ELF symbols.
	 */
	public elfSymbols: ElfSymbol[] = [];

	/**
	 * Represents the ARM attributes of the ELF file.
	 */
	public elfArmAttributes: ElfArmAttributes;

	/**
	 * Indicates whether the SU file is present or not.
	 * localstack DB columns are filled
	 */
	public isSuFilePresent = false;

	/**
	 * Indicates whether the cgraph file is present or not.
	 * recursive, stack, stackdepth fields are filled
	 */
	public isGraphFilePresent = false;

	/**
	 * Dwarf debug information
	 */
	public dw: Dwarf.Dwarf = null;

	/**
	 * Represents the heuristics for the ELF data model.
	 */
	public heuristics = new ElfHeuristics();

	// Information about available db columns / tables
	public isLocalStackColumnAvailable(): boolean {
		return this.isSuFilePresent;
	}
	public isRecursiveColumnAvailable(): boolean {
		return this.isGraphFilePresent;
	}
	public isGraphStackColumnAvailable(): boolean {
		return this.isGraphFilePresent;
	}
	public isStackDepthColumnAvailable(): boolean {
		return this.isGraphFilePresent;
	}
	public isCallersTableAvailable(): boolean {
		return this.isGraphFilePresent;
	}
	public isPathColumnAvailable(): boolean {
		return !!this.dw;
	}

	/**
	 * Gets the number of symbols in the ElfDataModel.
	 *
	 * @returns The number of symbols.
	 */
	public get numberOfSymbols(): number {
		return this._numberOfSymbols;
	}

	/**
	 * Represents a helper object.
	 */
	private helper: Helper;

	/**
	 * Indicates whether debug mode is enabled or not.
	 */
	private debug = false;

	/**
	 * Represents the database object for storing data.
	 */
	private database: any;

	/**
	 * The number of symbols in the ELF data model.
	 */
	private _numberOfSymbols = 0;

	private demangler = new ElfDemangler();

	constructor(fileBytes: ArrayBuffer, debug = false, database: any) {
		if (fileBytes.byteLength === 0) {
			throw new Error("Invalid file buffer");
		}
		this.elfFileAccess = new ElfFileData(fileBytes);
		this.helper = new Helper();
		this.debug = debug;
		this.heuristics.debug = debug;
		if (database === undefined) {
			throw new Error("Database is undefined");
		}
		this.database = database;
	}
	/**
	 * Loads the ELF program header tables.
	 * @returns The result of the data loading operation.
	 */
	private loadProgramHeaderTables(): Enums.DataResult {
		for (
			let headerIndex = 0;
			headerIndex < this.elfHeader.programHeaderEntryCount;
			headerIndex++
		) {
			this.elfProgramHeaders.push(
				new ElfProgramHeader(this, headerIndex, this.elfFileAccess),
			);
			this.elfProgramHeaders[headerIndex].load(
				Number(BigInt.asUintN(32, this.elfHeader.programHeaderOffset)) +
					headerIndex * this.elfHeader.programHeaderEntrySize,
				this.elfHeader,
			);
		}

		return Enums.DataResult.OK;
	}

	/**
	 * Loads the ELF section header tables.
	 * @returns The result of the data loading operation.
	 */
	private loadSectionHeaderTables(): Enums.DataResult {
		for (
			let headerIndex = 0;
			headerIndex < this.elfHeader.sectionHeaderEntryCount;
			headerIndex++
		) {
			this.elfSectionHeaders.push(
				new ElfSectionHeader(headerIndex, this.elfFileAccess, this),
			);
			this.elfSectionHeaders[headerIndex].load(
				Number(BigInt.asUintN(32, this.elfHeader.sectionHeaderOffset)) +
					headerIndex * this.elfHeader.sectionHeaderEntrySize,
			);
			for (
				let segmentIndex = 0;
				segmentIndex < this.elfHeader.programHeaderEntryCount;
				segmentIndex++
			) {
				if (this.elfSectionHeaders[headerIndex].flags != undefined) {
					if (
						this.helper.isSectionInSegment(
							this.elfSectionHeaders[headerIndex],
							this.elfProgramHeaders[segmentIndex],
						)
					) {
						this.elfProgramHeaders[segmentIndex].sectionIndexList.push(
							headerIndex,
						);
					}
				}
			}
		}

		//console.log(
		//	`Loaded ${this.elfSectionHeaders.length} section headers. Section entry count: ${this.elfHeader.sectionHeaderEntryCount}`,
		//);

		for (const section of this.elfSectionHeaders) {
			section.cacheShNameString();
		}

		return Enums.DataResult.OK;
	}

	/**
	 * Loads symbol tables from the ELF file and populates the symbols table.
	 * @returns The result of loading the symbol tables.
	 */
	private loadSymbolTables(): Enums.DataResult {
		for (
			let secIdx = 0;
			secIdx < this.getNumOfSectionHeaderTables();
			secIdx++
		) {
			if (
				this.elfSectionHeaders[secIdx].type == Enums.sh_type.SHT_SYMTAB ||
				this.elfSectionHeaders[secIdx].type == Enums.sh_type.SHT_DYNSYM
			) {
				const symTab: ElfSymbol = new ElfSymbol(
					this.elfSectionHeaders[secIdx],
					this,
				);

				symTab.load(this.debug);

				this.elfSymbols.push(symTab);
			}
		}

		//console.log(`Loaded ${this.elfSymbols.length} symbols`);

		return Enums.DataResult.OK;
	}

	private createDb() {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this.database) return Enums.DataResult.INVALID;

		try {
			// Create the symbols table if it doesn't exist
			//console.log("Creating symbols table ...");
			this.database.exec(
				`CREATE TABLE ${SYMBOLS_TABLE_ID} (id INT PRIMARY KEY AUTOINCREMENT, name STRING, demangled STRING, type STRING, address INT, section STRING, size INT` +
					`, localstack INT` +
					`, stack INT` +
					`, bind STRING, visibility STRING` +
					`, recursive INT` +
					`, path STRING` +
					`, stackdepth INT` +
					`)`,
			);

			// Create the callers/callee table if it doesn't exist
			//console.log("Creating callers table ...");
			this.database.exec(
				`CREATE TABLE ${CALLERS_TABLE_ID} (caller_id INT, callee_id INT, PRIMARY KEY(caller_id, callee_id), ` +
					`FOREIGN KEY (caller_id) REFERENCES ${SYMBOLS_TABLE_ID}(id), ` +
					`FOREIGN KEY (callee_id) REFERENCES ${SYMBOLS_TABLE_ID}(id)) `,
			);
		} catch (error) {
			console.error(`Error creating database! `, error);
			throw error;
		}

		return Enums.DataResult.OK;
	}

	private populateDb(): Enums.DataResult {
		if (this.elfSymbols.length == 0) return Enums.DataResult.OK;

		if (!this.database) {
			console.error(
				"Error populating the symbols table. nSymTables:" +
					this.elfSymbols.length,
			);
			return Enums.DataResult.INVALID;
		}

		this.database.tables[SYMBOLS_TABLE_ID].data = [];

		//console.log("Populating symbols table ...");
		this.elfSymbols.forEach((symTab: ElfSymbol) => {
			// Update the number of symbols in the ELF data model
			this._numberOfSymbols += symTab.symbolData.length;
			symTab.symbolData.forEach((symData) => {
				const values = [
					symData.nameStr, // name: The name of the symbol.
					symData.demangledName ? symData.demangledName : null, // name: The name of the symbol.
					Enums.sym_type[symData.infoType], // type: The type of the symbol.
					Number(symData.value), // address as number: The address of the symbol.
					symData.sectionNameStr, // section: The section to which the symbol belongs. Can be null!
					Number(symData.size), // size as number: The size of the symbol.
					Enums.sym_binding[symData.infoBinding], // bind: The binding of the symbol.
					Enums.sym_visibility[symData.otherVisibility], // visibility: The visibility of the symbol.
				];
				values.push(symData.stack); // stack: The stack information of the symbol (if available).
				values.push(symData.hasGraphStack ? symData.graphStack : null); // graphStack: Computed stack usage from .cgraph files
				values.push(
					symData.hasGraphStack &&
						symData.recursiveType !== Enums.FunctionRecursiveType.NoRecursion
						? symData.recursiveType.valueOf()
						: null,
				); // recursive: FunctionRecursiveType
				values.push(
					symData.path
						? symData.path +
								":" +
								symData.line +
								(symData.column ? ":" + symData.column : "")
						: "",
				);
				values.push(symData.maxDepth !== undefined ? symData.maxDepth : null);
				try {
					this.database.exec(
						`INSERT INTO ${SYMBOLS_TABLE_ID}(name` +
							", demangled" +
							", type" +
							", address" +
							", section" +
							", size" +
							", bind" +
							", visibility" +
							", localstack" +
							", stack" +
							", recursive" +
							", path" +
							", stackdepth" +
							") " +
							"VALUES (" +
							"  ?" + // name
							", ?" + // demangled
							", ?" + // type
							", ?" + // address
							", ?" + // section
							", ?" + // size
							", ?" + // bind
							", ?" + // visibility
							", ?" + // localStack
							", ?" + // graphStack
							", ?" + // recursiveType
							", ?" + // path
							", ?" + // depth
							")",
						values,
					);

					symData.dbId = this.database.autoval(SYMBOLS_TABLE_ID, "id");
					//console.log(`DB: dbId ${symData.dbId} for "${symData.nameStr}"`);
				} catch (error) {
					console.error(
						`Error inserting data into table for ${symData.nameStr}`,
						error,
					);
					throw error;
				}
			});
		});

		// Update callees table
		this.elfSymbols.forEach((symTab: ElfSymbol) => {
			symTab.symbolData.forEach((symData) => {
				for (const callee of symData.callees) {
					try {
						//console.log(`DB: callees: INSERT(${symData.dbId}, ${callee.dbId}) sym:"${symData.nameStr}" callee:"${callee.nameStr}"`);
						this.database.exec(
							`INSERT INTO ${CALLERS_TABLE_ID}(caller_id, callee_id)` +
								"VALUES (?, ?)",
							[symData.dbId, callee.dbId],
						);
					} catch (error) {
						console.error(
							`Error inserting data into ${CALLERS_TABLE_ID} table for ${symData.nameStr}`,
							error,
						);
						throw error;
					}
				}
			});
		});

		//console.log(this.database.exec(`SELECT * FROM ${CALLERS_TABLE_ID}`));

		return Enums.DataResult.OK;
	}

	/**
	 * Loads the ARM attributes from the ELF file.
	 *
	 * @returns The result of the data loading operation.
	 */
	private loadArmAttributes(): Enums.DataResult {
		for (
			let secIdx = 0;
			secIdx < this.getNumOfSectionHeaderTables();
			secIdx++
		) {
			if (
				this.elfSectionHeaders[secIdx].type == Enums.sh_type.SHT_ARM_ATTRIBUTES
			) {
				this.elfArmAttributes = this.helper.parseEabiSection(
					this.elfFileAccess,
					Number(this.elfSectionHeaders[secIdx].offset),
					Number(this.elfSectionHeaders[secIdx].size),
				);
			}
		}
		return Enums.DataResult.OK;
	}

	public getNumOfProgramHeaderTables(): number {
		return this.elfHeader.programHeaderEntryCount;
	}

	public getNumOfSectionHeaderTables(): number {
		return this.elfHeader.sectionHeaderEntryCount;
	}

	public getNumOfSymbolTables(): number {
		return this.elfSymbols.length;
	}

	private loadDebugInfo(): Enums.DataResult {
		let debugInfo: ElfSectionHeader = null;
		let debugAbbrev: ElfSectionHeader = null;
		let debugLoc: ElfSectionHeader = null;
		let debugLine: ElfSectionHeader = null;
		let debugLineStr: ElfSectionHeader = null;
		let debugStr: ElfSectionHeader = null;
		let debugRanges: ElfSectionHeader = null;

		for (const sectionHeader of this.elfSectionHeaders) {
			if (sectionHeader.shName == ".debug_info") {
				debugInfo = sectionHeader;
			} else if (sectionHeader.shName == ".debug_abbrev") {
				debugAbbrev = sectionHeader;
			} else if (sectionHeader.shName == ".debug_loc") {
				debugLoc = sectionHeader;
			} else if (sectionHeader.shName == ".debug_line") {
				debugLine = sectionHeader;
			} else if (sectionHeader.shName == ".debug_line_str") {
				debugLineStr = sectionHeader;
			} else if (sectionHeader.shName == ".debug_str") {
				debugStr = sectionHeader;
			} else if (sectionHeader.shName == ".debug_ranges") {
				debugRanges = sectionHeader;
			}
		}

		if (debugInfo != null) {
			try {
				this.dw = new Dwarf.Dwarf(
					this.elfFileAccess.getDataView(),
					debugInfo,
					debugAbbrev,
					debugLoc,
					debugLine,
					debugLineStr,
					debugStr,
					debugRanges,
					this.debug,
				);

				if (this.dw.compilationUnits.length === 0) {
					throw new Error("No compilation units were parsed");
				}

				this.dw.matchDebugInfo(this);
			} catch (error) {
				console.error(
					"DWARF: Error loading debug information:",
					error instanceof Error ? error.message : "Unknown error",
				);
				console.error(error);
				if (this.dw != null) {
					this.dw = null;
				}
			}
		}

		return Enums.DataResult.OK;
	}

	private updateStackData(stackData: StackData) {
		// Merge all SU data from all SU files into mergedStackUsage map. Keys have mangled form
		const mergedStackUsage = new Map<string, StackUsageData>();
		for (const suEntry of stackData.stackUsage) {
			for (const [key, v] of suEntry) {
				const found = mergedStackUsage.get(key);
				// Symbol already contained from different su files
				if (found !== undefined) {
					if (v.stack != found.stack) {
						if (this.debug) {
							console.warn(
								`SU: Duplicate symbol (different su file) "${key}"! path:${v.path}" existingStack:${found.stack} newStack:${v.stack}`,
							);
						}
						if (this.dw) {
							// if we have DWARF information
							// Update the symbol only if there is a symbol having the DWARF path matching the one from SU file
							const searchSyms = this.findSymbolsByName(key);
							for (const searchSym of searchSyms) {
								if (searchSym.path) {
									if (searchSym.path.endsWith(v.path)) {
										if (this.debug) {
											console.log(
												`SU: DW: Update ${key}/0x${searchSym.value.toString(16)} suPath:"${v.path}" symPath:"${searchSym.path}" stack:${v.stack}`,
											);
										}
										found.type = v.type;
										found.stack = v.stack;
										found.path = v.path;
										break;
									} else if (this.debug) {
										console.log(
											`SU: DW: Ignore ${key}/0x${searchSym.value.toString(16)} suPath:"${v.path}" symPath:"${searchSym.path}" stack:${v.stack}`,
										);
									}
								}
							}
						} else {
							// Use max
							if (found.stack < v.stack) {
								if (this.debug) {
									console.log(
										`SU: NDW: Update ${key} suPath:"${v.path}" with stack:${v.stack} oldStack:${found.stack}`,
									);
								}

								found.type = v.type;
								found.stack = v.stack;
								found.path = v.path;
							} else if (this.debug) {
								console.log(
									`SU: NDW: Ignore ${key} suPath:"${v.path}" with stack:${v.stack} keepStack:${found.stack}`,
								);
							}
						}
					}
					found.suDuplicates++;
				} else {
					mergedStackUsage.set(key, v);
					if (this.debug) {
						console.log(`SU: "${key}" = ${v.stack} path:"${v.path}"`);
					}
				}
			}
		}

		// Update ELf symbols localStack and demangledName
		for (const [key, su] of mergedStackUsage) {
			for (const name of su.mangledNames) {
				const syms = this.findSymbolsByName(name);
				if (syms.length > 0) {
					for (const symData of syms) {
						if (this.debug) {
							console.log(
								`SU: ${symData.nameStr}/0x${symData.value.toString(16)}/${symData.index}: set localStack to ${su.stack}. nNames:${su.mangledNames.length} demangledName:"${key}"`,
							);
						}

						// update demangledName
						if (ElfDemangler.isMangled(name)) {
							if (this.debug) {
								console.log(
									`SU DEMANGLER: "${symData.nameStr}" => "${key}". old:"${symData.demangledName}" oldSrc:${symData.demangledNameSource}`,
								);
							}
							symData.demangledName = key;
							symData.demangledNameSource = "SU";
						}

						if (su.stack > 0) {
							// Update stack
							symData.stack = su.stack;
							this.isSuFilePresent = true;
						}
					}
				} else if (this.debug) {
					console.log(
						`SU: No symbol with name "${name}" found! stack:${su.stack}`,
					);
				}
			}
		}

		// Update ELF symbols graphStack
		let nSymbolsUpdated = 0;
		for (const graph of stackData.graphs) {
			if (this.debug) {
				graph.printNodes();
			}
			nSymbolsUpdated += graph.updateModel(this);
		}
		this.isGraphFilePresent = nSymbolsUpdated > 0;
	}

	/**
	 * Loads the .comment section from the ELF file.
	 * @returns The content of the .comment section as a string.
	 */
	private loadCommentSection(): Enums.DataResult {
		let commentSection: ElfSectionHeader = null;

		// Iterate through section headers to find the .comment section
		for (const sectionHeader of this.elfSectionHeaders) {
			if (sectionHeader.shName == ".comment") {
				commentSection = sectionHeader;
				break;
			}
		}

		// If .comment section is found, process it
		if (commentSection != null) {
			try {
				const elfCommentParser = new ElfCommentParser(
					this.elfFileAccess,
					commentSection,
				);
				this.heuristics.compilerDetected =
					elfCommentParser.getDetectedCompiler();
				if (this.debug) {
					const comments = elfCommentParser.getComments();
					let i = 0;
					for (const comment of comments) {
						console.log(`COMMENT[${i}]: "${comment}"`);
						i++;
					}
					console.log(
						`COMMENT: detected compiler: "${this.heuristics.compilerDetected}"`,
					);
				}
			} catch (error) {
				console.error("Error loading .comment section:", error.message);
				return Enums.DataResult.INVALID;
			}
		} else {
			console.warn(".comment section not found in the ELF file");
			return Enums.DataResult.INVALID;
		}

		return Enums.DataResult.OK;
	}

	/**
	 * Loads the ELF file data into the ElfDataModel instance.
	 *
	 * @param stackData - Local and graph stack data
	 * @returns The result of the data loading operation.
	 */
	public load(stackData: StackData, noDb: boolean): Enums.DataResult {
		this.elfHeader = new ElfHeader(this.elfFileAccess);

		let result: Enums.DataResult | undefined;

		result = this.elfHeader.load();

		if (result === Enums.DataResult.OK) {
			result = this.loadProgramHeaderTables();
		}
		if (result === Enums.DataResult.OK) {
			result = this.loadSectionHeaderTables();
		}
		if (result === Enums.DataResult.OK) {
			result = this.loadSymbolTables();
			if (result == Enums.DataResult.OK) {
				for (const sym of this.elfSymbols) {
					for (const symData of sym.symbolData) {
						symData.cacheSectionName(this);
						symData.cacheName();
						if (ElfDemangler.isMangled(symData.nameStr)) {
							try {
								const demangled = this.demangler.demangle(symData.nameStr);
								if (this.debug) {
									console.log(
										`DEMANGLER: "${symData.nameStr}" => "${demangled}" old:"${symData.demangledName}" oldSrc:${symData.demangledNameSource}`,
									);
								}
								symData.demangledName = demangled;
								symData.demangledNameSource = "demangler";
							} catch (err) {
								if (this.debug) {
									console.log(
										`DEMANGLER: ERROR: "${symData.nameStr}" => ${err.toString()}`,
									);
								}
							}
						}
						this.heuristics.collect(symData);
					}
				}
			}
		}
		if (result == Enums.DataResult.OK) {
			result = this.loadArmAttributes();
		}
		if (result == Enums.DataResult.OK) {
			result = this.loadDebugInfo();
		}
		// Update symbol stack data
		if (result == Enums.DataResult.OK) {
			this.updateStackData(stackData);
		}
		// Get compiler attributes. Failing to get it is not critical
		if (result == Enums.DataResult.OK) {
			this.loadCommentSection();
		}

		if (result == Enums.DataResult.OK && !noDb) {
			result = this.createDb();
			if (result == Enums.DataResult.OK) {
				result = this.populateDb();
			}
		}

		if (this.debug) {
			console.log(
				`ELF: isSuFilePresent:${this.isSuFilePresent} isGraphFilePresent:${this.isGraphFilePresent}`,
			);
		}

		return result;
	}

	public getSectionName(idx: number): string {
		// First section, that exist, so there is no need to search in elfSectionHeaders
		if (idx === Enums.SpecialSectionIndices.SHN_UNDEF.valueOf()) return "UND";

		const section = this.elfSectionHeaders.find((elem) => elem.index === idx);
		if (section !== undefined) return section.shName;

		// Just like readelf
		if (idx === Enums.SpecialSectionIndices.SHN_ABS.valueOf()) return "ABS";
		if (idx === Enums.SpecialSectionIndices.SHN_COMMON.valueOf()) return "COM";

		// Use NULL
		return null;
	}

	public getHeuristics(): ElfHeuristics {
		return this.heuristics;
	}

	// Lokup by mangled name
	public findSymbolsByName(name: string): Array<ElfSymbolData> {
		const ret = new Array<ElfSymbolData>();
		for (const symTab of this.elfSymbols) {
			for (const symData of symTab.symbolData) {
				if (name === symData.nameStr) {
					ret.push(symData);
				}
			}
		}
		return ret;
	}
}

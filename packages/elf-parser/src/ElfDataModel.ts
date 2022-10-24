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
﻿import { SYMBOLS_TABLE_ID } from "./constants/symbols.js";
import { ElfArmAttributes } from "./ElfArmAttributes.js";
import * as Enums from "./enums.js";
import { ElfFileData } from "./ElfFileData.js";
import { ElfProgramHeader } from "./ElfProgramHeader.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";
import { ElfSymbol } from "./ElfSymbol.js";
import { ElfHeader } from "./ElfHeader.js";
import { ElfHeuristics } from "./ElfHeuristics.js";
import { Helper } from "./Helper.js";
import { Dwarf } from "./Dwarf.js";
import { StackData, StackUsageData } from "./ElfFileParser.js";

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
	 */
	public isSuFilePresent = false;

	/**
	 * Indicates whether the cgraph file is present or not.
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
				`CREATE TABLE ${SYMBOLS_TABLE_ID} (id INT PRIMARY KEY AUTOINCREMENT, num INT, name TEXT, type TEXT, address BIGINT, section TEXT, size BIGINT` +
					(this.isSuFilePresent ? `, localstack INT` : "") +
					(this.isGraphFilePresent ? `, stack INT` : "") +
					", bind TEXT, visibility TEXT" +
					(this.isGraphFilePresent ? `, recursive INT` : "") +
					(this.dw != null ? `, path TEXT` : "") +
					`)`,
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
					symData.index, // num: The number of the symbol.
					symData.nameStr, // name: The name of the symbol.
					Enums.sym_type[symData.infoType], // type: The type of the symbol.
					symData.value, // address as bigint: The address of the symbol.
					symData.sectionNameStr, // section: The section to which the symbol belongs. Can be null!
					symData.size, // size as bigint: The size of the symbol.
					Enums.sym_binding[symData.infoBinding], // bind: The binding of the symbol.
					Enums.sym_visibility[symData.otherVisibility], // visibility: The visibility of the symbol.
				];
				if (this.isSuFilePresent) {
					values.push(symData.stack); // stack: The stack information of the symbol (if available).
				}
				if (this.isGraphFilePresent) {
					values.push(symData.hasGraphStack ? symData.graphStack : null); // graphStack: Computed stack usage from .cgraph files
					values.push(
						symData.hasGraphStack &&
							symData.recursiveType !== Enums.FunctionRecursiveType.NoRecursion
							? symData.recursiveType.valueOf()
							: null,
					); // recursive: FunctionRecursiveType
				}
				if (this.dw != null) {
					values.push(
						symData.path
							? symData.path +
									":" +
									symData.line +
									(symData.column ? ":" + symData.column : "")
							: "",
					);
				}
				try {
					this.database.exec(
						"INSERT INTO symbols(num, name, type, address, section, size, bind, visibility" +
							(this.isSuFilePresent ? ", localstack" : "") +
							(this.isGraphFilePresent ? ", stack" : "") +
							(this.isGraphFilePresent ? ", recursive" : "") +
							(this.dw != null ? ", path" : "") +
							") " +
							"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?" +
							(this.isSuFilePresent ? ", ?" : "") +
							(this.isGraphFilePresent ? ", ?" : "") + // graphStack
							(this.isGraphFilePresent ? ", ?" : "") + // recursiveType
							(this.dw != null ? ", ?" : "") +
							")",
						values,
					);
				} catch (error) {
					console.error(
						`Error inserting data into table for ${symData.nameStr}`,
						error,
					);
					throw error;
				}
			});
		});

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
						if (this.dw) { // if we have DWARF information
							// Update the symbol only if there is a symbol having the DWARF path matching the one from SU file
							for (const sym of this.elfSymbols) {
								const searchSym = sym.findByName(key);
								if (searchSym !== undefined && searchSym.path) {
								       if (searchSym.path.endsWith(v.path)) {
									       	if (this.debug) {
											console.log(`SU: DW: Update ${key}/0x${searchSym.value.toString(16)} suPath:"${v.path}" symPath:"${searchSym.path}" stack:${v.stack}`);
									       	}
										found.type = v.type;
										found.stack = v.stack;
										found.path = v.path;
										break;
								       }
								       else if (this.debug) {
										console.log(`SU: DW: Ignore ${key}/0x${searchSym.value.toString(16)} suPath:"${v.path}" symPath:"${searchSym.path}" stack:${v.stack}`);
								       }
								}
							}
						} else {
							// Use max
							if (found.stack < v.stack) {
								if (this.debug) {
									console.log(`SU: NDW: Update ${key} suPath:"${v.path}" with stack:${v.stack} oldStack:${found.stack}`);
								}

								found.type = v.type;
								found.stack = v.stack;
								found.path = v.path;
							} else if (this.debug) {
								console.log(`SU: NDW: Ignore ${key} suPath:"${v.path}" with stack:${v.stack} keepStack:${found.stack}`);
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

		// Update ELf symbols localStack
		for (const [key, su] of mergedStackUsage) {
			if (su.stack <= 0) continue;
			for (const name of su.mangledNames) {
				for (const sym of this.elfSymbols) {
					const symData = sym.findByName(name);
					if (symData !== undefined) {
						if (this.debug) {
							console.log(`SU: ${symData.nameStr}/0x${symData.value.toString(16)}/${symData.index}: set localStack to ${su.stack}. nNames:${su.mangledNames.length} demangledName:"${key}"`);
						}
						symData.stack = su.stack;
						this.isSuFilePresent = true;
					} else if (this.debug) {
						console.log(`SU: No symbol with name "${name}" found! stack:${su.stack}`);
					}
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
}

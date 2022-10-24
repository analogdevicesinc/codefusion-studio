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
﻿import { ElfDataModel } from "./ElfDataModel.js";
import { StackUsageData } from "./ElfFileParser.js";
import { FunctionRecursiveType } from "./enums.js";
import { promises as fs } from "node:fs";

// a graph node call
export class GraphNodeCall {
	public name = "";
	public symbolNr = 0;
	public inlined = false;
}

// a graph per source file
export class GraphNode {
	public name = "";
	public mangledName = "";
	public symbolNr = 0;
	public address = "";
	public type = ""; // string

	public debug = false;

	public localStack = 0; // from .su file
	public graphStack = 0; // computed

	public calls = new Array<GraphNodeCall>();
	public callNodes = new Array<GraphNode>(); // refs to nodes

	public recursiveType = FunctionRecursiveType.NoRecursion;

	public isFunction() {
		return this.type.includes("function");
	}

	public updateRecursiveType(type: FunctionRecursiveType) {
		if (type <= this.recursiveType) return;

		if (this.debug) {
			console.log(
				`GRAPH: node "${this.name}"/${this.symbolNr} set recursive: ${FunctionRecursiveType[this.recursiveType]} => ${FunctionRecursiveType[type]}`,
			);
		}

		this.recursiveType = type;
	}
}

class GraphAnalysisReport {
	public functions = new Array<number>();
	public stack = 0;

	public addFunction(symbolNr: number, callCost: number): boolean {
		const found = this.functions.find((element) => element === symbolNr);
		if (found) {
			return false;
		}
		this.stack += callCost;
		this.functions.push(symbolNr);
		return true;
	}

	public getDepth(): number {
		return this.functions.length - 1;
	}

	public clone(): GraphAnalysisReport {
		const ret = new GraphAnalysisReport();
		for (const f of this.functions) ret.functions.push(f);
		ret.stack = this.stack;
		return ret;
	}
}

export class CallGraph {
	public file = "";
	public nodes = new Array<GraphNode>();

	public mangledToNode = new Map<string, GraphNode>();

	private debug = false;

	public findNode(symbolNr: number): GraphNode {
		for (const node of this.nodes) {
			if (node.symbolNr === symbolNr) return node;
		}
		return null;
	}

	constructor(filePath: string, debug = false) {
		this.file = filePath;
		this.debug = debug;
	}

	// Graph recursive function
	public static analyseNode(
		node: GraphNode,
		report: GraphAnalysisReport,
		recursiveFunctions: Array<number>,
		depth: number,
		callCost = 0,
	): GraphAnalysisReport {
		let ret = report.clone();

		if (!ret.addFunction(node.symbolNr, callCost)) {
			//console.log(`GRAPH: node "${node.name}"/${node.symbolNr} is recursive! depth:${depth}`);
			recursiveFunctions.push(node.symbolNr);
			return ret;
		}

		ret.stack += node.localStack;

		const childReports = new Array<GraphAnalysisReport>();
		for (const child of node.callNodes) {
			childReports.push(
				CallGraph.analyseNode(
					child,
					ret,
					recursiveFunctions,
					depth + 1,
					callCost,
				),
			);
		}
		for (const r of childReports) {
			if (r.stack > ret.stack) {
				ret = r;
			}
		}

		return ret;
	}

	public compute(stackUsage: Map<string, StackUsageData>) {
		// fill node information
		for (const node of this.nodes) {
			// Set localStack from stackUsage map
			let found = false;
			for (const [k, v] of stackUsage) {
				// demangled comp
				if (k === node.name) {
					// max
					if (node.localStack < v.stack) node.localStack = v.stack;
					found = true;

					// Uniq demangled name
					let foundDemangledName = false;
					for (const n of v.mangledNames) {
						if (n === node.mangledName) {
							foundDemangledName = true;
							break;
						}
					}
					if (!foundDemangledName) {
						v.mangledNames.push(node.mangledName);
					}

					//console.log(`DBG: GRAPH: node "${k}" found in .su! node type:"${node.type}". file:${this.file} mangledName:"${v.mangledName}"`);
				}
			}
			if (!found) {
				//console.warn(`GRAPH: could not find node "${node.name}" in the .su file! type:"${node.type}" graph file:${this.file}`);
			}

			// Fill callNodes for all nodes
			for (const call of node.calls) {
				const callNode = this.findNode(call.symbolNr);
				if (callNode != null) {
					if (callNode === node) {
						if (this.debug) {
							console.log(
								`GRAPH: node "${node.name}"/${node.symbolNr} is self recursive! file:${this.file}`,
							);
						}
						node.updateRecursiveType(FunctionRecursiveType.SelfRecursive);
					}
					// Add the call but computing the recursion call stack
					node.callNodes.push(callNode);
				} else {
					console.warn(
						`GRAPH: could not find node with call symbol ${call.symbolNr} for file ${this.file}`,
					);
				}
			}
		}

		// another iteration because of linked nodes
		for (const node of this.nodes) {
			//if (this.debug) {
			//	console.log(`GRAPH: calc node "${node.name}"/${node.symbolNr} file:${this.file}`);
			//}
			const recursiveFunctions = new Array<number>();
			const report = CallGraph.analyseNode(
				node,
				new GraphAnalysisReport(),
				recursiveFunctions,
				0,
			);
			node.graphStack = report.stack;
			if (recursiveFunctions.length > 0) {
				node.updateRecursiveType(FunctionRecursiveType.ReachesRecursion);
				for (const fun of recursiveFunctions) {
					const recurNode = this.findNode(fun);
					if (recurNode != null) {
						recurNode.updateRecursiveType(FunctionRecursiveType.GraphLoop);
						//console.log(`GRAPH: function "${recurNode.name}"/${recurNode.symbolNr} is recursive!`);
					}
				}
			}
			this.mangledToNode.set(node.mangledName, node);
		}
	} // compute

	public printNode(
		node: GraphNode,
		report: GraphAnalysisReport,
		depth: number,
	) {
		let cpy = report.clone();
		const isRecursive = cpy.addFunction(node.symbolNr, 0) === false;

		let recursiveStr = "";
		if (node.recursiveType !== FunctionRecursiveType.NoRecursion) {
			recursiveStr = ` recursive:${FunctionRecursiveType[node.recursiveType]}`;
		}
		let prefix = "";
		for (let i = 0; i < depth; ++i) {
			prefix += "  ";
		}
		console.log(
			`GRAPH: ${prefix}(${depth}) ${isRecursive ? "(STOP) " : ""}${node.mangledName}/${node.symbolNr}: stack:[${node.localStack}/${node.graphStack}]${recursiveStr} file:${this.file} addr:0x${node.address}`,
		);

		if (!isRecursive) {
			const childReports = new Array<GraphAnalysisReport>();
			for (const child of node.callNodes) {
				this.printNode(child, cpy, depth + 1);
			}
		}
	}

	public printNodes() {
		console.log(`GRAPH: ------ Graph nodes for ${this.file}:`);

		this.nodes.sort((a, b) => b.graphStack - a.graphStack); // desc by graphStack

		for (const node of this.nodes) {
			if (
				node.graphStack > 0 ||
				node.recursiveType !== FunctionRecursiveType.NoRecursion
			) {
				this.printNode(node, new GraphAnalysisReport(), 0);
			}
		}
	}

	// Updates hasGraphStack and graphStack for each symbol data
	public updateModel(model: ElfDataModel): number {
		if (model === undefined || model === null) {
			console.log("GRAPH: model is null");
			return 0;
		}

		let nSymbolsUpdated = 0;
		for (const [key, node] of this.mangledToNode) {
			for (const symTab of model.elfSymbols) {
				if (
					node.graphStack > 0 ||
					node.recursiveType !== FunctionRecursiveType.NoRecursion
				) {
					const sym = symTab.findByName(key);
					if (sym === undefined) {
						if (this.debug) {
							console.log(
								`GRAPH: No symbol with name "${key}" found! graphStack:${node.graphStack}`,
							);
						}
					} else {
						if (node.recursiveType !== FunctionRecursiveType.NoRecursion) {
							sym.recursiveType = node.recursiveType;
						}

						if (node.graphStack > 0 && sym.graphStack < node.graphStack) {
							sym.hasGraphStack = true;
							sym.graphStack = node.graphStack;
							// Update localStack as well
							sym.stack = node.localStack;

							if (this.debug) {
								console.log(
									`GRAPH: Update sym ${sym.nameStr}/0x${sym.value.toString(16)} with graphStack:${node.graphStack} recursive:${FunctionRecursiveType[node.recursiveType]}`,
								);
							}

							nSymbolsUpdated++;
						}
					}
				}
			}
		}
		if (this.debug) {
			console.log(
				`GRAPH: "${this.file}" nSymbolsUpdated:${nSymbolsUpdated} nNodes:${this.nodes.length}`,
			);
		}

		return nSymbolsUpdated;
	}

	public static async parseGraphFile(
		file: string,
		debug = false,
	): Promise<CallGraph> {
		const result = new CallGraph(file, debug);
		//console.log(`DBG: CGRAPH: Parsing cgraph file "${file}" ...`);
		try {
			const fileContent = await fs.readFile(file, "utf-8");
			const lines = fileContent.split("\n");

			// working node
			let node: GraphNode = null;

			const nameRegex = /(\S+)\/([0-9]+) (\(.+\)) (\S+)/g;
			const callsRegex =
				/(.+?)\/([0-9]+)( \(inlined\))?( (?:\(.+? per call\)))?( (?:\(.+?\)))?/g;

			const typePrefix = "  Type: ";
			const callsPrefix = "  Calls: ";

			let canParse = false;
			for (let line of lines) {
				if (line.length >= 1 && line[line.length - 1] === "\r")
					line = line.slice(0, line.length - 1);

				//console.log(`DBG: CGRAPH: Parsing graph line "${line}" ... canParse:${canParse}`);

				if (!canParse && line === "Optimized Symbol table:") {
					//console.log("GRAPH: can parse!");
					canParse = true; // next line is of interest
				} else if (canParse && line === "Materializing clones") {
					if (node != null) result.nodes.push(node);
					canParse = false;
					break;
				} else if (canParse) {
					if (line.length > 2 && !line.startsWith("  ")) {
						// name
						//console.log(`DBG: CGRAPH: Parsing name line "${line}" ...`);

						if (node != null) result.nodes.push(node);

						const matches = line.matchAll(nameRegex);

						node = null;
						for (const match of matches) {
							if (node === null) {
								node = new GraphNode();
								node.debug = debug;
							}
							node.mangledName = match[1];
							node.symbolNr = +match[2];
							node.name = match[3].substring(1, match[3].length - 1);
							node.address = match[4];

							//console.log(match);
						}
						if (!node) {
							//console.log(`Stop parsing at line "${line}"`);
							canParse = false;
						} else {
							//console.log(`node name: "${node.name}"`);
							//console.log(`node mangledName: "${node.mangledName}"`);
							//console.log(`node symbolNr: "${node.symbolNr}"`);
							//console.log(`node address: ${node.address}`);

							const searchNode = result.findNode(node.symbolNr);
							if (searchNode != null) {
								console.error(
									`GRAPH: Error: Duplicate node ${node.name}/${node.symbolNr}`,
								);
							}
						}
					} else if (
						line.length > callsPrefix.length &&
						line.startsWith(callsPrefix)
					) {
						// calls
						//console.log(`DBG: CGRAPH: Parsing Calls line "${line}" ...`);
						const matches = line
							.substring(callsPrefix.length)
							.matchAll(callsRegex);
						for (const match of matches) {
							const call = new GraphNodeCall();
							call.name = match[1].trim();
							call.symbolNr = +match[2];
							call.inlined = match[3] ? true : false;
							node.calls.push(call);

							//console.log(`call name: "${call.name}"`);
							//console.log(`call symbolNr: "${call.symbolNr}"`);
							//console.log(`call inlined: ${call.inlined}`);

							//console.log(match);
						}
					} else if (
						line.length > typePrefix.length &&
						line.startsWith(typePrefix)
					) {
						// type
						//console.log(`DBG: CGRAPH: Parsing Type line "${line}" ...`);
						node.type = line.substring(typePrefix.length);
						//console.log(`DBG: CGRAPH: Type: "${node.type}"`);
					}
				}
			} // for
		} catch (error) {
			console.error(`Error parsing file ${file}:`, error);
			// Optionally, handle the error as needed
		}
		return result;
	}
}

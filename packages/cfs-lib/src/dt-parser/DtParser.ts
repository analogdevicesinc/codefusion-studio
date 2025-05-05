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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import os from "os";
import path from "path";
import { promises as fs } from "node:fs";

// DT input params
interface DtParams {
	verbose?: boolean;
	includeDirs?: string[];
}

// Root nodes different than "/"
interface RootNode {
	name: string;
	json?: unknown;
	txt: string;
	origin: string;
	deleted: boolean;
}

// Information about the included files
interface IncludedFile {
	relPath: string;
	includedFullPath?: string;
	skipped?: boolean;
}

function isObject(item: unknown) {
	return item && typeof item === "object" && !Array.isArray(item);
}

// Find a node by key of by nodeLabel
// Properties are not returned
function findNode(name: string, obj: any): unknown {
	if (!isObject(obj)) return undefined;

	for (const key in obj) {
		if (isObject(obj[key])) {
			if (key === name) {
				return obj[key];
			}
			const found = findNode(name, obj[key]);
			if (found) {
				return found;
			}
		} else if (key === "nodeLabel" && obj[key] === name) {
			return obj;
		}
	}
	return undefined;
}

// Deep merge
function deepMerge(target: any, ...sources: any[]): any {
	if (sources.length === 0) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				deepMerge(target[key], source[key]);
			} else if (key !== "nodeLabel" || !target[key]) {
				// Leave nodeLabel unchanged if it exists
				Object.assign(target, { [key]: source[key] });
			}
		}
	}
	return deepMerge(target, ...sources);
}

// DTS plain text parser
// Should be the fastest convertion to json (no recursion, no deps, just strings)
export class DtParser {
	private verbose = false;
	private includeDirs: string[];

	// Collect included files
	private includedFiles = new Set<IncludedFile>();

	constructor(params?: DtParams) {
		this.includeDirs = params?.includeDirs ?? [];
		this.verbose = params?.verbose ?? false;
	}

	private log(str: string) {
		if (this.verbose) {
			console.log(`DT: ${str}`);
		}
	}

	private static expandTilde(str: string): string {
		const parts = str.split(path.sep);
		if (parts[0] === "~") {
			parts[0] = os.homedir();
		} else {
			return str;
		}
		return path.join(...parts);
	}

	private removeReference(name: string): string {
		// Remove "&"
		if (name.startsWith("&")) {
			return name.slice(1);
		}
		return name;
	}

	private async readIncludeFile(
		fname: string,
		includePathOp: string,
		currentFolder: string,
		origin: string
	) {
		const includeDirs = [...this.includeDirs];
		switch (includePathOp) {
			case '"':
				// Include the path of the file calling #include
				if (currentFolder) {
					includeDirs.push(currentFolder);
					this.log(`INCLUDE: currentFolder:${currentFolder}`);
				}
				break;
			case "<":
				break;
			default:
				throw new Error(
					`Unknown include operator "${includePathOp}"`
				);
		}

		// Iterate folders
		for (const inc of includeDirs) {
			const p = path.join(DtParser.expandTilde(inc), fname);
			const fileExists = await fs
				.access(p)
				.then(() => true)
				.catch(() => false);
			this.log(
				`INCLUDE: Trying to open "${p}" ... exists:${fileExists}`
			);
			if (fileExists) {
				return [p, await fs.readFile(p, "utf8")];
			}
		}

		throw new Error(
			`Cannot find include file "${fname}"! caller:${origin}`
		);
	}

	/* eslint-disable complexity */
	private async parse(
		content: string,
		origin: string,
		currentFolder: string
	): Promise<RootNode[]> {
		let txt = "";

		// Current lexer id
		let id = "";
		let prevChar = "";

		// Returns the current parsed lexer id
		const flush = (quotes = true) => {
			if (!id) return "";
			const ret = id;
			id = "";
			if (quotes && !ret.startsWith('"')) {
				return `"${ret}"`;
			}

			return ret;
		};

		const popComma = () => {
			if (txt.endsWith(",\n")) {
				txt = txt.slice(0, -2) + "\n"; // Pop back ','
			}
		};

		let depth = 0; // Node depth

		// In property value, after "="
		let inValue = false;
		// In "
		let inQuotes = false;
		// Processing a list
		let inList = false;
		// Processing a preprocessor list item between parentheses
		// Used to group list items like "(GPIO_ACTIVE_HIGH | MAX32_GPIO_VSEL_VDDIOH)"
		// in a single item
		let inListCode = false;
		let inListCodeLevels = 0;
		// Current list items
		let listItems = [];
		// Are we in the middle of a comment?
		let inComment = false;
		// Line comment is the one ending with \n
		// Non-line comment is the one between /* and */
		let lineComment = false;
		// Current node label, if any
		let label = "";

		// Are we at the root level?
		let rootLevel = true;
		// How many times we reached the root level?
		let nRootLevels = 1;
		let lastRootLevelLinePos = 0;

		let rootNodeName = "";

		// Order matters, so no Maps here
		const rootNodes: RootNode[] = [];
		const includeNodes: RootNode[] = [];

		const log = this.log.bind(this);

		const doPreprocessorLine = async (line: string) => {
			const includeStatement = "#include";
			if (line.startsWith(includeStatement)) {
				const fileStr = line.slice(includeStatement.length).trim();
				const includePathOpStart = fileStr[0];
				const includePathOpEnd =
					includePathOpStart === "<" ? ">" : '"';
				const filePath = fileStr.slice(1, -1);
				const extension = path.extname(filePath);

				log(
					`${origin}: INCLUDE: fileStr:"${fileStr}" includePathOp:[${includePathOpStart} ... ${includePathOpEnd}] extension:"${extension}"`
				);
				if (extension !== ".h") {
					this.log(
						`${origin}: INCLUDE: About to include "${filePath}"`
					);
					const [includeFullPath, includeContent] =
						await this.readIncludeFile(
							filePath,
							includePathOpStart,
							currentFolder,
							origin
						);
					const nodes = await this.parse(
						includeContent,
						`${includePathOpStart}${path.basename(filePath)}${includePathOpEnd}`,
						path.dirname(includeFullPath)
					);
					log(
						`${origin}: INCLUDE: Got ${nodes.length} root nodes from include file "${filePath}". fullPath:${includeFullPath}`
					);

					includeNodes.push(...nodes);

					this.includedFiles.add({
						relPath: filePath,
						includedFullPath: includeFullPath
					});
				} else {
					log(`${origin}: INCLUDE: Skip include file "${filePath}"`);
					this.includedFiles.add({
						relPath: filePath,
						skipped: true
					});
				}
			}
		};

		const deleteNode = (nodeName: string): boolean => {
			let ret = false;
			const name = this.removeReference(nodeName);

			const allNodes = [...rootNodes, ...includeNodes];
			let found = allNodes.find((node) => node.name === name);
			if (found) {
				this.log(
					`${origin}: Deteled root node ${found.origin}.${found.name}`
				);
				found.deleted = true;
				ret = true;
			}

			for (const node of allNodes) {
				found = findNode(name, node) as any;
				if (found) {
					this.log(
						`${origin}: Deteled sub node ${name} child of ${node.origin}.${node.name}`
					);
					(found as any).deleted = true;
					ret = true;
				}
			}

			if (ret) {
				return true;
			}

			const logStr = `${origin}: Cannot find node name "${nodeName}" for delete-node command!`;
			this.log(logStr);
			console.warn(logStr);
			return false;
		};

		// Char by char
		for (let i = 0; i < content.length; ++i) {
			let c = content[i];

			// Unix newlines and replace tabs with spaces
			if (c === "\r") {
				c = "\n";
			} else if (c === "\t") {
				c = " ";
			}

			//log(`${origin}: Process pos ${i} c:'${c}' RL:${rootLevel}`);

			// Process comments
			if (inComment) {
				if (
					(lineComment && c === "\n") ||
					(!lineComment && c === "/" && prevChar === "*")
				) {
					// End comment
					inComment = false;
					log(`${origin}: END comment. LC:${lineComment} id:${id}`);
					prevChar = "";
				} else {
					prevChar = c;
				}
				continue;
			} else if (
				!inQuotes &&
				prevChar === "/" &&
				(c === "*" || c === "/")
			) {
				// Begin Comment
				lineComment = c === "/";
				log(
					`${origin}: BEGIN comment. LC:${lineComment} c:"${c}" prevChar:"${prevChar}" id:"${id}"`
				);
				inComment = true;
				if (id.endsWith("/")) {
					// Pop '/' from id
					id = id.slice(0, -1);
				}
				prevChar = "";
				continue;
			}

			// Process root items
			if (rootLevel) {
				if (c === "\n") {
					id = id.trim();
					if (id) {
						const deleteNodeCommand = "/delete-node/";
						if (id.startsWith("#")) {
							log(`${origin}: PREPROCESSOR LINE "${id}"`);
							await doPreprocessorLine(id);
						} else if (
							id === ";" ||
							id === "/dts-v1/;" ||
							id.startsWith("/memreserve/")
						) {
							// Ignore
						} else if (
							id.startsWith(deleteNodeCommand) &&
							id.endsWith(";")
						) {
							const nodeName = id
								.slice(deleteNodeCommand.length + 1, -1)
								.trim(); // Pop ;
							this.log(
								`${origin} delete node command for "${nodeName}"`
							);
							deleteNode(nodeName);
						} else {
							log(`${origin}: NON-PREPROCESSOR LINE "${id}"`);
							log(
								`${origin}: GO back! lastRootLevelLinePos: ${lastRootLevelLinePos} i:${i} id:"${id}"`
							);
							i = lastRootLevelLinePos;
							rootLevel = false;
							id = "";
							continue;
						}
					}
					id = "";
					prevChar = "";
					lastRootLevelLinePos = i;
				} else {
					id += c;
				}

				prevChar = c;
				continue;
			}

			// Parsing between "
			if (inQuotes) {
				id += c;
				if (c === '"') {
					listItems.push(flush());
					prevChar = c;
					inQuotes = false;
				}
				continue;
			}

			// Parsing preprocessor list item, ie. items between parentheses
			if (inList && inListCode) {
				// Preprocessor expressions can be multilined
				if (c === "\n") id += " ";
				else if (c === "\\") id += " ";
				else id += c;

				if (c === "(") {
					inListCodeLevels++;
				} else if (c === ")") {
					if (--inListCodeLevels <= 0) {
						listItems.push(flush());
						prevChar = c;
						inListCode = false;
					}
				}
				continue;
			}

			switch (c) {
				case "{":
					// Node
					depth++;
					const nodeName = flush(false);
					log(
						`${origin}: BEGIN node depth ${depth}. name:"${nodeName}" label:"${label}"`
					);
					if (depth > 1) {
						txt += `"${nodeName}": ${c}\n`;
					} else {
						rootNodeName = nodeName;
						txt += `${c}\n`;
					}
					if (label) {
						// Node properties like "/omit-if-no-ref/"
						const propsEnd = label.lastIndexOf("/");
						if (propsEnd !== -1) {
							const props = label.slice(0, propsEnd + 1);
							label = label.slice(propsEnd + 1).trim();
							// Also add the node properties. It might be usefull
							txt += `"nodeProps": "${props}",\n`;
							log(
								`${origin}: node props: "${props}" label:"${label}"`
							);
						}
						txt += `"nodeLabel": "${label}",\n`;
						label = "";
					}

					break;
				case "}":
					popComma();
					txt += c;
					log(`${origin}: END node depth ${depth}`);
					depth--;
					if (depth <= 0) {
						rootLevel = true;
						nRootLevels++;
						id = "";

						rootNodes.push({
							name: rootNodeName,
							txt: txt,
							origin: origin,
							deleted: false
						});
						txt = "";

						log(
							`${origin}: SWITCH to rootLevel:${rootLevel} nRootLevels:${nRootLevels}`
						);
					}
					break;

				case "[":
				case "<":
					inList = true;
					break;

				case "]":
				case ">": {
					const t = flush();
					if (t) listItems.push(t);
					break;
				}

				case "=":
					txt += flush();
					txt += `: `;

					inValue = true;
					listItems = [];
					break;
				case ":":
					label = flush(false);
					break;
				case ";": {
					let t = flush();
					if (t) {
						listItems.push(t);
					}
					if (inValue) {
						if (listItems.length > 1) {
							if (listItems.includes(",")) {
								// Two-dimensional array
								txt += "[[";
								for (const i of listItems) {
									if (i === ",") {
										popComma();
										txt += "], [";
									} else {
										txt += `${i},\n`;
									}
								}
								popComma();
								txt += "]]";
							} else {
								txt += `[${listItems.join(", ")}]`;
							}
						} else if (listItems.length === 1) {
							txt += listItems[0];
						} else {
							txt += inList ? "[]" : '""';
						}
						listItems = [];
						inValue = false;
					} else {
						let boolVal = true;
						const deletePropStr = '"/delete-property/';
						if (t.startsWith(deletePropStr)) {
							t = '"' + t.slice(deletePropStr.length);
							boolVal = false;
						}
						txt += t;
						listItems = [];

						// Boolean property without any value
						if (prevChar !== "}") {
							// Complains about eslint/restrict-template-expressions
							txt += `: ${boolVal ? "true" : "false"}`;
						}
					}
					txt += ",\n";

					inList = false;
					inListCode = false;
					inListCodeLevels = 0;
					inQuotes = false;
					inComment = false;
					listItems = [];
					label = "";

					break;
				}

				case '"':
					inQuotes = true;
					flush();
					id += c;
					break;

				default:
					if (inList) {
						if (c === "(") {
							inListCode = true;
							inListCodeLevels++;
						} else if (c === " " || c === "\n" || c === ",") {
							const t = flush();
							if (t) {
								listItems.push(t);
							}
							if (c === ",") {
								// Two-dimensional special separator
								listItems.push(",");
							}
						}
					}

					if (c !== " " && c !== "\n" && c !== "," && c !== "\\") {
						id += c;
					}

					break;
			} // swich

			if (c !== " " && c !== "\n") {
				prevChar = c;
			}
		}

		popComma();

		// Create json object
		for (const node of rootNodes) {
			try {
				// Try to parse node text as JSON
				const json: unknown = JSON.parse(node.txt);

				// Track root node origin
				(json as any).origin = node.origin;
				node.json = json;
			} catch (error) {
				if (this.verbose) {
					await fs.writeFile("error.json", node.txt);
				}
				console.log(node.txt);
				throw error;
			}
		}

		// Includes should be processed first
		includeNodes.push(...rootNodes);

		return includeNodes;
	}

	public async jsonFromString(
		content: string,
		origin = "<MEM>",
		currentFolder = ""
	) {
		this.includedFiles.clear();

		const nodes = await this.parse(content, origin, currentFolder);

		const merged = {
			includedFiles: Array.from(this.includedFiles)
		};
		for (let i = 0; i < nodes.length; ++i) {
			const node = nodes[i];

			this.log(
				`========= rootNode[${i}] "${node.name}": origin:${node.origin} del:${node.deleted} {`
			);

			if (node.deleted) continue;

			if (this.verbose) {
				const str = JSON.stringify(node.json, null, 2); // spacing level = 2
				console.log(str);
			}

			// As a test, merge all "/" nodes
			if (node.name === "/") {
				deepMerge(merged, node.json);
			} else {
				const name = this.removeReference(node.name);
				// First searh in the merged object
				let found = findNode(name, merged);
				if (found) {
					// this.log(`FIND_NODE: Found node "${node.name}" in merged!`);
					deepMerge(found, node.json);
				} else {
					// Otherwise search over all nodes?
					for (const nodeAgain of nodes) {
						if (nodeAgain != node) {
							found = findNode(name, nodeAgain.json);
							if (found) {
								//this.log(`FIND_NODE: Found node "${node.name}" in not merged nodes!`);
								deepMerge(found, node.json);
								break;
							}
						}
					}
					if (!found) {
						const logStr = `MERGE: Cannot find corresponding node for "${node.origin}.${node.name}".`;
						this.log(logStr);
						console.warn(logStr);
					}
				}
			}

			this.log(`} ======`);
		}

		return merged;
	}

	public async jsonFromFile(fpath: string) {
		const content = await fs.readFile(fpath, "utf8");
		return this.jsonFromString(
			content,
			`<${path.basename(fpath)}>`,
			path.dirname(fpath)
		);
	}
} // DtParser

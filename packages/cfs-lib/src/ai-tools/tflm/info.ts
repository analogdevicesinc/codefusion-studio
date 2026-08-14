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

import fs from "node:fs";
import path from "node:path";

import {
	Model,
	OperatorCode,
	SubGraph,
	Tensor,
	TensorType
} from "./schema/tflite.js";
import { ByteBuffer } from "flatbuffers";
import { getOpName } from "./operator-info.js";

const TENSOR_TYPE_SIZES = new Map<TensorType, number>([
	[TensorType.BOOL, 1],
	[TensorType.INT8, 1],
	[TensorType.UINT8, 1],
	[TensorType.FLOAT16, 2],
	[TensorType.INT16, 2],
	[TensorType.UINT16, 2],
	[TensorType.FLOAT32, 4],
	[TensorType.INT32, 4],
	[TensorType.UINT32, 4],
	[TensorType.FLOAT64, 8],
	[TensorType.INT64, 8],
	[TensorType.UINT64, 8],
	[TensorType.COMPLEX64, 8],
	[TensorType.COMPLEX128, 16]
	// TensorType.STRING: Not supported in tflite-micro
]);

/**
 * Class to manage tensorflow lite information.
 *
 * @param fname - Path to the `tflite` file.
 */
export default class TfliteInfo {
	private ops: Set<string>;
	private numTensors: number;
	private activationSize: number;
	private paramSize: number;
	private opCodes: (OperatorCode | null)[];

	public summary: string;
	public graph: string;
	public inputWidth: number[];
	public inputLen: number[];
	public outputWidth: number[];
	public outputLen: number[];
	public numOps: number;

	// eslint-disable-next-line complexity
	constructor(fname: string) {
		this.ops = new Set<string>();
		this.summary = "";
		this.graph = "";
		this.numTensors = 0;
		this.activationSize = 0;
		this.paramSize = 0;
		this.inputWidth = [];
		this.inputLen = [];
		this.outputWidth = [];
		this.outputLen = [];
		this.opCodes = [];

		// Open, parse and validate file
		const b = fs.readFileSync(path.resolve(fname));

		// Check that file appears to be a valid model before parsing
		if (b.subarray(4, 8).toString("ascii") !== "TFL3") {
			throw new Error(`${fname} is not a valid TFLite file.`);
		}

		const model = Model.getRootAsModel(new ByteBuffer(b));
		// Index of all operators used in model
		const opCodesLength = model.operatorCodesLength();

		for (let i = 0; i < opCodesLength; i++) {
			const code = model.operatorCodes(i);

			if (code === null) {
				throw new Error(
					`${fname} is corrupt: invalid operator code index ${String(i)}`
				);
			}

			this.opCodes.push(code);
			// DeprecatedBuiltinCode() for older models (codes < 127)
			// BuiltinCode() for codes >= 127
			this.addOp(
				getOpName(
					Math.max(code.deprecatedBuiltinCode(), code.builtinCode())
				)
			);
		}

		this.numOps = this.ops.size;

		const subgraphsLength = model.subgraphsLength();

		// Trawl num_tensors to count and report summary
		for (let i = 0; i < subgraphsLength; i++) {
			const subgraph = model.subgraphs(i);

			if (!subgraph) {
				throw new Error(`Subgraph not found at index ${String(i)}`);
			}

			const name = subgraph.name() ?? "(no name)";

			const [subgraphOps, numSubgraphOps] =
				this.getSubgraphOperators(subgraph);
			this.addToGraph(
				`Subgraph ${String(i)} "${name}": ` +
					`Inputs: ${String(subgraph.inputsLength())}, ` +
					`Outputs: ${String(subgraph.outputsLength())}, ` +
					`Operators: ${String(numSubgraphOps)}, ` +
					`Tensors: ${String(subgraph.tensorsLength())}`
			);

			this.addSubgraphTensorDetails(subgraph, "input");
			this.addSubgraphTensorDetails(subgraph, "output");

			this.addToGraph(`  Operators (${String(numSubgraphOps)}):`);

			subgraphOps.forEach((op, idx) => {
				this.addToGraph(`    ${String(idx)}: ${op}`);
			});

			const numGraphTensors = subgraph.tensorsLength();
			this.addToGraph(`  Tensors (${String(numGraphTensors)}):`);
			this.addTensors(numGraphTensors);

			for (let j = 0; j < numGraphTensors; j++) {
				const tensor = subgraph.tensors(j);

				if (tensor === null) {
					throw new Error(
						`Subgraph tensor not found at index ${String(j)}`
					);
				}

				const name = tensor.name()
					? String(tensor.name())
					: "(no name)";
				this.addToGraph(`    ${String(j)}: ${name}`);

				// Attempt to calculate arena size
				const size = this.tensorConstLength(model, tensor);

				if (size) {
					this.addToParams(size);
				} else {
					this.addTensorToArena(tensor);
				}
			}
		}

		const firstSg = model.subgraphs(0);

		if (!firstSg) {
			throw new Error(`${fname} is corrupt: no subgraphs found`);
		}

		// Calculate input details from the first subgraphs input tensors
		for (let i = 0; i < firstSg.inputsLength(); i++) {
			const index = firstSg.inputs(i);

			if (index === null) {
				throw new Error(
					`First subgraph input not found at index ${String(i)}`
				);
			}

			const tensor = firstSg.tensors(index);

			if (tensor === null) {
				throw new Error(
					`First subgraph input tensor not found at index ${String(i)}`
				);
			}

			this.inputWidth.push(this.tensorTypeSize(tensor));
			this.inputLen.push(this.tensorNumElements(tensor));
		}

		// Calculate output details from the first subgraphs output tensors
		for (let i = 0; i < firstSg.outputsLength(); i++) {
			const index = firstSg.outputs(i);

			if (index === null) {
				throw new Error(
					`First subgraph output not found at index ${String(i)}`
				);
			}

			const tensor = firstSg.tensors(index);

			if (tensor === null) {
				throw new Error(
					`First subgraph output tensor not found at index ${String(i)}`
				);
			}

			this.outputWidth.push(this.tensorTypeSize(tensor));
			this.outputLen.push(this.tensorNumElements(tensor));
		}

		// Update summary info
		this.addToSummary(`Inputs: ${String(this.inputWidth.length)}`);
		this.addToSummary(`Outputs: ${String(this.outputWidth.length)}`);
		this.addToSummary(`Tensors: ${String(this.numTensors)}`);
		this.addToSummary(`Operators: ${String(this.numOps)}`);

		for (const op of this.operators()) {
			this.addToSummary(`  ${op}`);
		}
	}

	/**
	 * Add operator to set of operator names.
	 *
	 * @param key - Operator name.
	 */
	private addOp(key: string) {
		this.ops.add(key);
	}

	/**
	 * Get set of operators in the specified subgraph.
	 *
	 * @returns Set of opcodes, number of opcodes
	 */
	private getSubgraphOperators(
		subgraph: SubGraph
	): [string[], number] {
		const graphOps = new Set<string>();

		for (let i = 0; i < subgraph.operatorsLength(); i++) {
			const op = subgraph.operators(i);

			if (!op) {
				throw new Error(
					`Subgraph operator not found at index ${String(i)}`
				);
			}

			const opcodeIdx = op.opcodeIndex();
			const opCode = this.opCodes[opcodeIdx];

			if (!opCode) {
				throw new Error(
					`Subgraph operator ${String(i)} references out-of-bounds opcode index ${String(opcodeIdx)}`
				);
			}

			const bCode = Math.max(
				opCode.deprecatedBuiltinCode(),
				opCode.builtinCode()
			);
			graphOps.add(getOpName(bCode));
		}

		return [Array.from(graphOps).sort(), graphOps.size];
	}

	/**
	 * Escape block comment terminators to prevent comment injection.
	 */
	private escapeBlockComment(s: string): string {
		return s.replace(/\*\//g, "* /");
	}

	/**
	 * Add to the graph string summary.
	 *
	 * @param s - String to append to the graph summary.
	 */
	private addToGraph(s: string) {
		this.graph += this.escapeBlockComment(s) + "\n";
	}

	/**
	 * Increment the number of graph tensors.
	 *
	 * @param n - The number by which to increment the tensor count.
	 */
	private addTensors(n: number) {
		this.numTensors += n;
	}

	private addSubgraphTensorDetails(
		subgraph: SubGraph,
		type: "input" | "output"
	) {
		const isInput = type === "input";
		const numGraphTensors = isInput
			? subgraph.inputsLength()
			: subgraph.outputsLength();

		if (numGraphTensors) {
			this.addToGraph(
				`  ${isInput ? "Inputs" : "Outputs"} (${String(numGraphTensors)}):`
			);
		}

		for (let j = 0; j < numGraphTensors; j++) {
			const index = isInput
				? subgraph.inputs(j)
				: subgraph.outputs(j);

			if (index === null) {
				throw new Error(
					`Subgraph ${type} not found at index ${String(j)}`
				);
			}

			const tensor = subgraph.tensors(index);

			if (tensor === null) {
				throw new Error(
					`Subgraph tensor not found at index ${String(j)}`
				);
			}

			const shape: number[] = [];

			for (let k = 0; k < tensor.shapeLength(); k++) {
				const s = tensor.shape(k);
				if (s !== null) {
					shape.push(s);
					continue;
				}

				throw new Error(
					`Tensor shape not found at index ${String(k)}`
				);
			}

			const name = tensor.name()
				? String(tensor.name())
				: "(no name)";

			this.addToGraph(
				`    ${String(j)}: ${name}: [${String(shape)}]`
			);
		}
	}

	private tensorConstLength(model: Model, tensor: Tensor): number {
		// Returns a length if tensor has a constant buffer.
		// Returns 0 if variable
		if (!tensor.isVariable()) {
			const bufId = tensor.buffer();

			if (bufId > 0) {
				const buf = model.buffers(bufId);

				if (buf) {
					return buf.dataLength();
				}
			}
		}

		return 0;
	}

	/**
	 * Increment the size required for the model params.
	 *
	 * @param n - The number by which to increment the param count.
	 */
	private addToParams(n: number) {
		this.paramSize += n;
	}

	private tensorNumElements(tensor: Tensor): number {
		let n = 1;

		// Note: a length of 0 indicates a scalar.
		// Don't treat it as a special case, as we'll run the loop
		// 0 times and return n=1 as expected.
		for (let i = 0; i < tensor.shapeLength(); i++) {
			const dim = tensor.shape(i);

			if (dim === null) {
				throw new Error(`Invalid tensor shape at index ${String(i)}`);
			}

			if (dim < 1) {
				throw new Error(
					`Unsupported dimension ${String(dim)} for tensor ${String(tensor.name())}`
				);
			}

			n *= dim;
		}

		return n;
	}

	private tensorTypeSize(tensor: Tensor) {
		const type = tensor.type();
		const size = TENSOR_TYPE_SIZES.get(type);

		if (size) {
			return size;
		}

		throw new Error(
			`Unsupported type ${String(type)} for tensor ${String(tensor.name())}`
		);
	}

	private alignUp(x: number, alignment = 16): number {
		// eslint-disable-next-line no-bitwise
		return (x + (alignment - 1)) & ~(alignment - 1);
	}

	/**
	 * Increment the arena by the size of the tensor.
	 *
	 * @param tensor - The tensor to be accounted for in the arena.
	 */
	private addTensorToArena(tensor: Tensor) {
		const size =
			this.tensorNumElements(tensor) * this.tensorTypeSize(tensor);
		this.activationSize += this.alignUp(size);
	}

	/**
	 * Add to the string summary.
	 *
	 * @param s - String to append to the summary.
	 */
	private addToSummary(s: string) {
		this.summary += this.escapeBlockComment(s) + "\n";
	}

	private operators(): string[] {
		return Array.from(this.ops).sort();
	}

	/**
	 * Builds the C tflite resolver code.
	 *
	 * @param n - string to append the variable name.
	 * @returns Operator resolve code.
	 */
	public getResolverCode(n: string): string {
		let text = `TfLiteStatus adi_resolve_ops_${n} (tflite::MicroMutableOpResolver<${n.toUpperCase()}_NUM_OPERATORS>& resolver) {\n`;

		for (const o of this.operators()) {
			text += `    TF_LITE_ENSURE_STATUS(resolver.Add${o}());\n`;
		}

		text += "    return kTfLiteOk;\n}\n";

		return text;
	}

	/**
	 * Builds the C tflite resolver prototype code.
	 *
	 * @param n - string to append to the variable name.
	 * @returns Operator resolver prototype code.
	 */
	public getResolverPrototype(n: string): string {
		return `TfLiteStatus adi_resolve_ops_${n} (tflite::MicroMutableOpResolver<${n.toUpperCase()}_NUM_OPERATORS>& resolver);`;
	}

	public arenaSize(errorMargin = 2): number {
		return (this.activationSize + this.paramSize) * errorMargin;
	}
}

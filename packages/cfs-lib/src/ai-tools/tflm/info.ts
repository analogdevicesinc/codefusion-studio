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
import {
	CUSTOM_OPCODE,
	getKnownCustomOpMethod,
	getOpName
} from "./operator-info.js";

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

// Reference RAM used only to scale the safety margin, not a device limit.
const REFERENCE_RAM = 256 * 1024;
const SCRATCH_BUFFER_WEIGHT_FACTOR = 0.3;

// Matches the alignas(16) the generated C uses for the arena.
const ARENA_ALIGNMENT = 16;

// Target a fraction of the reference RAM, spending the headroom on the safety
// margin; large models still get at least MIN_SAFETY_MARGIN.
const ARENA_RAM_FRACTION = 0.75;
const MIN_SAFETY_MARGIN = 0.2;
const MAX_SAFETY_MARGIN = 3.0;

// MicroAllocator bookkeeping (TfLiteEvalTensor, NodeAndRegistration, op data,
// scratch-buffer handles) is roughly constant per graph and invisible in the
// schema, so it dominates tiny models: measured arenas run up to 11x the
// computed subtotal below this size. No multiplicative margin covers that
// without inflating mid-size models, and 4 KB is too small to break a link.
const SMALL_MODEL_ARENA_FLOOR = 4 * 1024;

/**
 * Class to manage tensorflow lite information.
 *
 * @param fname - Path to the `tflite` file.
 */
export default class TfliteInfo {
	private ops: Set<string>;
	private numTensors: number;
	private activationSize: number;
	private maxWeightSize: number;
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
		this.maxWeightSize = 0;
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
			const builtinCode = Math.max(
				code.deprecatedBuiltinCode(),
				code.builtinCode()
			);

			if (builtinCode === CUSTOM_OPCODE) {
				const customCode = code.customCode();

				if (!customCode) {
					throw new Error(
						`${fname} is corrupt: custom operator at index ${String(i)} has no custom_code`
					);
				}

				const knownMethod = getKnownCustomOpMethod(customCode);

				if (knownMethod) {
					this.addOp(knownMethod);
				} else {
					throw new Error(
						`Custom operator '${customCode}' has no known resolver method.`
					);
				}
			} else {
				this.addOp(getOpName(builtinCode));
			}
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

			// Aligned byte size of each non-constant tensor, keyed by tensor index
			const variableTensorSizes = new Map<number, number>();

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

				// Constants (weights/biases) live in flash, not the arena, but
				// their size drives the kernel scratch-buffer estimate below.
				if (this.isConstantTensor(model, tensor)) {
					this.maxWeightSize = Math.max(
						this.maxWeightSize,
						this.alignedTensorSize(tensor)
					);
				} else {
					variableTensorSizes.set(j, this.alignedTensorSize(tensor));
				}
			}

			// Peak concurrent usage, not a flat sum of every tensor
			this.updateArenaPeak(subgraph, variableTensorSizes);
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

			if (bCode === CUSTOM_OPCODE) {
				const customCode = opCode.customCode() ?? "unknown";
				graphOps.add(`Custom(${customCode})`);
			} else {
				graphOps.add(getOpName(bCode));
			}
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

	private isConstantTensor(model: Model, tensor: Tensor): boolean {
		if (tensor.isVariable()) {
			return false;
		}

		const bufId = tensor.buffer();

		if (bufId <= 0) {
			return false;
		}

		const buf = model.buffers(bufId);

		// An empty buffer has no data, so TFLM allocates it in the arena.
		return buf !== null && buf.dataLength() > 0;
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

	private alignUp(x: number, alignment = ARENA_ALIGNMENT): number {
		// eslint-disable-next-line no-bitwise
		return (x + (alignment - 1)) & ~(alignment - 1);
	}

	/**
	 * Compute the alignment-padded size of a tensor's data buffer.
	 *
	 * @param tensor - The tensor to size.
	 * @returns Aligned size in bytes.
	 */
	private alignedTensorSize(tensor: Tensor): number {
		const size =
			this.tensorNumElements(tensor) * this.tensorTypeSize(tensor);
		return this.alignUp(size);
	}

	/**
	 * Add this subgraph's peak concurrent tensor usage to the arena estimate.
	 *
	 * Tracks the first/last operator index that references each non-constant
	 * tensor (its liveness window), then sums the tensors alive at each
	 * operator step to find the peak, instead of assuming every tensor is
	 * alive for the whole graph.
	 *
	 * @param subgraph - Subgraph to analyze.
	 * @param tensorSizes - Aligned size of each non-constant tensor, keyed by tensor index.
	 */
	private updateArenaPeak(
		subgraph: SubGraph,
		tensorSizes: Map<number, number>
	) {
		const numOperators = subgraph.operatorsLength();
		const firstUse = new Map<number, number>();
		const lastUse = new Map<number, number>();

		const markUse = (tensorIdx: number | null, opIdx: number) => {
			if (
				tensorIdx === null ||
				tensorIdx < 0 ||
				!tensorSizes.has(tensorIdx)
			) {
				return;
			}

			const first = firstUse.get(tensorIdx);
			if (first === undefined || opIdx < first) {
				firstUse.set(tensorIdx, opIdx);
			}

			const last = lastUse.get(tensorIdx);
			if (last === undefined || opIdx > last) {
				lastUse.set(tensorIdx, opIdx);
			}
		};

		for (let opIdx = 0; opIdx < numOperators; opIdx++) {
			const op = subgraph.operators(opIdx);

			if (!op) {
				throw new Error(
					`Subgraph operator not found at index ${String(opIdx)}`
				);
			}

			for (let i = 0; i < op.inputsLength(); i++) {
				markUse(op.inputs(i), opIdx);
			}

			for (let i = 0; i < op.outputsLength(); i++) {
				markUse(op.outputs(i), opIdx);
			}
		}

		// Tensors never referenced by an operator (e.g. unused graph I/O) are
		// given a minimal lifetime: they still count, but holding them live for
		// the whole subgraph inflates the peak for every other operator step.
		for (const tensorIdx of tensorSizes.keys()) {
			if (!firstUse.has(tensorIdx)) {
				firstUse.set(tensorIdx, 0);
				lastUse.set(
					tensorIdx,
					Math.min(1, Math.max(numOperators - 1, 0))
				);
			}
		}

		let peakUsage = 0;

		for (let opIdx = 0; opIdx < Math.max(numOperators, 1); opIdx++) {
			let usageAtStep = 0;

			for (const [tensorIdx, size] of tensorSizes) {
				const first = firstUse.get(tensorIdx) ?? 0;
				const last = lastUse.get(tensorIdx) ?? first;

				if (first <= opIdx && opIdx <= last) {
					usageAtStep += size;
				}
			}

			peakUsage = Math.max(peakUsage, usageAtStep);
		}

		const ffdUsage = this.packFirstFitDecreasing(
			tensorSizes,
			firstUse,
			lastUse
		);

		// Parent tensors that are live at an IF/WHILE call stay allocated while
		// the child subgraph runs, so summing subgraph peaks is a safe upper bound.
		this.activationSize += Math.max(peakUsage, ffdUsage);
	}

	/**
	 * Place tensors largest-first at the lowest arena offset that does not
	 * overlap any already-placed tensor with an intersecting lifetime, in the
	 * same way as TFLM's greedy memory planner.
	 *
	 * @param tensorSizes - Aligned size of each non-constant tensor.
	 * @param firstUse - First operator index referencing each tensor.
	 * @param lastUse - Last operator index referencing each tensor.
	 * @returns Highest arena offset reached by any placed tensor.
	 */
	private packFirstFitDecreasing(
		tensorSizes: Map<number, number>,
		firstUse: Map<number, number>,
		lastUse: Map<number, number>
	): number {
		const intervals = Array.from(tensorSizes.entries())
			.filter(([, size]) => size > 0)
			.map(([tensorIdx, size]) => ({
				size,
				start: firstUse.get(tensorIdx) ?? 0,
				end: lastUse.get(tensorIdx) ?? firstUse.get(tensorIdx) ?? 0
			}))
			.sort((a, b) => b.size - a.size || a.start - b.start);

		const placed: {
			offset: number;
			size: number;
			start: number;
			end: number;
		}[] = [];
		let total = 0;

		for (const tensor of intervals) {
			// Lifetimes are inclusive: tensors sharing an operator are both live.
			const conflicts = placed
				.filter((p) => p.start <= tensor.end && tensor.start <= p.end)
				.sort((a, b) => a.offset - b.offset);

			let offset = 0;

			for (const p of conflicts) {
				if (offset + tensor.size <= p.offset) {
					break;
				}

				offset = Math.max(offset, p.offset + p.size);
			}

			placed.push({ ...tensor, offset });
			total = Math.max(total, offset + tensor.size);
		}

		return total;
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

	/**
	 * Estimate the TFLM tensor arena size.
	 *
	 * @returns Arena size in bytes.
	 */
	public arenaSize(): number {
		// Kernels such as CONV_2D request scratch buffers (e.g. im2col) in the
		// arena at Prepare() time. These are not graph tensors, so they cannot be
		// measured from the schema and have to be approximated.
		const scratchSize = Math.floor(
			this.maxWeightSize * SCRATCH_BUFFER_WEIGHT_FACTOR
		);
		const subtotal = this.activationSize + scratchSize;
		const arenaBudget = Math.floor(
			REFERENCE_RAM * ARENA_RAM_FRACTION
		);

		// Spend whatever RAM headroom is left on the safety margin, so small
		// models get more slack than large ones. Models that already exceed the
		// budget fall back to the minimum margin; reporting that they do not fit
		// is the caller's job, not this estimate's.
		const affordableMargin =
			subtotal > 0
				? (arenaBudget - ARENA_ALIGNMENT) / subtotal - 1
				: MAX_SAFETY_MARGIN;
		const safetyMargin = Math.max(
			MIN_SAFETY_MARGIN,
			Math.min(affordableMargin, MAX_SAFETY_MARGIN)
		);

		return Math.max(
			this.alignUp(Math.floor(subtotal * (1 + safetyMargin))),
			SMALL_MODEL_ARENA_FLOOR
		);
	}
}

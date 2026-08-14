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

const supportedOps = new Map<number, string>([
	[0, "Add"],
	[1, "AveragePool2D"],
	[2, "Concatenation"],
	[3, "Conv2D"],
	[4, "DepthwiseConv2D"],
	[5, "DepthToSpace"],
	[6, "Dequantize"],
	[7, "EmbeddingLookup"],
	[8, "Floor"],
	[9, "FullyConnected"],
	[11, "L2Normalization"],
	[12, "L2Pool2D"],
	[14, "Logistic"],
	[17, "MaxPool2D"],
	[18, "Mul"],
	[19, "Relu"],
	[21, "Relu6"],
	[22, "Reshape"],
	[23, "ResizeBilinear"],
	[25, "Softmax"],
	[26, "SpaceToDepth"],
	[27, "Svdf"],
	[28, "Tanh"],
	[34, "Pad"],
	[36, "Gather"],
	[37, "BatchToSpaceNd"],
	[38, "SpaceToBatchNd"],
	[39, "Transpose"],
	[40, "Mean"],
	[41, "Sub"],
	[42, "Div"],
	[43, "Squeeze"],
	[44, "UnidirectionalSequenceLSTM"],
	[45, "StridedSlice"],
	[47, "Exp"],
	[49, "Split"],
	[50, "LogSoftmax"],
	[53, "Cast"],
	[54, "Prelu"],
	[55, "Maximum"],
	[56, "ArgMax"],
	[57, "Minimum"],
	[58, "Less"],
	[59, "Neg"],
	[60, "PadV2"],
	[61, "Greater"],
	[62, "GreaterEqual"],
	[63, "LessEqual"],
	[65, "Slice"],
	[66, "Sin"],
	[67, "TransposeConv"],
	[70, "ExpandDims"],
	[71, "Equal"],
	[72, "NotEqual"],
	[73, "Log"],
	[74, "Sum"],
	[75, "Sqrt"],
	[76, "Rsqrt"],
	[77, "Shape"],
	[79, "ArgMin"],
	[82, "ReduceMax"],
	[83, "Pack"],
	[84, "LogicalOr"],
	[86, "LogicalAnd"],
	[87, "LogicalNot"],
	[88, "Unpack"],
	[89, "ReduceMin"],
	[90, "FloorDiv"],
	[92, "Square"],
	[93, "ZerosLike"],
	[94, "Fill"],
	[95, "FloorMod"],
	[97, "ResizeNearestNeighbor"],
	[98, "LeakyRelu"],
	[99, "SquaredDifference"],
	[100, "MirrorPad"],
	[101, "Abs"],
	[102, "SplitV"],
	[104, "Ceil"],
	[105, "ReverseV2"],
	[106, "AddN"],
	[107, "GatherNd"],
	[108, "Cos"],
	[111, "Elu"],
	[114, "Quantize"],
	[116, "Round"],
	[117, "HardSwish"],
	[118, "If"],
	[119, "While"],
	[123, "SelectV2"],
	[126, "BatchMatMul"],
	[128, "CumSum"],
	[129, "CallOnce"],
	[130, "BroadcastTo"],
	[142, "VarHandle"],
	[143, "ReadVariable"],
	[144, "AssignVariable"],
	[145, "BroadcastArgs"],
	[151, "DynamicUpdateSlice"]
]);

/**
 * Get operator name from opcode.
 *
 * @param i - Opcode from the TFLite model.
 * @returns The Add*() method suffix for the operator.
 */
export function getOpName(i: number): string {
	const name = supportedOps.get(i);

	if (!name) {
		throw new Error(
			`Operator code ${String(i)} is not supported by TFLM`
		);
	}

	return name;
}

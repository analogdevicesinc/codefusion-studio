# Copyright (c) 2025 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from pathlib import Path
from typing import ClassVar

from cfsai_tflite.schema.Model import Model


class OperatorInfo:
    """
    Operator information type.

    Attributes:
        op_names: List of operator names of interest.
    """
    op_names: ClassVar[list[str]] = [
        'Add',
        'AveragePool2D',
        'Concatenation',
        'Conv2D',
        'DepthwiseConv2D',
        'DepthToSpace',
        'Dequantize',
        'EmbeddingLookup',
        'Floor',
        'FullyConnected',
        'HashtableLookup',
        'L2Normalization',
        'L2Pool2D',
        'LocalResponseNormalization',
        'Logistic',
        'LshProjection',
        'Lstm',
        'MaxPool2D',
        'Mul',
        'Relu',
        'ReluN1To1',
        'Relu6',
        'Reshape',
        'ResizeBilinear',
        'Rnn',
        'Softmax',
        'SpaceToDepth',
        'Svdf',
        'Tanh',
        'ConcatEmbeddings',
        'SkipGram',
        'Call',
        'Custom',
        'EmbeddingLookupSparse',
        'Pad',
        'UnidirectionalSequenceRnn',
        'Gather',
        'BatchToSpaceNd',
        'SpaceToBatchNd',
        'Transpose',
        'Mean',
        'Sub',
        'Div',
        'Squeeze',
        'UnidirectionalSequenceLSTM',
        'StridedSlice',
        'BidirectionalSequenceRnn',
        'Exp',
        'TopkV2',
        'Split',
        'LogSoftmax',
        'Delegate',
        'BidirectionalSequenceLstm',
        'Cast',
        'Prelu',
        'Maximum',
        'ArgMax',
        'Minimum',
        'Less',
        'Neg',
        'PadV2',
        'Greater',
        'GreaterEqual',
        'LessEqual',
        'Select',
        'Slice',
        'Sin',
        'TransposeConv',
        'SparseToDense',
        'Tile',
        'ExpandDims',
        'Equal',
        'NotEqual',
        'Log',
        'Sum',
        'Sqrt',
        'Rsqrt',
        'Shape',
        'Pow',
        'ArgMin',
        'FakeQuant',
        'ReduceProd',
        'ReduceMax',
        'Pack',
        'LogicalOr',
        'OneHot',
        'LogicalAnd',
        'LogicalNot',
        'Unpack',
        'ReduceMin',
        'FloorDiv',
        'ReduceAny',
        'Square',
        'ZerosLike',
        'Fill',
        'FloorMod',
        'Range',
        'ResizeNearestNeighbor',
        'LeakyRelu',
        'SquaredDifference',
        'MirrorPad',
        'Abs',
        'SplitV',
        'Unique',
        'Ceil',
        'ReverseV2',
        'AddN',
        'GatherNd',
        'Cos',
        'Where',
        'Rank',
        'Elu',
        'ReverseSequence',
        'MatrixDiag',
        'Quantize',
        'MatrixSetDiag',
        'Round',
        'HardSwish',
        'If',
        'While'
        # 120-209 removed as not real operators
        ]
    @classmethod
    def get_op_name(cls, i:int) -> str:
        """
        Get operator name from integer.

        Args:
            i: Integer to convert to operator name.
        
        Returns:
            Operator name.
        """
        return cls.op_names[i] if i < len(cls.op_names) else 'unknown'


class TfliteInfo:
    """Class to manage tensorflow lite information."""
    def __init__(self, fname: Path) -> None:
        """
        Instializes a TfliteInfo.

        Args:
            fname: Path to the `tflite` file.
        """
        self.__ops: dict[str, int] = {}
        self.__summary: str = ''
        self.__graph: str = ''
        self.__num_inputs: int = 0
        self.__num_outputs: int = 0
        self.__num_tensors: int = 0

        # Open, parse and validate file
        with open(fname, 'rb') as f:
            b = f.read()

        # Check that file appears to be a valid model before parsing
        if b[4:8] != b'TFL3':
            raise ValueError(f'{fname} is not a valid TFLite file')
        model = Model.GetRootAsModel(b, 0)

        # Index of all operators used in model
        op_codes_length = model.OperatorCodesLength()
        op_codes = []
        for o in range(op_codes_length):
            code = model.OperatorCodes(o)
            op_codes.append(code)
            bcode = code.BuiltinCode()
            self.add_op(OperatorInfo.get_op_name(bcode))
        self.__num_ops = len(self.__ops)

        # Trawl num_tensors to count and report summary
        for i in range(model.SubgraphsLength()):
            subgraph = model.Subgraphs(i)
            name = subgraph.Name()
            name = name.decode('utf-8') if name else '(no name)'
            self.add_to_graph(f'Subgraph {i} "{name}": ' + \
                            f'Inputs: {subgraph.InputsLength()}, ' + \
                            f'Outputs: {subgraph.OutputsLength()}, ' + \
                            f'Operators: {subgraph.OperatorsLength()}, ' + \
                            f'Tensors: {subgraph.TensorsLength()}')


            num_graph_inputs = subgraph.InputsLength()
            self.add_inputs(num_graph_inputs)
            if num_graph_inputs:
                self.add_to_graph(f'  Inputs ({num_graph_inputs}):')
            for j in range(num_graph_inputs):
                index = subgraph.Inputs(j)
                tensor = subgraph.Tensors(index)
                shape = [tensor.Shape(k) for k in range(tensor.ShapeLength())]
                name = tensor.Name().decode('utf-8') if name else '(no name)'
                self.add_to_graph(f'    {j}: {name}: {shape}')

            num_graph_outputs = subgraph.OutputsLength()
            self.add_outputs(num_graph_outputs)
            if num_graph_outputs:
                self.add_to_graph(f'  Outputs ({num_graph_outputs}):')
            for j in range(num_graph_inputs):
                index = subgraph.Outputs(j)
                tensor = subgraph.Tensors(index)
                shape = [tensor.Shape(k) for k in range(tensor.ShapeLength())]
                name = tensor.Name().decode('utf-8') if name else '(no name)'
                self.add_to_graph(f'    {j}: {name}: {shape}')

            num_graph_ops = subgraph.OperatorsLength()
            graph_ops = {}
            self.add_to_graph(f'  Operators ({num_graph_ops}):')
            for j in range(num_graph_ops):
                op = subgraph.Operators(j)
                opcode = op_codes[op.OpcodeIndex()]
                bcode = opcode.BuiltinCode()
                name = OperatorInfo.get_op_name(bcode)
                # Only emit the first instance of an op for each subgraph
                if name not in graph_ops:
                    graph_ops[name] = 1
                    self.add_to_graph(f'    {j}: {name}')

            num_graph_tensors = subgraph.TensorsLength()
            self.add_to_graph(f'  Tensors ({num_graph_tensors}):')
            self.add_tensors(num_graph_tensors)
            for j in range(num_graph_tensors):
                tensor = subgraph.Tensors(j)
                name = tensor.Name()
                name = name.decode('utf-8') if name else '(no name)'
                self.add_to_graph(f'    {j}: {name}')

        # Update summary info
        self.add_to_summary(f'Inputs: {self.__num_inputs}')
        self.add_to_summary(f'Outputs: {self.__num_outputs}')
        self.add_to_summary(f'Tensors: {self.__num_tensors}')
        self.add_to_summary(f'Operators {self.__num_ops}:')
        for op in self.operators:
            self.add_to_summary(f'  {op}')


    def add_op(self, key: str) -> None:
        """
        Incrememnt the operator counter.

        Args:
            key: Operator name.
        """
        if key not in self.__ops:
            self.__ops[key] = 1

    def add_to_graph(self, s: str) -> None:
        """
        Add to the graph string summary.

        Args:
            s: String to append to the graph summary.
        """
        self.__graph += s + '\n'

    def add_to_summary(self, s:str) -> None:
        """
        Add to the string summary.

        Args:
            s: String to append to the summary.
        """
        self.__summary += s + '\n'

    def add_inputs(self, n:int) -> None:
        """
        Increment the number of graph inputs.

        Args:
            n: The number by which to increment the input count.
        """
        self.__num_inputs += n

    def add_outputs(self, n:int) -> None:
        """
        Increment the number of graph outputs.

        Args:
            n: The number by which to increment the output count.
        """
        self.__num_outputs += n

    def add_tensors(self, n:int) -> None:
        """
        Increment the number of graph tensors.

        Args:
            n: The number by which to increment the tesnor count.
        """
        self.__num_tensors += n

    @property
    def operators(self) -> list[str]:
        """
        Supported tflite operators.

        Returns:
            List of the supported names.
        """
        return list(self.__ops.keys())

    @property
    def graph(self) -> str:
        """
        Graph summary.

        Returns:
            String containing high level summary of graph information.
        """
        return self.__graph

    @property
    def num_tensors(self) -> int:
        """
        Number of tensors in the graph.

        Returns:
            Number of tensors in the graph.
        """
        return self.__num_tensors

    @property
    def num_operators(self) -> int:
        """
        Number of operators in the graph.

        Returns:
            Number of operators in the graph.
        """
        return self.__num_ops

    def get_resolver_code(self, n:str) -> str:
        """
        Builds the C tflite resolver code.

        Args:
            n: string to append the variable name.

        Returns:
            Operator resolve code.
        """
        text = f'TfLiteStatus adi_resolve_ops_{n} (tflite::MicroMutableOpResolver<{n.upper()}_NUM_OPERATORS>& resolver) {{\n' # noqa: E501
        for o in self.__ops:
            text += f'    TF_LITE_ENSURE_STATUS(resolver.Add{o}());\n'
        text += '    return kTfLiteOk;\n' + \
                '}\n'
        return text

    def get_resolver_prototype(self, n:str) -> str:
        """
        Builds the C tflite resolver prototype code.

        Args:
            n: string to append to the variable name.
        
        Returns:
            Operator resolver prototype code.
        """
        text = f'TfLiteStatus adi_resolve_ops_{n} (tflite::MicroMutableOpResolver<{n.upper()}_NUM_OPERATORS>& resolver);' # noqa: E501
        return text

    @property
    def summary(self) -> str:
        """
        Tflite model summary.

        Returns:
            Tflite model summary.
        """
        return self.__summary


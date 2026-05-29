# Copyright (c) 2025-2026 Analog Devices, Inc.
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
from cfsai_tflite.schema.SubGraph import SubGraph
from cfsai_tflite.schema.Tensor import Tensor
from cfsai_tflite.schema.TensorType import TensorType

TensorSizes = {
    TensorType.BOOL:    1,
    TensorType.INT8:    1,
    TensorType.UINT8:   1,
    TensorType.FLOAT16: 2,
    TensorType.INT16:   2,
    TensorType.UINT16:  2,
    TensorType.FLOAT32: 4,
    TensorType.INT32:   4,
    TensorType.UINT32:  4,
    TensorType.FLOAT64: 8,
    TensorType.INT64:   8,
    TensorType.UINT64:  8,
    TensorType.COMPLEX64: 8,
    TensorType.COMPLEX128: 16,
    #TensorType.STRING: Not supported in tflite-micro
}

def _tensor_const_length(model:Model, tensor:Tensor) -> int:
    # returns a length if tensor has a constant buffer.
    # returns 0 if variable
    is_variable = tensor.IsVariable()
    if not is_variable:
        buf_id = tensor.Buffer()
        if buf_id > 0:
            buf = model.Buffers(buf_id)
            if buf:
                return buf.DataLength()
    return 0

def _align_up(x: int, alignment: int = 16) -> int:
    return (x + (alignment - 1)) & ~(alignment - 1)

def _tensor_type_size(tensor:Tensor) -> int:
    type = tensor.Type()
    size = TensorSizes.get(type)
    if size is None:
        raise ValueError(f"Unsupported type {type} for tensor {tensor.Name()}")
    return size

def _tensor_num_elements(tensor:Tensor) -> int:
    n = 1
    rank = tensor.ShapeLength()
    # Note: a length of 0 indicates a scalar. 
    #       Don't treat it as a special case, as we'll run the loop
    #       0 times and return n=1 as expected. 
    for i in range(rank):
        dim = tensor.Shape(i)
        if dim < 1:
            # Dimensions can't be 0 or -ve in tflite-micro.
            raise ValueError(f'Unsupported dimension {dim} for tensor {tensor.Name()}')
        n *= dim
    return n

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
        self.__ops: set[str] = set()
        self.__summary: str = ''
        self.__graph: str = ''
        self.__num_inputs: int = 0
        self.__num_outputs: int = 0
        self.__num_tensors: int = 0
        self.__activation_size: int = 0
        self.__param_size: int = 0
        self.__input_width: list[int] = []
        self.__input_len: list[int] = []
        self.__output_width: list[int] = []
        self.__output_len: list[int] = []

        # Open, parse and validate file
        with open(fname, 'rb') as f:
            b = f.read()

        # Check that file appears to be a valid model before parsing
        if b[4:8] != b'TFL3':
            raise ValueError(f'{fname} is not a valid TFLite file')
        model = Model.GetRootAsModel(b, 0)

        # Index of all operators used in model
        op_codes_length = model.OperatorCodesLength()
        self.op_codes = []
        for o in range(op_codes_length):
            code = model.OperatorCodes(o)
            self.op_codes.append(code)
            # Use DeprecatedBuiltinCode() instead of BuiltinCode() for 
            # compatibility with older models. We only have enumerations for the
            # first 119 codes so a byte is sufficient. 
            bcode = code.DeprecatedBuiltinCode()
            self.add_op(OperatorInfo.get_op_name(bcode))
        self.__num_ops = len(self.__ops)

        # Trawl num_tensors to count and report summary
        for i in range(model.SubgraphsLength()):
            subgraph = model.Subgraphs(i)
            name = subgraph.Name()
            name = name.decode('utf-8') if name else '(no name)'
            subgraph_ops, num_subgraph_ops = self.get_subgraph_operators(subgraph)
            self.add_to_graph(f'Subgraph {i} "{name}": ' + \
                            f'Inputs: {subgraph.InputsLength()}, ' + \
                            f'Outputs: {subgraph.OutputsLength()}, ' + \
                            f'Operators: {num_subgraph_ops}, ' + \
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

            self.add_to_graph(f'  Operators ({num_subgraph_ops}):')
            j = 0
            for op in subgraph_ops:
                self.add_to_graph(f'    {j}: {op}')
                j = j + 1

            num_graph_tensors = subgraph.TensorsLength()
            self.add_to_graph(f'  Tensors ({num_graph_tensors}):')
            self.add_tensors(num_graph_tensors)
            for j in range(num_graph_tensors):
                tensor = subgraph.Tensors(j)
                name = tensor.Name()
                name = name.decode('utf-8') if name else '(no name)'
                self.add_to_graph(f'    {j}: {name}')

                # Attempt to calculate arena size
                const_size = _tensor_const_length(model, tensor)
                if const_size:
                    self.add_to_params(const_size)
                else:
                    self.add_tensor_to_arena(tensor)
 
        # Calculate input details from the first subgraphs input tensors
        sg = model.Subgraphs(0)
        for i in range(sg.InputsLength()):
            idx = sg.Inputs(i)
            tensor = sg.Tensors(idx)
            self.__input_width.append(_tensor_type_size(tensor))
            self.__input_len.append(_tensor_num_elements(tensor))

        # Calculate output details from the last subgraphs output tensors
        sg = model.Subgraphs(model.SubgraphsLength() - 1)
        for i in range(sg.OutputsLength()):
            idx = sg.Outputs(i)
            tensor = sg.Tensors(idx)
            self.__output_width.append(_tensor_type_size(tensor))
            self.__output_len.append(_tensor_num_elements(tensor))


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
        self.__ops.add(key)

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
            n: The number by which to increment the tensor count.
        """
        self.__num_tensors += n

    def add_to_params(self, n:int) -> None:
        """
        Increment the size required for the model params.

        Args:
            n: The number by which to increment the param count.
        """
        self.__param_size += n

    def add_tensor_to_arena(self, tensor:Tensor) -> None:
        """
        Increment the arena by the size of the tensor.

        Args:
            tensor: The tensor to be accounted for in the arena.
        """
        size = _tensor_num_elements(tensor) * _tensor_type_size(tensor)
        self.__activation_size += _align_up(size)

    @property
    def input_width(self) -> list[int]:
        """
        Input tensor element width in bytes.

        Returns:
            Width of each input element in bytes.
        """
        return self.__input_width

    @property
    def input_len(self) -> list[int]:
        """
        Input tensor number of elements.

        Returns:
           Number of elements in the input tensor.
        """
        return self.__input_len

    @property
    def output_width(self) -> list[int]:
        """
        Output tensor element width in bytes.

        Returns:
            Width of each output element in bytes.
        """
        return self.__output_width

    @property
    def output_len(self) -> list[int]:
        """
        Output tensor number of elements.

        Returns:
            Number of elements in the output tensor.
        """
        return self.__output_len

    @property
    def arena_size(self) -> int:
        """
        Arena Size.

        Returns:
            Estimated size of model arena (bytes).
        """
        error_margin = 2
        return (self.__activation_size + self.__param_size) * error_margin

    @property
    def operators(self) -> list[str]:
        """
        Supported tflite operators.

        Returns:
            List of the supported names.
        """
        return sorted(list(self.__ops))

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

    def get_subgraph_operators(self, subgraph: SubGraph) -> tuple[list[str], int]:
        """
        Get set of operators in the specified subgraph.

        Returns:
            Set of opcodes, number of opcodes
        """ 
        graph_ops = set()
        num_graph_ops = subgraph.OperatorsLength()
        for j in range(num_graph_ops):
            op = subgraph.Operators(j)
            opcode = self.op_codes[op.OpcodeIndex()]
            bcode = opcode.DeprecatedBuiltinCode()
            name = OperatorInfo.get_op_name(bcode)
            graph_ops.add(name)
        return sorted(graph_ops), len(graph_ops)

    def get_resolver_code(self, n:str) -> str:
        """
        Builds the C tflite resolver code.

        Args:
            n: string to append the variable name.

        Returns:
            Operator resolve code.
        """
        text = f'TfLiteStatus adi_resolve_ops_{n} (tflite::MicroMutableOpResolver<{n.upper()}_NUM_OPERATORS>& resolver) {{\n' # noqa: E501
        for o in self.operators:
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


"""
TensorFlow Lite Model Parser.

Provides comprehensive parsing and analysis of TensorFlow Lite models for 
hardware optimization and deployment planning. This module extracts detailed 
performance metrics, memory usage patterns, and computational requirements 
to support AI model optimization workflows.

Key Features:
- Layer-wise MAC (Multiply-Accumulate) operation counting
- Memory usage analysis (flash storage and runtime RAM)
- Tensor lifecycle tracking for memory optimization
- Hardware performance estimation and profiling
- Comprehensive model metadata extraction

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""

import logging
import os
from collections import defaultdict
from pathlib import Path
from typing import ClassVar

import numpy as np

from cfsai_model_parser.exceptions import (
    InvalidTensorType,
    ModelAnalysisError,
    ModelFileNotFoundError,
    ModelFormatNotSupportedError,
    ModelLoadError,
    ModelMACCalculationError,
    ModelMemoryCalculationError,
    ModelSubgraphError,
    SchemaError,
    TensorCalculationError,
)
from cfsai_model_parser.schemas import LayerDetail, ModelDetails, TensorLifecycle
from cfsai_tflite import schema as schema_fb


class TFLiteParser:
    """
    TensorFlow Lite model parser for comprehensive model analysis.
    
    This parser extracts detailed performance and resource utilization metrics
    from TensorFlow Lite models to support hardware deployment decisions and
    optimization strategies.
    
    Capabilities:
    - Operator-level MAC calculation for performance estimation
    - Memory footprint analysis for both storage and runtime requirements
    - Tensor lifecycle tracking to identify optimization opportunities
    - Cross-platform compatibility with standard TFLite schema
    
    Usage:
        >>> parser = TFLiteParser()
        >>> model_details = parser.parse_model("model.tflite")
        >>> print(f"Model requires {model_details.model_peak_ram_kb:.1f} KB RAM")
    """
    
    # Configuration constants
    _MIN_VALID_FILE_SIZE_BYTES: ClassVar[int] = 100  # Min size for valid TFLite file
    _BYTES_TO_KB_DIVISOR: ClassVar[int] = 1024
    _DEFAULT_TENSOR_SIZE_BYTES: ClassVar[int] = 4  # FLOAT32 size fallback
    _SUPPORTED_FILE_EXTENSIONS: ClassVar[list[str]] = ['.tflite', '.lite']
    
    # Magic byte patterns for TensorFlow Lite file validation
    _TFLITE_MAGIC_BYTES: ClassVar[list[bytes]] = [
        b'TFL3',           # TensorFlow Lite v3
        b'TOCO',           # TensorFlow Optimized Converter Output
        b'\x18\x00\x00\x00',  # FlatBuffer file identifier pattern
    ]
    
    # Standard TensorFlow Lite data type size mappings (bytes)
    _TENSOR_TYPE_SIZES: ClassVar[dict[str, int]] = {
        # Primary TFLM supported types
        'FLOAT32': 4,
        'INT32': 4,
        'UINT8': 1,
        'INT8': 1,
        'INT16': 2,
        'INT64': 8,
        'BOOL': 1,
        
        # Additional floating point types
        'FLOAT16': 2,
        'BFLOAT16': 2,
        'FLOAT64': 8,
        
        # Additional integer types
        'UINT16': 2,
        'UINT32': 4,
        'UINT64': 8,
        
        # Complex number types (limited TFLM support)
        'COMPLEX64': 8,   # Two FLOAT32 values (real + imaginary)
        'COMPLEX128': 16, # Two FLOAT64 values (real + imaginary)
        
        # String type (limited TFLM support)
        'STRING': 1,      # Variable length, 1 byte per character estimate
        
        # Resource and variant types (rarely used in TFLM)
        'RESOURCE': 8,    # Pointer/handle size
        'VARIANT': 8,     # Generic variant type
        
        # Special TFLite types
        'NONE': 0,        # No type/invalid
        'INT4': 1         # Provided in schema but not used.
    }
    
    def __init__(self) -> None:
        """
        Initialize the TensorFlow Lite model parser with dynamic analysis capabilities.
        
        Sets up the parser with:
        - TensorFlow Lite schema integration for model parsing
        - Logging system for comprehensive analysis tracking
        - Operator code mapping for human-readable operation names
        - Tensor type mapping for memory footprint calculations
        """
        self.schema_fb = schema_fb
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}"
        )
        self._opcode_map = self._build_opcode_map()
        self._tensor_type_map = self._build_tensor_type_map()
        self.logger.info(f"Initialized: {self.__class__.__name__}")

        
    def _build_opcode_map(self) -> dict[int, str]:
        """
        Build mapping from TFLite BuiltinOperator enum values to readable names.
        
        Creates a translation dictionary that converts numeric operator codes
        found in TFLite models to human-readable operation names for analysis
        and reporting purposes.
        
        Returns:
            Dictionary mapping operator enum values to string names
        """
        if not self.schema_fb:
            self.logger.warning("Schema module unavailable - opcode mapping disabled")
            raise SchemaError("opcode_mapping", "Schema module unavailable")

        opcode_map = {}
        try:
            # Extract all operator definitions from the TFLite schema
            for attr_name in dir(self.schema_fb.BuiltinOperator):
                if not attr_name.startswith("__"):
                    enum_value = getattr(self.schema_fb.BuiltinOperator, attr_name)
                    opcode_map[enum_value] = attr_name
        except Exception as e:
            raise SchemaError("opcode_mapping", str(e))
            
        return opcode_map
    
    def _build_tensor_type_map(self) -> dict[int, int]:
        """
        Build mapping from TFLite TensorType enum values to byte sizes.
        
        Creates a lookup table for converting TensorFlow Lite's internal
        tensor type representations to their corresponding memory footprint
        in bytes per element.
        
        Returns:
            Dictionary mapping tensor type enum values to byte sizes
            
        Note:
            Unsupported tensor types are logged and skipped rather than
            causing the entire mapping to fail.
        """
        if not self.schema_fb:
            self.logger.warning("Schema module unavailable - tensor type mapping " \
            "disabled")
            return {}
            
        type_map = {}
        unsupported_types = []
        
        # Map each tensor type to its memory footprint
        for attr_name in dir(self.schema_fb.TensorType):
            if (
                not attr_name.startswith("__")
                and hasattr(self.schema_fb.TensorType, attr_name)
            ):
                enum_value = getattr(self.schema_fb.TensorType, attr_name)
                if isinstance(enum_value, int):
                    byte_size = self._TENSOR_TYPE_SIZES.get(attr_name.upper(), 0)
                    if byte_size > 0:
                        type_map[enum_value] = byte_size
                        self.logger.debug(
                            f"Mapped tensor type {attr_name} "
                            f"(enum={enum_value}) to {byte_size} bytes"
                        )
                    else:
                        # Log unsupported types but continue processing
                        unsupported_types.append(attr_name)
                        self.logger.debug(f"Skipping unsupported tensor type: "
                                            f"{attr_name}")
                        
        # Log summary of unsupported types
        if unsupported_types:
            self.logger.warning(f"Unsupported tensor data types: "
                               f"{', '.join(unsupported_types)}")
                
        self.logger.info(f"Built tensor type mapping with {len(type_map)} "
                        f"supported types")
        return type_map
    
    def get_tensor_size_bytes(self, tensor_type: int) -> int:
        """
        Get memory footprint in bytes for a TensorFlow Lite tensor type.
        
        Args:
            tensor_type: TensorFlow Lite tensor type enum value
            
        Returns:
            Size in bytes per tensor element, or default size for unknown types
        """
        tensor_size_bytes = self._tensor_type_map.get(tensor_type, 0)
        
        if tensor_size_bytes == 0:
            default_size = self._DEFAULT_TENSOR_SIZE_BYTES
            self.logger.warning(f"Unknown tensor type {tensor_type}, "
                                f"defaulting to {default_size} bytes")
            return default_size  # Default to FLOAT32 size
        
        return tensor_size_bytes

    def parse_model(self, model_path: str) -> ModelDetails:
        """
        Parse a TensorFlow Lite model and extract comprehensive analysis.
        
        Performs complete analysis of the model including layer-wise performance
        metrics, memory requirements, and optimization opportunities. This is the
        primary entry point for model parsing workflows.
        
        Args:
            model_path: Path to the TensorFlow Lite model file
            
        Returns:
            ModelDetails object containing comprehensive model analysis
            
        Raises:
            ModelFileNotFoundError: If the model file does not exist
            ModelSubgraphError: If the model contains no computational graphs
            ModelAnalysisError: If analysis fails due to model structure issues
        """
        model_path = str(Path(model_path).resolve())

        # Validate model file
        self._validate_model(Path(model_path))

        # Load and validate model structure
        model = self.load_model(model_path)
        if model.SubgraphsLength() == 0:
            raise ModelSubgraphError()
        elif model.SubgraphsLength() > 1:
            self.logger.warning("Model contains multiple subgraphs, only the first " \
            "will be analyzed")

        # Analyze the primary computational graph (subgraph 0)
        subgraph = model.Subgraphs(0)
        return self._analyze_subgraph(model_path, model, subgraph)

    def load_model(self, model_path: str) -> object:
        """
        Load and parse a TensorFlow Lite model file.
        
        Args:
            model_path: Path to the .tflite model file
            
        Returns:
            Parsed TensorFlow Lite model object
            
        Raises:
            ModelLoadError: If the model file cannot be read or parsed
        """
        try:
            with open(model_path, 'rb') as f:
                model_buffer = f.read()
                model = self.schema_fb.Model.GetRootAsModel(model_buffer, 0)
            return model
        except Exception as e:
            raise ModelLoadError(model_path, str(e))

    def _validate_model(self, model_path: Path) -> None:
        """
        Perform comprehensive validation of TensorFlow Lite model file.
        
        Validates the model file through multiple layers of verification to ensure
        it's a valid TensorFlow Lite model before attempting to parse it. This
        prevents downstream parsing errors and provides clear diagnostic messages
        for invalid model files.
        
        Validation Steps:
        1. File existence and accessibility checks
        2. File size validation (minimum file size requirement for valid TFLite)
        3. File extension verification (.tflite or .lite)
        4. Magic byte validation for FlatBuffer format detection
        
        Args:
            model_path: Path object pointing to the TensorFlow Lite model file
            
        Raises:
            ModelFileNotFoundError: If the file doesn't exist or isn't a regular file
            ModelFormatNotSupportedError: If file size, extension, or format is invalid
            
        Note:
            Magic byte validation failures are logged as warnings rather than errors
            to accommodate edge cases with valid but non-standard TFLite files.
        """
        if not model_path.exists():
            raise ModelFileNotFoundError(f"Model file not found: {model_path}")

        if not model_path.is_file():
            raise ModelFileNotFoundError(f"Path is not a file: {model_path}")

        # Check file size
        file_size = model_path.stat().st_size
        if file_size < self._MIN_VALID_FILE_SIZE_BYTES:
            raise ModelFormatNotSupportedError(
                f"File too small to be a valid TFLite model: {file_size} bytes "
                f"(minimum: {self._MIN_VALID_FILE_SIZE_BYTES} bytes)"
            )

        # Check file extension
        if model_path.suffix.lower() not in self._SUPPORTED_FILE_EXTENSIONS:
            supported_exts = ', '.join(self._SUPPORTED_FILE_EXTENSIONS)
            conversion_suggestion = self._get_conversion_suggestion(
                model_path.suffix.lower()
            )
            self.logger.warning(
                f"Unsupported file extension: {model_path.suffix}. "
                f"Expected: {supported_exts}\n\n"
                f"{conversion_suggestion}"   
            )

            raise ModelFormatNotSupportedError(
                f"Unsupported file extension: {model_path.suffix}. "
                f"Expected: {supported_exts}\n\n"
                f"{conversion_suggestion}"
            )

        try:
            # Check file magic bytes for TFLite flatbuffer (optional validation)
            with open(model_path, "rb") as f:
                magic_bytes = f.read(8)  # Read more bytes to be thorough

            # More flexible check - look for any known pattern
            is_valid_magic = any(
                magic_bytes[4:8].startswith(expected) 
                for expected in self._TFLITE_MAGIC_BYTES
            )

            if not is_valid_magic:
                raise ModelFormatNotSupportedError(
                    f"File does not have correct magic bytes: {magic_bytes[4:8]}"
                )
            else:
                self.logger.debug(
                    f"Valid TFLite magic bytes detected: {magic_bytes[4:8]}"
                )
        except Exception as e:
            raise ModelLoadError(model_path, str(e))

    def _get_conversion_suggestion(self, file_extension: str) -> str:
        """
        Get conversion suggestions for unsupported model formats.
        
        Provides helpful guidance on converting various model formats to TensorFlow Lite
        using open source tools and libraries.
        
        Args:
            file_extension: The unsupported file extension (e.g., '.h5', '.pb')
            
        Returns:
            Detailed conversion instructions with example commands
        """
        conversion_guides = {
            '.h5': (
                "Convert Keras/HDF5 model to TensorFlow Lite:\n\n"
                "   import tensorflow as tf\n"
                "   model = tf.keras.models.load_model('model.h5')\n"
                "   converter = tf.lite.TFLiteConverter.from_keras_model(model)\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: https://tensorflow.org/lite/convert"
            ),
            '.pb': (
                "Convert TensorFlow SavedModel (.pb) to TensorFlow Lite:\n\n"
                "   import tensorflow as tf\n"
                "   converter = tf.lite.TFLiteConverter.from_saved_model(\n"
                "       'model_dir/'\n"
                "   )\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: "
                "https://tensorflow.org/lite/convert/concrete_function"
            ),
            '.onnx': (
                "Convert ONNX model to TensorFlow Lite:\n\n"
                "   Step 1: Install onnx-tensorflow\n"
                "   pip install onnx-tensorflow\n\n"
                "   Step 2: Convert ONNX to TensorFlow Lite\n"
                "   import onnx\n"
                "   import tensorflow as tf\n"
                "   from onnx_tf.backend import prepare\n\n"
                "   onnx_model = onnx.load('model.onnx')\n"
                "   tf_rep = prepare(onnx_model)\n"
                "   tf_rep.export_graph('tf_model')\n\n"
                "   converter = tf.lite.TFLiteConverter.from_saved_model('tf_model')\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: https://github.com/onnx/onnx-tensorflow"
            ),
            '.pth': (
                "Convert PyTorch model to TensorFlow Lite:\n\n"
                "   Step 1: Install conversion tools\n"
                "   pip install torch onnx onnx-tensorflow\n\n"
                "   Step 2: Convert PyTorch to TensorFlow Lite\n"
                "   import torch\n"
                "   import onnx\n"
                "   import tensorflow as tf\n"
                "   from onnx_tf.backend import prepare\n\n"
                "   model = torch.load('model.pth')\n"
                "   dummy_input = torch.randn(1, 3, 224, 224)  # Adjust input shape\n"
                "   torch.onnx.export(model, dummy_input, 'model.onnx')\n\n"
                "   onnx_model = onnx.load('model.onnx')\n"
                "   tf_rep = prepare(onnx_model)\n"
                "   tf_rep.export_graph('tf_model')\n\n"
                "   converter = tf.lite.TFLiteConverter.from_saved_model('tf_model')\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: "
                "https://pytorch.org/tutorials/advanced/"
                "super_resolution_with_onnxruntime.html"
            ),
            '.pkl': (
                "Convert Pickle/Scikit-learn model to TensorFlow Lite:\n\n"
                "   Step 1: Install conversion tools\n"
                "   pip install skl2onnx onnx-tensorflow\n\n"
                "   Step 2: Convert scikit-learn to TensorFlow Lite\n"
                "   import pickle\n"
                "   import onnx\n"
                "   import tensorflow as tf\n"
                "   from skl2onnx import convert_sklearn\n"
                "   from skl2onnx.common.data_types import FloatTensorType\n"
                "   from onnx_tf.backend import prepare\n\n"
                "   with open('model.pkl', 'rb') as f:\n"
                "       sklearn_model = pickle.load(f)\n\n"
                "   # Convert to ONNX (adjust input shape as needed)\n"
                "   initial_type = [('float_input', FloatTensorType([None, 4]))]\n"
                "   onnx_model = convert_sklearn(\n"
                "       sklearn_model, initial_types=initial_type\n"
                "   )\n\n"
                "   # Convert ONNX to TFLite\n"
                "   tf_rep = prepare(onnx_model)\n"
                "   tf_rep.export_graph('tf_model')\n"
                "   converter = tf.lite.TFLiteConverter.from_saved_model('tf_model')\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: https://github.com/onnx/sklearn-onnx"
            ),
            '.joblib': (
                "Convert Joblib/Scikit-learn model to TensorFlow Lite:\n\n"
                "   Step 1: Install conversion tools\n"
                "   pip install joblib skl2onnx onnx-tensorflow\n\n"
                "   Step 2: Load model and convert\n"
                "   import joblib\n"
                "   sklearn_model = joblib.load('model.joblib')\n"
                "   # Follow the same conversion steps as shown for .pkl files\n\n"
                "   Documentation: https://github.com/onnx/sklearn-onnx"
            ),
            '.mlmodel': (
                "Convert Core ML model to TensorFlow Lite:\n\n"
                "   Step 1: Install conversion tools\n"
                "   pip install coremltools tensorflow\n\n"
                "   Step 2: Convert Core ML to TensorFlow Lite\n"
                "   import coremltools as ct\n"
                "   import tensorflow as tf\n\n"
                "   model = ct.models.MLModel('model.mlmodel')\n"
                "   tf_model = ct.converters.convert(\n"
                "       model, source='coreml', target='tensorflow'\n"
                "   )\n"
                "   tf_model.save('tf_model')\n\n"
                "   converter = tf.lite.TFLiteConverter.from_saved_model('tf_model')\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: https://apple.github.io/coremltools/"
            ),
            '.json': (
                "Convert Keras JSON model to TensorFlow Lite:\n\n"
                "   Note: Requires separate .json architecture and .h5 weights "
                "files\n\n"
                "   import tensorflow as tf\n"
                "   from tensorflow.keras.models import model_from_json\n\n"
                "   with open('model.json', 'r') as f:\n"
                "       model_json = f.read()\n"
                "   model = model_from_json(model_json)\n"
                "   model.load_weights('weights.h5')  # Load corresponding weights\n\n"
                "   converter = tf.lite.TFLiteConverter.from_keras_model(model)\n"
                "   tflite_model = converter.convert()\n"
                "   with open('model.tflite', 'wb') as f:\n"
                "       f.write(tflite_model)\n\n"
                "   Documentation: "
                "https://tensorflow.org/guide/keras/save_and_serialize"
            )
        }
        
        # Return specific conversion guide or generic advice
        if file_extension in conversion_guides:
            return conversion_guides[file_extension]
        else:
            return (
                f"No specific conversion guide available for "
                f"'{file_extension}' files.\n\n"
                "General conversion approaches:\n"
                "   1. Check if your framework has TensorFlow Lite export "
                "functionality\n"
                "   2. Convert to ONNX first, then ONNX to TensorFlow to TFLite\n"
                "   3. Use framework-specific converters:\n"
                "      - TensorFlow/Keras: tf.lite.TFLiteConverter\n"
                "      - PyTorch: torch.onnx.export + onnx-tensorflow\n"
                "      - Scikit-learn: skl2onnx + onnx-tensorflow\n"
                "      - Core ML: coremltools\n\n"
                "   Documentation:\n"
                "   TensorFlow Lite Converter Guide: "
                "https://tensorflow.org/lite/convert\n"
                "   ONNX Ecosystem: https://onnx.ai/supported-tools.html"
            )

    def _analyze_subgraph(self, model_path: str, model: object, subgraph: object) -> \
        ModelDetails:
        """
        Perform comprehensive analysis of a TensorFlow Lite subgraph.
        
        Extracts detailed performance metrics, memory usage patterns, and
        computational requirements for each layer in the model.
        
        Args:
            model_path: Path to the original model file
            model: Loaded TensorFlow Lite model object
            subgraph: Specific subgraph to analyze
            
        Returns:
            ModelDetails object with complete analysis results
            
        Raises:
            InvalidTensorType: If unsupported tensor types are encountered
            ModelAnalysisError: If analysis fails due to structural issues
            ModelMACCalculationError: If MAC calculation fails for operators
            TensorCalculationError: If tensor parameter calculations fail
            SchemaError: If TensorFlow Lite schema access fails
        """
        try:
            # Extract fundamental model characteristics
            parameter_indices = self.extract_parameter_tensors(subgraph)
            tensor_lifespans = self.analyze_tensor_lifespans(subgraph)
            model_dtype = self.determine_model_dtype(subgraph)
            
            # Validate and get data type size for memory calculations
            dtype_size = self._TENSOR_TYPE_SIZES.get(model_dtype.upper(), 0)
            if dtype_size == 0:
                raise InvalidTensorType(model_dtype)
            
            # Initialize performance tracking variables
            peak_ram_usage_b = 0
            execution_schedule = []
            layer_details = []
            total_macs = np.int64(0)
            
            # Analyze each operator in the computational graph
            for op_idx in range(subgraph.OperatorsLength()):
                operator = subgraph.Operators(op_idx)
                
                # Extract operator identification and type information
                opcode_index = operator.OpcodeIndex()
                op_code = model.OperatorCodes(opcode_index)
                builtin_code = op_code.BuiltinCode()
                op_name = self._opcode_map.get(
                    builtin_code, 
                    f'UNKNOWN_{builtin_code}'
                )
                
                # Calculate memory utilization at this execution step
                memory_stats = self._calculate_memory_at_step(
                    op_idx, tensor_lifespans, subgraph, dtype_size
                )
                
                # Track peak memory usage for sizing requirements
                peak_ram_usage_b = max(peak_ram_usage_b, memory_stats['current_ram'])
                execution_schedule.append({
                    'memory_b': memory_stats['current_ram']
                })
                
                # Calculate computational complexity metrics
                op_macs = self._compute_macs_for_operator(op_name, operator, subgraph)
                total_macs += op_macs
                
                # Calculate storage and runtime memory requirements
                layer_flash_kb, kernel_shapes = self._calculate_layer_memory(
                    operator, subgraph, parameter_indices
                )
                
                layer_ram_kb = self._calculate_layer_ram(
                    operator, subgraph, dtype_size
                )
                
                # Compile comprehensive layer analysis           
                layer_details.append(
                    LayerDetail(
                    index=op_idx,
                    name=op_name,
                    macs=op_macs,
                    flash_kb=layer_flash_kb,
                    kernel_tensors=kernel_shapes,
                    ram_kb=layer_ram_kb,
                    input_tensors=list(operator.InputsAsNumpy()),
                    output_tensors=list(operator.OutputsAsNumpy()),
                    lifecycle=TensorLifecycle(
                        new=len(operator.OutputsAsNumpy()),
                        live=memory_stats['live_tensors'],
                        terminated=memory_stats['terminated_tensors']
                        )
                    )   
                 )
            
            # Calculate total model storage requirements
            total_flash_memory_b = self.calculate_total_param_size(
                subgraph, parameter_indices
            )
            
            # Extract model metadata and file information
            model_name = self._extract_model_name(model, model_path)
            file_size_kb = self._calculate_file_size(model_path)
            
            # Compile comprehensive model analysis results
            return ModelDetails(
                model_name=model_name,
                model_path=model_path,
                layer_details=layer_details,
                model_peak_ram_kb=peak_ram_usage_b / self._BYTES_TO_KB_DIVISOR,
                execution_schedule=execution_schedule,
                model_total_param_memory_b=total_flash_memory_b,
                target_dtype=model_dtype,
                total_macs=total_macs,
                layer_count=len(layer_details),
                model_size_on_disk_kb=file_size_kb,
                errors='',
                framework='TensorFlow Lite'
            )
            
        except (ModelMemoryCalculationError, ModelMACCalculationError, 
                InvalidTensorType, TensorCalculationError, SchemaError):
            # Re-raise specific model parser errors to preserve detailed error context
            raise
        except Exception as e:
            raise ModelAnalysisError("subgraph analysis", str(e))

    def _extract_model_name(self, model: object, model_path: str) -> str:
        """
        Extract model name from metadata or derive from filename.
        
        Attempts to retrieve the model's description from its metadata first,
        falling back to the filename if no description is available.
        
        Args:
            model: Loaded TensorFlow Lite model object
            model_path: Path to the original model file
            
        Returns:
            Model name string, either from metadata or filename stem
        """
        try:
            if hasattr(model, 'Description') and model.Description():
                return model.Description().decode('utf-8')
        except Exception:
            self.logger.warning("Could not find model description")
        return Path(model_path).stem

    def _calculate_file_size(self, model_path: str) -> float:
        """
        Calculate model file size in kilobytes.
        
        Determines the disk storage size of the model file for resource
        planning and optimization analysis.
        
        Args:
            model_path: Path to the model file
            
        Returns:
            File size in kilobytes, or 0.0 if size cannot be determined
        """
        try:
            return os.path.getsize(model_path) / self._BYTES_TO_KB_DIVISOR
        except OSError:
            self.logger.warning(f"Could not determine file size for {model_path}")
            return 0.0

    def _calculate_memory_at_step(
        self,
        op_idx: int,
        tensor_lifespans: dict[int, dict[str, int]],
        subgraph: object,
        dtype_size: int
    ) -> dict[str, int]:
        """
        Calculate memory utilization statistics at a specific execution step.
        
        Analyzes which tensors are active (live) at each point in the execution
        schedule to determine peak memory requirements and optimization opportunities.
        
        Args:
            op_idx: Current operator index in execution sequence
            tensor_lifespans: Mapping of tensor lifecycles
            subgraph: TensorFlow Lite subgraph object
            dtype_size: Size in bytes of the model's primary data type
            
        Returns:
            Dictionary containing memory statistics:
            - live_tensors: Number of active tensors
            - current_ram: Total RAM usage in bytes
            - terminated_tensors: Number of tensors freed at this step
            
        Raises:
            ModelMemoryCalculationError: If memory calculation fails
        """
        try:
            live_tensors = 0
            current_ram = 0
            terminated_tensors = 0
            
            for tensor_idx, lifespan in tensor_lifespans.items():
                # Check if tensor is active during this execution step
                if lifespan['birth'] <= op_idx <= lifespan['death']:
                    live_tensors += 1
                    try:
                        tensor = subgraph.Tensors(tensor_idx)
                        shape = tensor.ShapeAsNumpy()
                        current_ram += int(np.prod(shape) * dtype_size)
                    except Exception as e:
                        raise TensorCalculationError(tensor_idx, "memory_calculation", 
                                                     str(e))
                # Track tensor deallocation for memory optimization analysis
                if lifespan['death'] == op_idx:
                    terminated_tensors += 1
            
            return {
                'live_tensors': live_tensors,
                'current_ram': current_ram,
                'terminated_tensors': terminated_tensors
            }
        except Exception as e:
            raise ModelMemoryCalculationError(f"step {op_idx}", str(e))

    def _calculate_layer_memory(
        self,
        operator: object,
        subgraph: object,
        parameter_indices: set[int]
    ) -> tuple[float, list[list[int]]]:
        """
        Calculate flash memory requirements and kernel shapes for a layer.
        
        Analyzes the storage requirements for model parameters (weights, biases)
        associated with the current layer.
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            parameter_indices: Set of tensor indices containing model parameters
            
        Returns:
            Tuple containing:
            - Flash memory usage in kilobytes
            - List of kernel tensor shapes
            
        Raises:
            ModelMemoryCalculationError: If memory calculation fails
        """
        try:
            layer_flash_bytes = 0
            kernel_shapes = []
            
            # Analyze each input tensor to identify parameters
            for tensor_idx in operator.InputsAsNumpy():
                if tensor_idx in parameter_indices:
                    try:
                        tensor = subgraph.Tensors(tensor_idx)
                        shape = tensor.ShapeAsNumpy()
                        tensor_type = tensor.Type()
                        type_size = self.get_tensor_size_bytes(tensor_type)
                        
                        # Accumulate parameter storage requirements
                        layer_flash_bytes += int(np.prod(shape) * type_size)
                        kernel_shapes.append(shape.tolist())
                        
                    except Exception as e:
                        self.logger.debug(f"Failed to process parameter tensor \
                                     {tensor_idx}: {e}")
            
            return layer_flash_bytes / self._BYTES_TO_KB_DIVISOR, kernel_shapes
            
        except Exception as e:
            raise ModelMemoryCalculationError("layer memory", str(e))

    def _calculate_layer_ram(
        self,
        operator: object,
        subgraph: object,
        dtype_size: int
    ) -> float:
        """
        Calculate runtime RAM requirements for layer outputs.
        
        Determines the memory footprint of tensors produced by this layer
        during inference execution.
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            dtype_size: Size in bytes of the model's primary data type
            
        Returns:
            RAM usage in kilobytes for layer outputs
            
        Raises:
            ModelMemoryCalculationError: If RAM calculation fails
        """
        try:
            layer_ram_bytes = 0
            
            # Calculate memory footprint of all output tensors
            for tensor_idx in operator.OutputsAsNumpy():
                try:
                    tensor = subgraph.Tensors(tensor_idx)
                    shape = tensor.ShapeAsNumpy()
                    layer_ram_bytes += int(np.prod(shape) * dtype_size)
                except Exception as e:
                    self.logger.debug(f"Failed to calculate RAM for output tensor \
                                 {tensor_idx}: {e}")
            
            return layer_ram_bytes / self._BYTES_TO_KB_DIVISOR
            
        except Exception as e:
            raise ModelMemoryCalculationError("layer RAM", str(e))

    def estimate_operator_macs(
        self,
        opcode: str,
        operator: object,
        subgraph: object
    ) -> int:
        """
        Calculate multiply-accumulate operations for a TensorFlow Lite operator.
        
        Estimates computational complexity by counting the number of MAC operations
        required for the given operator type and tensor dimensions.
        
        Args:
            opcode: Operator name (e.g., 'CONV_2D', 'FULLY_CONNECTED')
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Estimated number of MAC operations
        """
        try:
            # Get input/output tensor information
            input_shapes = self._get_tensor_shapes(operator.InputsAsNumpy(), subgraph)
            output_shapes = self._get_tensor_shapes(operator.OutputsAsNumpy(), subgraph)
            
            # Dynamic MAC calculation based on tensor analysis
            if self._has_weight_tensors(operator, subgraph):
                return self._calculate_weighted_operation_macs(operator, subgraph)
            elif self._shapes_differ_in_values(input_shapes, output_shapes):
                return self._calculate_transformation_macs(input_shapes, output_shapes)
            elif self._is_pure_data_movement(input_shapes, output_shapes):
                return 0  # No computation, just data reorganization
            else:
                # Default: fallback to output-based MAC estimation to avoid recursion
                return self._estimate_macs_from_output(operator, subgraph)
                
        except Exception as e:
            # Log warning but don't raise exception for estimation fallback
            self.logger.warning(f"Dynamic MAC calculation failed for {opcode}: {e}")
            return 0
        
    def _shapes_differ_in_values(self, input_shapes: list, output_shapes: list) -> bool:
        """
        Check if operation changes tensor dimensions (indicates computation).
        
        Analyzes input and output tensor dimensions to determine if the operation
        involves significant computation (size changes) or is primarily data movement.
        
        Args:
            input_shapes: List of input tensor shapes
            output_shapes: List of output tensor shapes
            
        Returns:
            True if tensor sizes differ significantly, indicating computation
        """
        if not input_shapes or not output_shapes:
            return False
        
        input_size = sum(np.prod(shape) for shape in input_shapes)
        output_size = sum(np.prod(shape) for shape in output_shapes)
        
        # If sizes differ significantly, likely involves computation
        return abs(input_size - output_size) > 0.1 * max(input_size, output_size)

    def _compute_macs_for_operator(
        self,
        opcode: str,
        operator: object,
        subgraph: object
    ) -> int:
        """
        Compute MAC operations for specific operator types.
        
        Implements operator-specific MAC calculation algorithms based on
        tensor dimensions and operation characteristics.
        
        Args:
            opcode: Normalized operator name
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Number of MAC operations for this operator
        """
        try:
            # Route to specialized MAC calculation methods
            if opcode == 'CONV_2D':
                return self._calculate_conv2d_macs(operator, subgraph)
            elif opcode == 'DEPTHWISE_CONV_2D':
                return self._calculate_depthwise_conv_macs(operator, subgraph)
            elif opcode == 'FULLY_CONNECTED':
                return self._calculate_fc_macs(operator, subgraph)
            else:
                # Fallback estimation for other operators
                return self._estimate_macs_from_output(operator, subgraph)
                
        except Exception as e:
            raise ModelMACCalculationError(opcode, str(e))

    def _calculate_conv2d_macs(self, operator: object, subgraph: object) -> int:
        """
        Calculate MAC operations for 2D convolution layers.
        
        Computes multiply-accumulate operations for standard 2D convolution
        based on output spatial dimensions, channel counts, and kernel size.
        
        Args:
            operator: TensorFlow Lite operator object for the convolution
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Number of MAC operations for the convolution layer
            
        Note:
            This implementation assumes NHWC format for tensors and does not include
            batch size considerations.
        """
        # Validate operator has required inputs and outputs
        if operator.InputsLength() < 2 or operator.OutputsLength() < 1:
            raise ModelAnalysisError("conv2d_macs",
                                      "Insufficient operator inputs/outputs")
            
        weights_tensor = subgraph.Tensors(operator.Inputs(1))
        output_tensor = subgraph.Tensors(operator.Outputs(0))
        
        output_shape = output_tensor.ShapeAsNumpy()
        weights_shape = weights_tensor.ShapeAsNumpy()
        
        # Validate shapes have expected dimensions for NHWC format
        if len(output_shape) < 4 or len(weights_shape) < 4:
            raise ModelAnalysisError("conv2d_macs",
                                      "Unexpected tensor shape dimensions")
        
        # For 2D convolution in tflite format: weights shape = [output_channels, 
        # kernel_height, kernel_width, input_channels]
        # output tensor shape = [batch, out height, out width, out channels]
        # MACs = output height * output width * output channels *
        #        kernel height * kernel width * input channels
        output_spatial_size = int(np.prod(output_shape[1:3]))  # height * width
        output_channels = output_shape[3]
        kernel_volume = int(np.prod(weights_shape[1:3]))  # kernel height * kernel width
        input_channels = weights_shape[3]
    
        return output_spatial_size * output_channels * kernel_volume * input_channels
    
    def _calculate_depthwise_conv_macs(self, operator: object, subgraph: object) -> int:
        """
        Calculate MAC operations for depthwise convolution layers.
        
        Computes multiply-accumulate operations for depthwise separable convolution
        where each input channel is processed independently with its own kernel.
        
        Args:
            operator: TensorFlow Lite operator object for the depthwise convolution
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Number of MAC operations for the depthwise convolution layer
            
        Note:
            Assuming TFLM uses NHWC data format for depthwise conv layers.
            Output tensor shape: [batch, out height, out width, out channels]
            This code does not account for batch size in MAC calculation.
        """
        # Validate operator has required inputs and outputs
        if operator.InputsLength() < 2 or operator.OutputsLength() < 1:
            raise ModelAnalysisError("depthwise_conv_macs",
                                      "Insufficient operator inputs/outputs")
            
        weights_tensor = subgraph.Tensors(operator.Inputs(1))
        output_tensor = subgraph.Tensors(operator.Outputs(0))
        
        output_shape = output_tensor.ShapeAsNumpy()
        weights_shape = weights_tensor.ShapeAsNumpy()
        
        # Validate shapes have expected dimensions
        if len(output_shape) == 0 or len(weights_shape) < 3:
            raise ModelAnalysisError("depthwise_conv_macs",
                                      "Unexpected tensor shape dimensions")
            
        # For 2D convolution in tflite format: weights shape = [output_channels, 
        # kernel_height, kernel_width, input_channels]
        # MACs = output elements * spatial kernel size (no cross-channel mixing)
        return int(np.prod(output_shape) * np.prod(weights_shape[1:3]))
    
    def _calculate_fc_macs(self, operator: object, subgraph: object) -> int:
        """
        Calculate MAC operations for fully connected layers.
        
        Computes multiply-accumulate operations for dense/fully connected layers
        based on the weight matrix dimensions.
        
        Args:
            operator: TensorFlow Lite operator object for the fully connected layer
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Number of MAC operations for the fully connected layer
            
        Note:
            This code assumes a standard dense layer without batching.
        """
        # Validate operator has required inputs
        if operator.InputsLength() < 2:
            raise ModelAnalysisError("fc_macs", "Insufficient operator inputs")
            
        weights_tensor = subgraph.Tensors(operator.Inputs(1))
        weights_shape = weights_tensor.ShapeAsNumpy()
        
        # Validate shape is valid
        if len(weights_shape) == 0:
            raise ModelAnalysisError("fc_macs", "Invalid weights tensor shape")
            
        # MACs = input size * output size
        return int(np.prod(weights_shape))
    
    def _calculate_elementwise_macs(self, operator: object, subgraph: object) -> int:
        """
        Calculate MAC operations for element-wise operations.
        
        Estimates computational complexity for operations that process tensors
        element-by-element (e.g., activations, element-wise math operations).
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Number of MAC operations (one per output element)
        """
        # Validate operator has outputs
        if operator.OutputsLength() < 1:
            raise ModelAnalysisError("elementwise_macs", "No operator outputs")
            
        output_tensor = subgraph.Tensors(operator.Outputs(0))
        output_shape = output_tensor.ShapeAsNumpy()
        
        # Validate shape is valid
        if len(output_shape) == 0:
           raise ModelAnalysisError("elementwise_macs", "Invalid output tensor shape")
            
        # One operation per output element
        return int(np.prod(output_shape))
    
    def _get_tensor_shapes(self, tensor_indices: list, subgraph: object) -> list:
        """
        Get tensor shapes for a list of tensor indices.
        
        Args:
            tensor_indices: List of tensor indices
            subgraph: TensorFlow Lite subgraph containing the tensors
            
        Returns:
            List of tensor shapes as numpy arrays
        """
        shapes = []
        for tensor_idx in tensor_indices:
            try:
                tensor = subgraph.Tensors(tensor_idx)
                shape = tensor.ShapeAsNumpy()
                shapes.append(shape)
            except Exception as e:
                self.logger.debug(f"Failed to get shape for tensor {tensor_idx}: {e}")
        return shapes
    
    def _has_weight_tensors(self, operator: object, subgraph: object) -> bool:
        """
        Check if operator has weight tensors (indicates computational operation).
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            True if operator has weight tensors, False otherwise
        """
        try:
            # Parameter tensors are those not produced by other operators
            operator_outputs = set()
            for i in range(subgraph.OperatorsLength()):
                op = subgraph.Operators(i)
                operator_outputs.update(op.OutputsAsNumpy())
            
            model_inputs = set(subgraph.InputsAsNumpy())
            
            # Check if any input tensor is a parameter (weight/bias)
            for tensor_idx in operator.InputsAsNumpy():
                if (tensor_idx not in operator_outputs and 
                    tensor_idx not in model_inputs):
                    return True
            return False
        
        except Exception as e:
            self.logger.debug(f"Failed to check weight tensors: {e}")
            return False
    
    def _calculate_weighted_operation_macs(
        self, operator: object, subgraph: object
    ) -> int:
        """
        Calculate MAC operations for operations with weight tensors.
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Estimated MAC operations based on weight tensor dimensions
        """
        try:
            # Find weight tensors (parameters)
            operator_outputs = set()
            for i in range(subgraph.OperatorsLength()):
                op = subgraph.Operators(i)
                operator_outputs.update(op.OutputsAsNumpy())
            
            model_inputs = set(subgraph.InputsAsNumpy())
            total_weight_elements = 0
            
            for tensor_idx in operator.InputsAsNumpy():
                if (tensor_idx not in operator_outputs and 
                    tensor_idx not in model_inputs):
                    # This is a weight tensor
                    tensor = subgraph.Tensors(tensor_idx)
                    shape = tensor.ShapeAsNumpy()
                    total_weight_elements += int(np.prod(shape))
            
            # For weighted operations, MACs are typically proportional to weight size
            return total_weight_elements
            
        except Exception as e:
            self.logger.debug(f"Failed to calculate weighted operation MACs: {e}")
            return self._estimate_macs_from_output(operator, subgraph)
    
    def _calculate_transformation_macs(
        self, input_shapes: list, output_shapes: list
    ) -> int:
        """
        Calculate MAC operations for tensor transformation operations.
        
        Args:
            input_shapes: List of input tensor shapes
            output_shapes: List of output tensor shapes
            
        Returns:
            Estimated MAC operations based on tensor size differences
        """
        try:
            if not input_shapes or not output_shapes:
                return 0
            
            input_size = sum(np.prod(shape) for shape in input_shapes)
            output_size = sum(np.prod(shape) for shape in output_shapes)
            
            # Estimate MACs based on the larger tensor size
            # This handles operations like pooling, upsampling, etc.
            return int(max(input_size, output_size))
            
        except Exception as e:
            self.logger.debug(f"Failed to calculate transformation MACs: {e}")
            return 0
    
    def _is_pure_data_movement(self, input_shapes: list, output_shapes: list) -> bool:
        """
        Check if operation is pure data movement (no computation).
        
        Args:
            input_shapes: List of input tensor shapes
            output_shapes: List of output tensor shapes
            
        Returns:
            True if operation only moves/reshapes data, False otherwise
        """
        try:
            if not input_shapes or not output_shapes:
                return True
            
            # Calculate total elements in input and output tensors
            input_elements = sum(np.prod(shape) for shape in input_shapes)
            output_elements = sum(np.prod(shape) for shape in output_shapes)
            
            # If element count is exactly the same, likely just reshaping/moving data
            return input_elements == output_elements
            
        except Exception as e:
            self.logger.debug(f"Failed to check data movement: {e}")
            return False
    
    def _estimate_macs_from_output(self, operator: object, subgraph: object) -> int:
        """
        Fallback MAC estimation based on output tensor dimensions.
        
        Args:
            operator: TensorFlow Lite operator object
            subgraph: TensorFlow Lite subgraph containing the operator
            
        Returns:
            Estimated MAC operations (one per output element)
        """
        try:
            output_tensor = subgraph.Tensors(operator.Outputs(0))
            output_shape = output_tensor.ShapeAsNumpy()
            return int(np.prod(output_shape))
        except Exception as e:
            self.logger.debug(f"Failed to estimate MACs from output: {e}")
            return 0
    
    def extract_parameter_tensors(self, subgraph: object) -> set[int]:
        """
        Extract indices of parameter tensors (weights, biases, constants).
        
        Identifies tensors that contain trained model parameters by analyzing
        the computational graph structure. Parameter tensors are characterized as:
        - Input tensors to operators (used in computations)
        - Not outputs of any operator (stored constants, not computed)
        - Not model input tensors (not provided at inference time)
        
        Args:
            subgraph: TensorFlow Lite subgraph object
            
        Returns:
            Set of tensor indices that contain model parameters
        """
        # Collect all tensors that are produced by operators
        operator_outputs = set()
        for i in range(subgraph.OperatorsLength()):
            operator = subgraph.Operators(i)
            operator_outputs.update(operator.OutputsAsNumpy())
        
        # Identify model input tensors (provided at inference time)
        model_inputs = set(subgraph.InputsAsNumpy())
        
        # Parameter tensors are operator inputs that are neither computed nor external
        parameter_indices = set()
        for i in range(subgraph.OperatorsLength()):
            operator = subgraph.Operators(i)
            for input_idx in operator.InputsAsNumpy():
                # Filter out invalid tensor indices (-1 = "no tensor")
                if (input_idx >= 0 and 
                    input_idx not in operator_outputs and 
                    input_idx not in model_inputs):
                    parameter_indices.add(input_idx)
        
        return parameter_indices
    
    def analyze_tensor_lifespans(self, subgraph: object) -> dict[int, dict[str, int]]:
        """
        Analyze tensor creation and destruction points for memory optimization.
        
        Tracks when each tensor is created (birth) and when it's last used (death)
        to identify memory optimization opportunities and calculate peak usage.
        
        Args:
            subgraph: TensorFlow Lite subgraph object
            
        Returns:
            Dictionary mapping tensor_id to lifecycle information:
            {'birth': operator_index, 'death': operator_index}
        """
        tensor_lifespans = {}
        tensor_last_use = defaultdict(lambda: -1)
        
        # Track the last operator that uses each tensor
        for op_idx in range(subgraph.OperatorsLength()):
            operator = subgraph.Operators(op_idx)
            for tensor_idx in operator.InputsAsNumpy():
                tensor_last_use[tensor_idx] = op_idx
        
        # Map tensor creation and final usage points
        for op_idx in range(subgraph.OperatorsLength()):
            operator = subgraph.Operators(op_idx)
            for tensor_idx in operator.OutputsAsNumpy():
                tensor_lifespans[tensor_idx] = {
                    'birth': op_idx,  # Created by this operator
                    'death': tensor_last_use.get(tensor_idx, op_idx)  # Last used here
                }
        
        return tensor_lifespans
    
    def calculate_total_param_size(
        self,
        subgraph: object,
        parameter_indices: set[int]
    ) -> int:
        """
        Calculate total flash memory required for model parameters.
        
        Sums the storage requirements for all model parameters including
        weights, biases, and other constants that must be stored in
        non-volatile memory.
        
        Args:
            subgraph: TensorFlow Lite subgraph object
            parameter_indices: Set of tensor indices containing parameters
            
        Returns:
            Total flash memory requirement in bytes
        """
        total_bytes = 0
        for tensor_idx in parameter_indices:
            try:
                tensor = subgraph.Tensors(tensor_idx)
                shape = tensor.ShapeAsNumpy()
                tensor_type = tensor.Type()
                type_size = self.get_tensor_size_bytes(tensor_type)
                
                total_bytes += int(np.prod(shape) * type_size)

            except Exception as e:
                # Log tensor calculation errors but continue with partial results
                self.logger.debug(f"Failed to calculate parameter tensor "
                                  f"{tensor_idx} size: {e}")
                
        return total_bytes
    
    def determine_model_dtype(self, subgraph: object) -> str:
        """
        Determine the primary data type used by the model.
        
        Analyzes the model's input tensor to identify the quantization
        scheme and primary numeric representation used throughout the model.
        
        Args:
            subgraph: TensorFlow Lite subgraph object
            
        Returns:
            Data type string (e.g., 'int8', 'float32', 'unknown')
        """
        if not self.schema_fb or subgraph.InputsLength() == 0:
            return 'unknown'
            
        try:
            # Examine the first model input tensor
            input_tensor = subgraph.Tensors(subgraph.Inputs(0))
            input_type = input_tensor.Type()
            
            # Map TensorFlow Lite type enum back to string representation
            for attr_name in dir(self.schema_fb.TensorType):
                if (
                    not attr_name.startswith("__")
                    and getattr(self.schema_fb.TensorType, attr_name) == input_type
                ):
                    return attr_name.lower()
                        
        except AttributeError as e:
            raise SchemaError("tensor_type_determination", str(e))
        except Exception as e:
            self.logger.debug(f"Failed to determine model data type: {e}")
            
        return 'unknown'


def parse_tflite_model(model_path: str) -> ModelDetails:
    """
    Parse TensorFlow Lite model using default parser configuration.
    
    Convenience function that creates a standard TFLiteParser instance
    and performs comprehensive model analysis.
    
    Args:
        model_path: Path to TensorFlow Lite model file
        
    Returns:
        ModelDetails object containing comprehensive analysis results
    """
    parser = TFLiteParser()
    return parser.parse_model(model_path)

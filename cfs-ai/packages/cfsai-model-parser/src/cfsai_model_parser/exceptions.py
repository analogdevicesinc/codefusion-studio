"""
Model Parser Exception Framework.

Comprehensive exception hierarchy for TensorFlow Lite model parsing and analysis.
Provides structured error handling with detailed context for debugging and
automated error recovery in AI model deployment pipelines.

This module defines specialized exception classes that capture specific failure
modes during model parsing, validation, and performance analysis workflows.
Each exception includes structured error codes and contextual metadata to
support robust error handling and diagnostic reporting.

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""

from typing import Any, Optional


class ModelParserError(Exception):
    """
    Base exception class for all model parser-related errors.
    
    Provides a common foundation for all parsing exceptions with support for
    structured error codes and contextual metadata. This design enables
    sophisticated error handling patterns in production deployment systems.
    
    Attributes:
        error_code: Machine-readable error classification for automated handling
        details: Structured metadata dictionary for debugging and logging
    """
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None, 
        details: Optional[dict[str, Any]] = None
    ) -> None:
        """
        Initialize base model parser exception.
        
        Args:
            message: Human-readable error description
            error_code: Optional machine-readable error classification
            details: Optional structured metadata for debugging context
        """
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}


class InvalidTensorType(ModelParserError):
    """
    Exception for unsupported or malformed tensor data types.
    
    Raised when the parser encounters tensor types that are not supported
    by the current analysis framework or when tensor type information is
    corrupted or missing from the model file.
    
    Common scenarios:
    - Custom quantization schemes not supported by the parser
    - Experimental TensorFlow Lite data types
    - Corrupted model files with invalid type enumeration values
    """
    
    def __init__(self, tensor_type: str, error_code: str = "INVALID_TENSOR_TYPE") \
    -> None:
        """
        Initialize invalid tensor type exception.
        
        Args:
            tensor_type: The unsupported tensor type identifier
            error_code: Machine-readable error classification
        """
        message = f"Unsupported tensor data type: {tensor_type}"
        super().__init__(message, error_code, {"tensor_type": tensor_type})


class ModelFileNotFoundError(ModelParserError):
    """
    Exception for missing or inaccessible model files.
    
    Raised when the specified model file path does not exist, is not
    accessible due to permissions, or points to a directory instead
    of a valid file.
    """
    
    def __init__(self, file_path: str, error_code: str = "FILE_NOT_FOUND") -> None:
        """
        Initialize file not found exception.
        
        Args:
            file_path: The inaccessible file path that caused the error
            error_code: Machine-readable error classification
        """
        message = f"Model file not found or inaccessible: {file_path}"
        super().__init__(message, error_code, {"file_path": file_path})


class ModelLoadError(ModelParserError):
    """
    Exception for model file loading and deserialization failures.
    
    Raised when a model file exists but cannot be successfully loaded due to:
    - Corrupted file format or incomplete downloads
    - Incompatible TensorFlow Lite schema versions
    - Memory constraints during large model loading
    - Invalid FlatBuffer structure or checksum failures
    """
    
    def __init__(
        self, 
        file_path: str, 
        original_error: str, 
        error_code: str = "MODEL_LOAD_FAILED"
    ) -> None:
        """
        Initialize model loading exception.
        
        Args:
            file_path: Path to the model file that failed to load
            original_error: Underlying system or library error message
            error_code: Machine-readable error classification
        """
        message = f"Failed to load TFLite model from '{file_path}': {original_error}"
        super().__init__(message, error_code, {
            "file_path": file_path, 
            "original_error": original_error
        })


class ModelSubgraphError(ModelParserError):
    """
    Exception for invalid or missing computational graph structures.
    
    Raised when a TensorFlow Lite model lacks the expected subgraph structure
    required for analysis. Most TFLite models contain at least one subgraph
    representing the primary computational graph for inference.
    
    Common causes:
    - Empty or malformed model files
    - Models with only metadata and no executable computation
    - Corrupted subgraph definitions in the FlatBuffer structure
    """
    
    def __init__(
        self, 
        message: str = "Model contains no valid computational subgraphs", 
        error_code: str = "INVALID_SUBGRAPH"
    ) -> None:
        """
        Initialize subgraph structure exception.
        
        Args:
            message: Descriptive error message
            error_code: Machine-readable error classification
        """
        super().__init__(message, error_code)


class ModelAnalysisError(ModelParserError):
    """
    Exception for failures during comprehensive model analysis.
    
    Raised when the parsing process encounters errors during detailed
    analysis of model structure, performance characteristics, or resource
    requirements. This typically indicates issues with the analysis
    algorithms rather than the model file itself.
    """
    
    def __init__(
        self, 
        operation: str, 
        original_error: str = "", 
        error_code: str = "ANALYSIS_FAILED"
    ) -> None:
        """
        Initialize model analysis exception.
        
        Args:
            operation: The specific analysis operation that failed
            original_error: Underlying error that caused the analysis failure
            error_code: Machine-readable error classification
        """
        if original_error:
            message = f"Analysis failed during {operation}: {original_error}"
        else:
            message = f"Analysis operation failed: {operation}"
        super().__init__(message, error_code, {
            "operation": operation, 
            "original_error": original_error
        })


class ModelMemoryCalculationError(ModelParserError):
    """
    Exception for memory usage calculation failures.
    
    Raised when the parser cannot accurately determine memory requirements
    for model parameters, intermediate tensors, or peak usage analysis.
    This typically occurs with unusual tensor shapes or when tensor
    metadata is incomplete.
    """
    
    def __init__(
        self, 
        step: str, 
        original_error: str = "", 
        error_code: str = "MEMORY_CALC_FAILED"
    ) -> None:
        """
        Initialize memory calculation exception.
        
        Args:
            step: The specific memory calculation step that failed
            original_error: Underlying error that caused the calculation failure
            error_code: Machine-readable error classification
        """
        if original_error:
            message = f"Memory calculation failed for {step}: {original_error}"
        else:
            message = f"Memory calculation step failed: {step}"
        super().__init__(message, error_code, {
            "step": step, 
            "original_error": original_error
        })


class ModelMACCalculationError(ModelParserError):
    """
    Exception for multiply-accumulate operation counting failures.
    
    Raised when the parser cannot accurately estimate the computational
    complexity (MAC operations) for specific operators or the entire model.
    This may occur with custom operators or unusual layer configurations
    that don't match standard MAC calculation patterns.
    """
    
    def __init__(
        self, 
        operator: str, 
        original_error: str = "", 
        error_code: str = "MAC_CALC_FAILED"
    ) -> None:
        """
        Initialize MAC calculation exception.
        
        Args:
            operator: The operator type for which MAC calculation failed
            original_error: Underlying error that caused the calculation failure
            error_code: Machine-readable error classification
        """
        if original_error:
            message = f"MAC calculation failed for operator '{operator}': \
            {original_error}"
        else:
            message = f"MAC calculation failed for operator: {operator}"
        super().__init__(message, error_code, {
            "operator": operator, 
            "original_error": original_error
        })


class TensorCalculationError(ModelParserError):
    """
    Exception for tensor-specific size and memory calculations.
    
    Raised when the parser encounters errors calculating properties of
    individual tensors, such as memory footprint, element count, or
    dimensional analysis. This typically occurs with dynamic shapes
    or malformed tensor definitions.
    """
    
    def __init__(
        self, 
        tensor_id: int, 
        operation: str, 
        original_error: str, 
        error_code: str = "TENSOR_CALC_FAILED"
    ) -> None:
        """
        Initialize tensor calculation exception.
        
        Args:
            tensor_id: Index of the problematic tensor within the model
            operation: The specific tensor operation that failed
            original_error: Underlying error that caused the calculation failure
            error_code: Machine-readable error classification
        """
        message = f"Tensor calculation failed for tensor[{tensor_id}] during \
        {operation}: {original_error}"
        super().__init__(message, error_code, {
            "tensor_id": tensor_id, 
            "operation": operation, 
            "original_error": original_error
        })


class SchemaError(ModelParserError):
    """
    Exception for TensorFlow Lite schema access and interpretation errors.
    
    Raised when the parser encounters issues accessing or interpreting
    the TensorFlow Lite FlatBuffer schema. This may indicate schema
    version incompatibilities or corrupted model metadata.
    """
    
    def __init__(
        self, 
        operation: str, 
        original_error: str, 
        error_code: str = "SCHEMA_ERROR"
    ) -> None:
        """
        Initialize schema operation exception.
        
        Args:
            operation: The schema operation that failed
            original_error: Underlying error from the schema library
            error_code: Machine-readable error classification
        """
        message = f"TFLite schema operation failed ({operation}): {original_error}"
        super().__init__(message, error_code, {
            "operation": operation, 
            "original_error": original_error
        })


class ModelFormatNotSupportedError(ModelParserError):
    """Raised when model format is not supported."""

# Exception hierarchy summary for documentation and automated handling
__all__ = [
    "InvalidTensorType",         # Unsupported tensor data types
    "ModelAnalysisError",        # Comprehensive analysis failures
    "ModelFileNotFoundError",    # Missing or inaccessible model files
    "ModelFormatNotSupportedError",  # Unsupported model format errors
    "ModelLoadError",            # Model file loading failures
    "ModelMACCalculationError",   # MAC operation counting errors
    "ModelMemoryCalculationError", # Memory usage calculation errors
    "ModelParserError",           # Base exception for all parser errors
    "ModelSubgraphError",        # Invalid computational graph structure
    "SchemaError",               # TFLite schema access errors
    "TensorCalculationError"    # Individual tensor calculation errors
]

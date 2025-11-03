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

from typing import Any, Optional


class CompatibilityAnalysisError(Exception):
    """Base exception for compatibility analysis errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None, 
                 details: Optional[dict[str, Any]] = None) -> None:
        """
        Initialize a CompatibilityAnalysisError.

        Args:
            message: Description of the error.
            error_code: Optional error code for categorization.
            details: Optional dictionary with additional error context.
        """
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}

class InvalidHardwareMetadataError(CompatibilityAnalysisError):
    """Raised when hardware metadata is invalid."""

class ModelParsingError(CompatibilityAnalysisError):
    """Raised when model parsing fails."""

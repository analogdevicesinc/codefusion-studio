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


class ResourceProfilerError(Exception):
    """Base exception for resource profiler errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None, 
                 details: Optional[dict[str, Any]] = None) -> None:
        """
        Initialize the resource profiler error.

        Args:
            message: Human-readable error message
            error_code: Optional error code for programmatic handling
            details: Optional dictionary containing additional error context
        """
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}

class ModelAnalysisError(ResourceProfilerError):
    """Raised when model analysis fails."""

class HardwareProfileError(ResourceProfilerError):
    """Raised when hardware profile is invalid."""

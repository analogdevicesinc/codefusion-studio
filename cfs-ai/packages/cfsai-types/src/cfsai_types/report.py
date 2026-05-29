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

from datetime import datetime
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, Field

from cfsai_types.hardware_profile import HardwareProfile


class ReportType(StrEnum):
    """Enumeration of report types."""
    COMPAT = "compat"
    PROFILE = "profile"

class ReportInfo(BaseModel):
    """Class containing metadata for generated reports."""
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now().replace(microsecond=0)
    )
    type: Optional[ReportType] = Field(
        default=None, description="Type of report generated"
    )
    version: Optional[str] = Field(
        default=None, description="Version of report generated"
    )
    hardware: Optional[HardwareProfile] = Field(
        default=None, description="Hardware configuration used"
    )

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


from typing import Optional, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class UserTarget(BaseModel):
    """
    Explicit user provided hardware target containing the soc, optional soc 
    package core and optional hardware acclerator .

    Attributes:
        soc: System on chip.
        core: Processing core on the soc.
        package: Optional soc package. Defaults to `None`.
        accelerator: Optional accelerator to target through the `core`. 
            Defaults to `None`. 
    """
    soc: str = Field(
        alias="Soc",
        description="System on Chip (SoC)."
    )
    core: str = Field(
        alias="Core",
        description="Processor core."
    )
    package: Optional[str] = Field(
        alias="Package", default=None,
        description="Soc package."
    )
    accelerator: Optional[str] = Field(
        alias="Accelerator", default=None,
        description="Optional Accelerator."
    )
    family: Optional[str] = Field(
        alias="Family", default=None,
        description="Optional Family."
    )
    firmware_platform: Optional[str] = Field(
        alias="FirmarePlatform", default=None,
        description="Optional Firmware Platform."
    )

    model_config = ConfigDict(
        validate_by_name=True, serialize_by_alias=True, extra='forbid'
    )

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        """
        Ensures case consistency by converting certain attributes to uppercase.

        Returns:
            The validated instance of the class.
        """
        self.soc = self.soc.upper()
        self.core = self.core.upper()
        if self.accelerator:
            self.accelerator = self.accelerator.upper()
        if self.package:
            self.package = self.package.upper()
        return self

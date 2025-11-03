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


import re
from typing import Literal, Optional, Self, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _parse_soc_package(s: str) -> tuple[str, Optional[str]]:
    """
    Parses 'soc[package]' into (soc, package). 
    If no package or it's empty, returns None for package.
    """
    _match = re.fullmatch(r'([^\[\]]+)(?:\[(.*?)\])?', s)
    if _match:
        normal, inner = _match.groups()
        return normal, inner
    return s, None


class ExplicitTarget(BaseModel):
    """
    Explicit hardware target containing the soc, core and optional hardware 
    acclerator.

    Attributes:
        soc: System on chip.
        core: Processing core on the soc.
        accelerator: Optional accelerator to target through the `core`. 
            Defaults to `None`. 
        kind: String literal to different from other target types e.g. 
            `GenericTarget`.
    """
    soc: str = Field(
        alias="Soc",
        description="System on Chip (SoC)."
    )
    core: str = Field(
        alias="Core",
        description="Processor core."
    )
    accelerator: Optional[str] = Field(
        alias="Accelerator", default=None,
        description="Optional Accelerator."
    )
    kind: Literal['explicit'] = Field(default='explicit', alias='Kind')

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
        return self


class GenericTarget(BaseModel):
    """
    Generic hardware target containing the processor family capable of 
    targeting.

    Attributes:
        family: Processor family
        accelerator: Optional accelerator. Defaults to `None`.
        kind:  String literal to different from other target types e.g. 
            `ExplicitTarget`.

    !!! note
        Optionally an accelerator can given to the `GenericTarget`. This is to 
        aide in validation in the case where a backend can generically target a 
        family of processors. If the user attempts to target an accelerator 
        through a processing core of the right backend family, without this 
        accelerator option that backend is deemed capable of meeting to user's 
        condition.
    """
    family: str = Field(
        alias="Family",
        description="The processor family"
    )
    accelerator: Optional[str] = Field(
        alias="Accelerator", default=None,
        description="Optional accelerator"
    )
    kind: Literal['generic'] = Field(default='generic', alias='Kind')

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
        self.family = self.family.upper()
        if self.accelerator:
            self.accelerator = self.accelerator.upper()
        return self

class ResolvedGenericTarget(BaseModel):
    """
    Resolved generic targeting information with additional software related 
    configuration options.

    Attributes:
        family: Processor family
        runtime: Optional graph execution runtime to use e.g. `tflm`.
        firmware_platform: Optional firmware platform to use e.g. `zephyr`.
    """
    family: str
    runtime: Optional[str]
    firmware_platform: Optional[str]


class ResolvedExplicitTarget(BaseModel):
    """
    Resolved explicit targeting information with additional software related
    configuration options.

    Attributes:
        soc: System on chip.
        core: Processing core on the soc.
        accelerator: Optional accelerator to target through the `core`. 
            Defaults to `None`.
        family: Processing core family.
        runtime: Optional graph execution runtime to use e.g. `tflm`.
        firmware_platform: Optional firmware platform to use e.g. `zephyr`.
    """
    soc: str
    core: str
    accelerator: Optional[str]
    family: str
    runtime: Optional[str]
    firmware_platform: Optional[str]


class MinProjectTarget(BaseModel):
    """
    Minimum targeting information that is available from a cfs project.

    Attributes:
        soc: System on chip.
        core: Processing core on the soc.
        family: Processing core family.
        firmware_platform: Optional firmware platform to use e.g. `zephyr`.
    """
    soc: str
    core: str
    family: str
    firmware_platform: Optional[str]

class BackendTarget(BaseModel):
    """
    Hardware and software targeting information which a backend support.

    Attributes:
        hardware: Hardware targeting information.
        runtime: Optional runtime to use e.g. `tflm`. Defaults to `None`.
        firmware_platform: Optional firmware platform to use e.g. `zephyr` 
            Defaults to `None`.

    !!! note
        A runtime value being equal to `None` is interpreted as not dependent on 
        any graph execution environment. 
        A firmware platform being equal to `None` is interpreted as the code
        generated by the backend being firmware platform agnostic and will match
        any user provided firmware platform.
    """
    hardware: Union[ExplicitTarget, GenericTarget] = Field(
        alias='Hardware', discriminator='kind',
        description='Hardware targeting information'
    )
    runtime: Optional[str] = Field(
        alias="Runtime", default=None,
        description="Optional runtimes supported for this target."
    )
    firmware_platform: Optional[str] = Field(
        alias="FirmwarePlatform", default=None,
        description="Optional firmware platform to use"
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
        if self.runtime:
            self.runtime = self.runtime.upper()
        if self.firmware_platform:
            self.firmware_platform = self.firmware_platform.upper()
        return self

    def is_explicit(self) -> bool:
        """
        Checks if the hardware target is explicit.

        Returns:
            True if the hardware is explicit, False otherwise.
        """
        return isinstance(self.hardware, ExplicitTarget)

    def targets_accelerator(self) -> bool:
        """
        Checks if the hardware target intends on using an accelerator.

        Returns:
            True if an accelerator is being targeted, False otherwise.
        """
        return isinstance(self.hardware, ExplicitTarget) and \
            self.hardware.accelerator is not None

    def can_support_min_prj(self, target: MinProjectTarget) -> bool:
        """
        Checks if this backend target is capable of supporting the provided 
        minimum project.

        Args:
            target: Minimum project information.

        Returns:
            True if capable of supporting the project, False otherwise.
        """
        if self.firmware_platform:
            fw = self.firmware_platform == target.firmware_platform \
                if target.firmware_platform else True
        else: # Backend target doesn't restrict based on firmware platform
            fw = True

        if isinstance(self.hardware, ExplicitTarget):
            hw = self.hardware.soc == target.soc \
                and self.hardware.core == target.core
        else:
            hw = self.hardware.family == target.family

        return fw and hw

    def can_support_hardware(self, target: ResolvedExplicitTarget) -> bool:
        """
        Checks if this backend target is capable of supporting only the hardware
        provided in the resolved explicit target. This will not consider the 
        provided software information.

        Args:
            target: Resolved explicit target containing hardware and software 
                information

        Returns:
            True if capable of supporting the hardware target, False otherwise
        """
        explicit = ExplicitTarget(
            Soc=target.soc,
            Core=target.core,
            Accelerator=target.accelerator
        )
        generic = GenericTarget(
            Family=target.family,
            Accelerator=target.accelerator
        )
        return (generic == self.hardware) or (explicit == self.hardware)
    

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

    @classmethod
    def from_dot_string(cls, s: str) -> Self:
        """
        Builder class method to produce an `UserTarget` from a dot 
        separated string. This is particularly useful when parsing from the 
        command line. The expected format is `<soc>?[<package>].<core>.?<accelerator>`. 

        Args:
            s: String to parse into the explicit target.

        Returns:
            An instance of `UserTarget` parsed from the provided string.
        
        Raises:
            ValueError: If the provided string is not in the valid format.

        !!! example
            ```python
            _ = UserTarget.from_dot_string('max78002.cm4')
            _ = UserTarget.from_dot_string('max78002.cm4.cnn')
            ```
        """
        parts = s.split('.')
        
        if len(parts) > 3 or len(parts) < 2:
            raise ValueError(f"Invalid target format: {s}")
        
        soc, core = parts[0], parts[1]
        soc, package = _parse_soc_package(soc)
        accelerator = parts[2] if len(parts) == 3 else None
        return cls(
            Soc=soc, Package=package, Core=core, Accelerator=accelerator
        )

    def into_dot_string(self) -> str:
        """
        Serializes the instance into a dot separated string.

        Returns:
            Dot separated string representation of the hardware target.

        !!! example
            ```python
            target = UserTarget(
                Soc='max78002',
                Core='cm4',
                Accelerator='cnn',
                Package=None
            )
            assert target.into_dot_string() == 'max78002.cm4.cnn'
            ```
        """
        accel = f'.{self.accelerator}' \
            if self.accelerator else ''
        soc = f'{self.soc}[{self.package}]' if self.package else self.soc
        return f'{soc}.{self.core}{accel}'
    
    @staticmethod
    def grammar() -> str:
        """Return a help message describing the stringized format."""
        return '<soc>?([<package>]).<core>?(.<accelerator>)'

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


from collections.abc import Iterator
from typing import Any, Optional, Self

from pydantic import NaiveDatetime, RootModel, model_validator

import cfsai_types.datamodel._internal.datamodel as _dm
from cfsai_types.datamodel._internal.datamodel import Ai
from cfsai_types.hardware_profile import HardwareProfile


class Core(RootModel[_dm.Core]): 
    """Core wrapper class."""
    @property
    def ai(self) -> Optional[Ai]:
        """Core related AI information."""
        return self.root.ai
    
    @ai.setter
    def ai(self, v: Optional[Ai]) -> None:
        self.root.ai = v
    
    @property
    def id(self) -> str:
        """Core ID."""
        return self.root.id
    
    @id.setter
    def id(self, v: str) -> None:
        self.root.id = v
    
    @property
    def family(self) -> str:
        """Core family."""
        return self.root.family
    
    @family.setter
    def family(self, v: str) -> None:
        self.root.family = v

    @model_validator(mode='after')
    def case_consistency(self) -> Self:
        """
        Ensures case consistency by converting certain attributes to uppercase.

        Returns:
            The validated instance of the class.
        """
        if self.ai is not None:
            self.id = self.id.upper()
            self.family = self.family.upper()
        return self

    @property
    def hw_profile(self) -> Optional[HardwareProfile]:
        """HardwareProfile."""
        if not self.root.ai:
            return None
        try:
            profile = HardwareProfile.model_validate(self.root.ai.model_dump())
        except Exception as e:
            raise TypeError(
                f'Core datamodel Ai does not appear to be a' \
                f' valid HardwareProfile \n {e} \n {self.root.ai}'
            ) from e
        return profile

    def is_ai_core(self) -> bool:
        """
        Checks if this core is supported by the AI tooling.

        Returns:
            True is the core is AI supported, False otherwise.
        """
        return self.ai is not None

class Peripheral(RootModel[_dm.Peripheral]): 
    """Peripheral object wrapper."""

    @property
    def ai(self) -> Optional[dict[str, Any]]:
        """Peripheral related AI information."""
        return self.root.ai
    
    @ai.setter
    def ai(self, v: Optional[dict[str, Any]]) -> None:
        self.root.ai = v
    
    @property
    def name(self) -> str:
        """Peripheral name."""
        return self.root.name
    
    @name.setter
    def name(self, v: str) -> None:
        self.root.name = v

    @property
    def cores(self) -> list[str]:
        """Cores capable of owning this peripheral."""
        return [c.root for c in self.root.cores]
    
    @cores.setter
    def cores(self, v: list[str]) -> None:
        self.root.cores = [_dm.Core1(root=c) for c in v]

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        """
        Ensures case consistency by converting certain attributes to uppercase.

        Returns:
            The validated instance of the class.
        """
        if self.ai is not None:
            self.name = self.name.upper()
            for c in self.root.cores:
                c.root = c.root.upper()
        return self

    def is_accelerator(self) -> bool:
        """
        Checks if the peripheral is an accelerator.

        Returns:
            True if the peripheral is an accelerator, False otherwise.
        """
        return self.ai is not None

    def owners(self) -> list[str]:
        """
        Finds the cores who are capable of owning the accelerator.

        Returns:
            List of core names which can own the accelerator.
        """
        return [c.root for c in self.root.cores]
    
class Part(RootModel[_dm.Part]):
    """Part data."""    

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        self.name = self.name.upper() if self.name else self.name
        self.package = self.package.upper() if self.package else self.package
        return self
        
    @property
    def name(self) -> Optional[str]:
        """Part name."""
        return self.root.name 
    
    @name.setter
    def name(self, v: Optional[str]) -> None:
        self.root.name = v

    @property
    def package(self) -> Optional[str]:
        """Package name."""
        return self.root.package
    
    @package.setter
    def package(self, v: Optional[str]) -> None:
        self.root.package = v

    @property
    def memory_description(self) -> Optional[str]:
        """Memory description of part."""
        return self.root.memory_description
    
    @memory_description.setter
    def memory_description(self, v: Optional[str]) -> None:
        self.root.memory_description = v

class CfsDatamodel(RootModel[_dm.CfsDatamodel]):
    """Datamodel wrapper class."""

    @property
    def name(self) -> str:
        """Datamodel name."""
        return self.root.name
    
    @property
    def version(self) -> str:
        """Datamodel version."""
        return self.root.version
    
    @property
    def dmschema(self) -> str:
        """Datamodel schema version."""
        return self.root.schema_
    
    @property
    def timestamp(self) -> NaiveDatetime:
        """Datamodel generation timestamp."""
        return self.root.timestamp
    
    @property
    def description(self) -> str:
        """Datamodel description."""
        return self.root.description
    
    @property
    def parts(self) -> list[Part]:
        """List of parts in datamodel."""
        return [Part(root=p) for p in self.root.parts]
    
    @property
    def part_package(self) -> str:
        """Get the part package name."""
        part = self.parts[0]
        if part.package:
            return part.package
        else:
            raise ValueError(f'Datamodel "{self.name}" has an empty part package')

    @property
    def cores(self) -> list[Core]:
        """List of cores in datamodel."""
        return [Core(root=c) for c in self.root.cores]
    
    @cores.setter
    def cores(self, v: list[Core]) -> None:
        self.root.cores = [c.root for c in v]

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        """
        Ensures case consistency by converting certain attributes to uppercase.

        Returns:
            The validated instance of the class.
        """
        # !!! Important section here, we need to trigger the validators in the 
        # above root wrapper types as they will not be trigger otherwise until
        # later. Maybe consider wrapping these as caching for efficiency but 
        # this will do for now
        _ = [Peripheral(root=p) for p in self.root.peripherals]
        _ = [Core(root=c) for c in self.root.cores]

        self.root.name = self.name.upper()
        return self
    
    @model_validator(mode='after')
    def _part_array_entries(self) -> Self:
        """
        Ensures that the part array for the datamodel has at least one entry and 
        invokes any `Part` validators.

        Returns:
            The validated instance of the class
        """
        if not [Part(root=p) for p in self.root.parts]:
            raise ValueError(f'Datamodel "{self.name}" has no part entries')
        return self

    def ai_enabled(self) -> bool:
        """
        Check whether the part described by this datamodel is AI enabled or not.

        Returns:
            True if AI enabled, False otherwise.
        """
        return len(self.supported_cores()) > 0 or len(self.supported_accels()) > 0
    
    def supported_cores(self) -> list[str]:
        """
        Finds all of the supported processing cores on the part.

        Returns:
            List of the supported processing core names.
        """
        return [c.id for c in self.root.cores if c.ai is not None]

    def supported_accels(self) -> list[str]:
        """
        Finds all of the supported accelerators on the part.

        Returns:
            List of the supported accelerator names.
        """
        return [p.name for p in self.root.peripherals \
                if Peripheral(root=p).is_accelerator()]

    def core_families(self) -> list[str]:
        """
        Finds all of the supported core families on the part.

        Returns:
            List of the supported core families.
        """
        families = set()
        for c in self.root.cores:
            if c.ai is not None and c.family:
                families.add(c.family)
        return list(families)

    def iter_accelerators(self) -> Iterator[Peripheral]:
        """
        Iterates through the accelerators on the part.

        Yields:
            An accelerator peripheral.
        """
        for p in self.root.peripherals:
            periph = Peripheral(root=p)
            if periph.is_accelerator():
                yield periph

    def iter_ai_cores(self) -> Iterator[Core]:
        """
        Iterates through the _AI_ supported cores on the part.

        Yields:
            An _AI_ supported core.
        """
        for c in self.root.cores:
            core = Core(root=c)
            if core.is_ai_core():
                yield core

    def get_core(self, core: str) -> Optional[Core]:
        """
        Gets the core from the provided core name.

        Args:
            core: Name of the core to retrieve.
        
        Returns:
            The core data if the core could be found otherwise `None`.
        """
        for c in self.root.cores:
            if c.id == core:
                return Core(root=c)
        return None

    def get_accelerator(self, accel: str) -> Optional[Peripheral]:
        """
        Gets the accelerator from the provided accelerator name.

        Args:
            accel: Name of the accelerator to retrieve.
        
        Returns:
            The accelerator peripheral data if the accelerator could be found 
                otherwise `None`.
        """
        for p in self.root.peripherals:
            periph = Peripheral(root=p)
            if periph.is_accelerator() and periph.name == accel:
                return periph
        return None

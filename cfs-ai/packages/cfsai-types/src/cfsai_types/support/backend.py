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


from typing import Any, Optional, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from cfsai_types.config.targets import (
    BackendTarget,
    ExplicitTarget,
    GenericTarget,
    MinProjectTarget,
    ResolvedExplicitTarget,
)


def _can_support_hardware(
        targets: list[BackendTarget],
        target: ResolvedExplicitTarget
    ) -> bool:
    """
    Check if the provided `targets` list is capable of supporting the specified 
    target hardware requirements inside the provided `target`. 
    
    Args:
        targets: List of backend target to verify against.
        target: User provided target to verify if its hardware is supported.

    Returns:
        True if capable of being supported False otherwise.
    """
    # Must respect the execution mode
    hw_targets = [x.hardware for x in targets]
    explicit = ExplicitTarget(
        Soc=target.soc,
        Core=target.core,
        Accelerator=target.accelerator,
    )
    generic = GenericTarget(
        Family=target.family,
        # Passing the accelerator information here will force a mismatch if
        # the backend supports the core through architectural targeting but an
        # accelerator was targeted
        Accelerator=target.accelerator
    )
    return (explicit in hw_targets) or (generic in hw_targets)

class SupportedBackend(BaseModel):
    """
    Supported backend class encapsulating all of the information about the 
    backend's support information.

    Attributes:
        targets: List of all the targets the backend can support.
        runtimes: List of all the runtimes the backend can support. A target can 
            only target runtimes within this list.
        firmware_platforms: List of the all the firmware platforms the backend 
            can support. A target can only target firmware platforms in this 
            list.
        extensions: Optional extension schema the backend implementation can 
            accept. Defaults to `None`.

    """
    targets: list[BackendTarget] = Field(
        alias="Targets", default_factory=list,
        description="What *exactly* the backend can support."
    )
    runtimes: list[str] = Field(
        alias="Runtimes", default_factory=list,
        description="Forward declaration of the runtimes supported by this " \
        "backend. Must be defined here to be used by a target."
    )
    firmware_platforms: list[str] = Field(
        alias="FirmwarePlatforms", default_factory=list,
        description="Forward declaration of the firmware platforms supported " \
        "by this backend. Must be defined here to be used by a target."
    )
    extensions: Optional[dict[str, Any]] = Field(
        alias='Extensions', default=None,
        description='A backends extended configuration options'
    )

    model_config = ConfigDict(
        validate_by_name=True, serialize_by_alias=True, extra='forbid'
    )

    def __case_consistency(self) -> None:
        """
        Ensures case consistency by converting certain attributes to 
        uppercase.
        """
        self.runtimes = [r.upper() for r in self.runtimes]
        self.firmware_platforms = [f.upper() for f in self.firmware_platforms]

    def __forward_decls(self) -> None:
        """
        Ensure runtime and firmware platform's targeted in backend are forward
        declared for readability purposes.
        """
        for t in self.targets:
            if t.runtime is not None and t.runtime not in self.runtimes:
                raise ValueError(f'{t.runtime} not in {self.runtimes}')
            if t.firmware_platform is not None and \
                t.firmware_platform not in self.firmware_platforms:
                raise ValueError(
                    f'{t.firmware_platform} not in {self.firmware_platforms}'
                )

    @model_validator(mode='after')
    def _validate_model(self) -> Self:
        """
        Validates the model after initialization.
        Ensures case consistency and that the targets respect foward 
        declarations.

        Returns:
            The validated instance of the class.
        """
        self.__case_consistency()
        self.__forward_decls()
        return self


    def can_support_hardware(self, target: ResolvedExplicitTarget) -> bool:
        """
        Checks whether the backend is capable of supporting the hardware being
        targeted in the resolved explicit target.

        Args:
            target: User provided resolved explicit target to check.

        Returns:
            True if the backend can support the hardware, False otherwise.
        """
        return _can_support_hardware(self.targets, target)

    def min_prj_targets(self, target: MinProjectTarget) -> list[BackendTarget]:
        """
        Finds all of the backend's targets capable of targeting the provided 
        minimum project target.

        Args:
            target: User provided minimum project target to check.
        
        Returns:
            A list of the backend targets capable of supporting `target`.
        
        """
        return [x for x in self.targets if x.can_support_min_prj(target)]

    def can_support_min_prj(self, target: MinProjectTarget) -> bool:
        """
        Check if the backend can support the minimum project target info.
        
        Args:
            target: User provided minimum project target information.
        
        Returns:
            True if the backend can support `target`, False otherwise.
        """
        return len(self.min_prj_targets(target)) > 0

    def can_support(self, target: ResolvedExplicitTarget) -> bool:
        """
        Check if this backend is capable of supporting the passed resolved 
        explicit target.

        Args:
            target: User provided explicit target to check.

        Returns:
            bool: True if `target` is supported, False otherwise.
        
        !!! note
            If we cannot find an exact match for the target then the rules are 
            loosened slightly to the following.

            - If a backend target does not specify a firmware platform we 
                will assume that it is firmware platform agnostic e.g. tflm and
                will match against it even if a firmware platform is specified.
            - If no runtime is specified we will assume that the user is runtime
                agnostic and will match against one. This could be a bad 
                assumption and could warrant change or a specific no runtime 
                option.
        """
        # First see if there is explicit support
        explicit = BackendTarget(
            Runtime=target.runtime,
            FirmwarePlatform=target.firmware_platform,
            Hardware=ExplicitTarget(
                Soc=target.soc,
                Core=target.core,
                Accelerator=target.accelerator,
            )
        )
        generic = BackendTarget(
            Runtime=target.runtime,
            FirmwarePlatform=target.firmware_platform,
            Hardware=GenericTarget(
                Family=target.family,
                Accelerator=target.accelerator
            )
        )
        exact_match = explicit in self.targets or generic in self.targets
        if exact_match:
            return exact_match
        else:
            targets = self.targets
            if target.runtime:
                targets = [x for x in targets if x.runtime == target.runtime]
            if target.firmware_platform:
                targets = [x for x in targets \
                           if x.firmware_platform == target.firmware_platform\
                            or x.firmware_platform is None]
            return _can_support_hardware(targets, target)

    def supported_socs(self) -> list[str]:
        """
        Find the SoCs supported by this backend.

        Returns:
            List of the supported system on chip (soc) names.
        """
        return [x.hardware.soc for x in self.targets if \
                isinstance(x.hardware, ExplicitTarget)]

    def supported_cores(self, soc: str) -> list[str]:
        """
        Find the supported processor cores for the provided system on chip.

        Args:
            soc: System on chip (soc) name in which to find cores.

        Returns:
            List of the supported processor core names.
        """
        return list({x.hardware.core for x in self.targets if \
                     isinstance(x.hardware, ExplicitTarget)\
                        and x.hardware.soc == soc})

    def supported_accelerators(self, soc: str, core: str) -> list[str]:
        """
        Find the supported accelerators for the provided system on chip and 
        processor core.

        Args:
            soc: System on chip (soc) name.
            core: Processor core name.

        Returns:
            List of the supported accelerator names.
        """
        return list({x.hardware.accelerator for x in self.targets \
                     if isinstance(x.hardware, ExplicitTarget) \
                        and x.hardware.soc == soc and x.hardware.core == core \
                            and x.hardware.accelerator})

    def supported_firmware_platforms(
            self,
            prj: MinProjectTarget
        ) -> set[Optional[str]]:
        """
        Find the supported firmware platforms which are available for this 
        backend if supporting the hardware requirements of the minimum project.

        Args:
            prj: Minimum project target information.
        
        Returns:
            Set of supported firmware platforms.

        !!! warning
            This method is mostly used for fuzzing and should not be required in  
            regular use.
        """
        return {
            x.firmware_platform for x in self.targets \
                if (isinstance(x.hardware, ExplicitTarget) and \
                    x.hardware.soc == prj.soc and \
                        x.hardware.core == prj.core) or \
                            (isinstance(x.hardware, GenericTarget) and \
                             x.hardware.family == prj.family)
        }

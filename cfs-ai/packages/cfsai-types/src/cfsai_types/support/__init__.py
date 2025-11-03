
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


from dataclasses import dataclass
from typing import Optional

from cfsai_types.config.aiconfig import ConfigTargetExplicit
from cfsai_types.config.cfsconfig import ConfiguredProject
from cfsai_types.config.targets import (
    BackendTarget,
    ExplicitTarget,
    ResolvedExplicitTarget,
)
from cfsai_types.datamodel_manager import CfsDatamodelManager
from cfsai_types.exceptions import SupportError
from cfsai_types.support.backend import SupportedBackend


@dataclass
class GroundTruth:
    """
    Class to store the ground truth of the supported hardware and the 
    supported backends and backend targets.

    Attributes:
        datamodels: Mapping of soc to `CfsDatamodel`.
        backends: Mapping of backend to `SupportedBackend`.
    """
    datamodels: CfsDatamodelManager
    backends: dict[str, SupportedBackend]

    def supported_socs(self) -> list[str]:
        """
        Finds all of the supported socs.

        Returns:
            List of supported System on Chip (SoC) names
        """
        return self.datamodels.ai_socs()
    
    def supported_socs_pkgs(self) -> list[tuple[str, str]]:
        """
        Finds all of the supported soc and package combinations.

        Returns:
            List of supported System on Chip (SoC) and package names
        """
        return self.datamodels.ai_socs_pkgs()

    def supported_backends(self) -> list[str]:
        """
        Finds all of the supported backends.

        Returns:
            list[str]: List of the supported backend names
        """
        return list(self.backends.keys())

    def _target_exists(self, target: BackendTarget) -> None:
        """
        Verify if a backend target exists.

        Args:
            target: Backend target to verify.
        
        Raises:
            SupportError: if the target is not supported.
        """
        inner = target.hardware
        if isinstance(inner, ExplicitTarget):
            _ = self._resolve_explicit_target(
                soc=inner.soc,
                package=None,
                core=inner.core,
                accel=inner.accelerator,
                firmware_platform=target.firmware_platform,
                runtime=target.firmware_platform,
            )

    def resolve_backend(self, target: ResolvedExplicitTarget) -> Optional[str]:
        """
        Find a backend that supports the provided resolved explicit target.

        Args:
            target: Resolved explicit target to find a backend for.
        
        Returns:
            The name of the supporting backend if one exists, otherwise `None`.
        """
        backends = [(n, b) for n, b in self.backends.items() \
                    if b.can_support(target)]
        backend = backends.pop()[0] if len(backends) > 0 else None
        return backend

    def _resolve_explicit_target(
            self,
            soc: str,
            package: Optional[str],
            core: str,
            accel: Optional[str],
            firmware_platform: Optional[str],
            runtime: Optional[str],
    ) -> ResolvedExplicitTarget:
        """
        Verify that the explicit targeting information provided is valid and 
        produce a resolved explicit target.
        
        Args:
            soc: System on chip being targeted.
            package: Optional soc package to use.
            core: Processor core on the soc being targeted.
            accel: Optional accelerator being targeted through the `core`. 
            firmware_platform: Optional firmware platform being targeted.
            runtime: Optional runtime being targeted.
        
        Returns:
            A `ResolvedExplicitTarget` instance.
        
        Raises:
            SupportError: If the `soc` is not supported by any backend.
            SupportError: If the `core` is not supported on the `soc`.
            ValueError: If the `core` does not have a specified `family`.
            SupportError: If the `accelerator` is not ownable via `core`.
            SupportError: If the `accelerator` could not be found on the `soc`.
        """
        _dm = self.datamodels.get(soc, package)
        disp_soc = f'{soc}[{package}]' if package else soc
        if _dm is None or not _dm.ai_enabled():
            if package:
                supported = [f'{s}[{p}]'for s, p in self.supported_socs_pkgs()]
            else:
                supported = self.supported_socs()
            raise SupportError(
                f'SoC {disp_soc} could not be found',
                supported
            )
        _core = _dm.get_core(core)
        if _core is None:
            raise SupportError(
                f'Core {core} was not found on SoC {disp_soc}',
                _dm.supported_cores()
            )
        family = _core.family
        if not family:
            raise ValueError(
                f'{_core.id} does not have a specified family value'
            )
        if accel is not None:
            _accel = _dm.get_accelerator(accel)
            if not _accel:
                raise SupportError(
                    f'Accelerator {accel} not found on SoC {disp_soc}',
                    _dm.supported_accels()
                )
            if core not in _accel.owners():
                raise SupportError(
                    f'Core {core} cannot manage accelerator {accel} on Soc '
                    f'{soc}',
                    _accel.owners()
                )

        return ResolvedExplicitTarget(
            soc=soc,
            core=core,
            family=family,
            accelerator=accel,
            runtime=runtime,
            firmware_platform=firmware_platform,
        )

    def resolve_user_target(
            self,
            soc: str,
            user_target: ConfigTargetExplicit,
            prj: ConfiguredProject,
            package: Optional[str] = None
    ) -> ResolvedExplicitTarget:
        """
        Validate that the passed user target configuration is supported.

        Args:
            soc: Targeted system on chip.
            user_target: User provided explicit target.
            prj: User's configured project.
            package: Optional soc package to use.
        
        Returns:
            A `ResolvedExplicitTarget`.
        
        Raises:
            SupportError: If the target is not supported.
        """
        return self._resolve_explicit_target(
            soc=soc,
            package=package,
            core=user_target.core,
            accel=user_target.accelerator,
            runtime=user_target.runtime,
            firmware_platform=prj.firmware_platform
        )


__all__ = [
    "GroundTruth",
    "SupportedBackend",
]


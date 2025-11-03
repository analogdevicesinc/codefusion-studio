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

from pydantic import BaseModel, ConfigDict, Field, model_validator

from cfsai_types.config.aiconfig import AiConfig, ModelConfig


class ConfiguredProject(BaseModel):
    """
    Represents a configured project with core, firmware platform, and AI model 
    details.

    Attributes:
        core_id: Id of the core in use for this configured project.
        firmware_platform: Firmware platform in use for this configured project.
        platform_config: Platform-specific configuration options.
        models: Optional list of AI model configurations within the project. 
            Defaults to `None`
        enabled: Flag to specify whether this project should be included in code
            generation. Defaults to `True`.

    !!! note
        CodeFusion Studio will produce 'project' entries in the .cfsconfig files
        even for projects that don't exist. These projects will not contain a
        platform_config structure and will otherwise be ignored here. 
    """
    core_id: str = Field(
        alias='CoreId',
        description='Id of the core in use for this configured project'
    )
    firmware_platform: Optional[str] = Field(
        alias='FirmwarePlatform', default=None,
        description='Firmware platform in use for this configured project'
    )
    platform_config: Optional[dict[str, Any]] = Field(
        alias='PlatformConfig', default=None,
        description='Platform specific configuration options'
    )
    models: Optional[list[ModelConfig]] = Field (
        alias='AIModels', default=None,
        description='List of AI models within project')

    enabled: Optional[bool] = Field(
        alias='AIEnabled', default=True,
        description="Whether this project should be included in code generation"
    )


    model_config = ConfigDict(validate_by_name=True, 
                              serialize_by_alias=True, 
                              extra="allow")

    def __validate_project_name_exists(self) -> None:
        """
        Validates that the 'ProjectName' key exists in the platform 
        configuration.

        Raises:
            ValueError: If 'ProjectName' is not set in the platform 
                configuration.
        """
        if self.platform_config:
            prj_name = self.platform_config.get('ProjectName')
            if prj_name is None:
                raise ValueError('PlatformConfig.PojectName is not set')

    def __case_consistency(self) -> None:
        """
        Ensures case consistency by converting certain attributes to 
        uppercase.
        """
        self.core_id = self.core_id.upper()
        if self.firmware_platform is not None:
            self.firmware_platform = self.firmware_platform.upper()

    @model_validator(mode='after')
    def _validate_model(self) -> Self:
        """
        Validates the model after initialization.

        Ensures case consistency and validates that the project name exists.

        Returns:
            The validated instance of the class.
        """
        self.__case_consistency()
        self.__validate_project_name_exists()
        return self

    @property
    def name(self) -> str:
        """
        Retrieves the project name from the platform configuration.

        Returns:
            The project name, or 'unnamed' if there is no platform configuration.

        Raises:
            RuntimeError: If `ProjectName` is not set or is not a string.
        """
        if self.platform_config is None:
            return "unnamed"
        prj_name = self.platform_config.get('ProjectName')
        if prj_name is None:
            raise RuntimeError('PlatformConfig.ProjectName is not set')
        elif not isinstance(prj_name, str):
            raise RuntimeError('PlatformConfig.ProjectName is not a string')
        else:
            return prj_name


class CfsConfig(BaseModel):
    """
    Represents the CFS configuration file.

    Attributes:
        soc: The system on chip (soc) which the configuration targets
        package: Soc package.
        aiconfig: Global AI configuration 
        projects: A list of configured projects defined in the CFS 
            configuration.
    """
    soc: str = Field(
        alias='Soc',
        description='System on Chip declared in the root of the cfsconfig file'
    )
    package: Optional[str] = Field(
        alias='Package', default=None,
        description='Soc package.'
    )
    aiconfig: AiConfig = Field(
        alias='AiConfig', default_factory=AiConfig,
        description='Global AI configuration'
    )
    projects: list[ConfiguredProject] = Field(
        alias='Projects',
        description='Configured projects in this configuration'
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

    def __case_consistency(self) -> None:
        """
        Ensures case consistency by converting certain attributes to 
        uppercase.
        """
        self.soc = self.soc.upper()

    def __validate_enableds(self) -> None:
        """
        Validates that at least one project and one model within the project are
        enabled. Also validates that each accelerator has a single core owner.

        Raises:
            ValueError: If no projects or models are enabled.
        """
        prj_hist: dict[str, ModelConfig] = dict()
        found_enabled = False
        for _, cfg in self.iter_enabled():
            found_enabled = True

            # Only allow a single instance of an accelerator, independent of
            # the host core.
            if not cfg.target.accelerator:
                continue
            acc = cfg.target.accelerator
            if acc in prj_hist:
                raise ValueError(f'{acc} already has {prj_hist[acc].name} '\
                                  'targeting it')
            prj_hist[acc] = cfg

        if not found_enabled:
            raise RuntimeError('No enabled configurations found')


    @model_validator(mode='after')
    def _validate_model(self) -> Self:
        """
        Validates the model after initialization.

        Ensures case consistency and validates that the enabled model 
            confiturations
        make sense.

        Returns:
            The validated instance of the class.
        """
        self.__case_consistency()
        self.__validate_enableds()
        return self

    def iter_enabled(self) -> Iterator[tuple[ConfiguredProject, ModelConfig]]:
        """
        Iterates through the enabled projects and their associated AI model 
            configurations.

        Yields:
            A tuple containing the configured project and the model 
                configuration.
        """
        for prj in self.projects:
            if not prj.enabled:
                continue
            if not prj.models:
                continue
            for cfg in prj.models:
                if not cfg.enabled:
                    continue
                yield (prj, cfg)

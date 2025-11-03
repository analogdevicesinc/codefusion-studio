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


from pathlib import Path
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer

from cfsai_types.config.aiconfig import ConfigBackend
from cfsai_types.config.targets import ResolvedExplicitTarget


class ModelInfo(BaseModel):
    """
    Information about the model file.

    Attributes:
        file: Path to the model file.
    """

    file: Path

    @field_serializer('file')
    def _unix_path_style(self, file: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            file: The file path to serialize.

        Returns:
            The serialized file path in Unix-style format.
        """
        return file.as_posix()

class ProjectInfo(BaseModel):
    """
    Information about the project.

    Attributes:
        name: Name of the project which for a cfs project is the directory name 
            in the cfs workspace.
        workspace: Current working directory for code generation. For a cfs project 
            this is the path to the cfs workspace.
        out_dir: Relative path to output the generated code within the project.

    !!! note
        This class essentially holds a single path that is split in the instance
        attributes. The final path to output the is `workspace / out_dir / name`.
    """
    name: str 
    workspace: Path 
    out_dir: Path 

    @field_serializer('workspace')
    def _workspace_unix_path_style(self, workspace: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            workspace: The file path to serialize.

        Returns:
            The serialized file path in Unix-style format.
        """
        return workspace.as_posix()

    @field_serializer('out_dir')
    def _out_unix_path_style(self, out_dir: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            out_dir: The file path to serialize.

        Returns:
            The serialized file path in Unix-style format.
        """
        return out_dir.as_posix()

    def output_path(self) -> Path:
        """
        Computes the final path the the directory where the generated code 
        should be written.

        Returns:
            Path to output directory to write files.
        """
        return self.workspace / self.name / self.out_dir

class VerifiedConfig(BaseModel):
    """
    Configuration with describes the information required to generate code for 
    a single model which is verified to be a valid supported configuration.

    Attributes:
        name: Name of the model configuration.
        prj_info: Project information for this model configuration.
        model_info: Infomation about the model.
        target: Resolved target information.
        backend: Backend settings to use for code generation.
        izer_network_config_file: Optional path to the izer network description 
            file.

    !!! warning
        Do not construct this object yourself, it is intended to be constructed 
        after internal validation has been done to verify the user provided 
        `CfsConfig`.
    """
    name: str
    prj_info: ProjectInfo
    model_info: ModelInfo
    target: ResolvedExplicitTarget
    backend: ConfigBackend
    izer_network_config_file: Optional[Path]

    model_config = ConfigDict(frozen=True)

    @field_serializer('izer_network_config_file')
    def path_unix_path_style(
            self,
            izer_network_config_file: Optional[Path]
        ) -> Optional[str]:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            izer_network_config_file: Optional file path to serialize.

        Returns:
            The serialized file path in Unix-style format or `None` if no path 
                is provided.
        """
        if izer_network_config_file is not None:
            return izer_network_config_file.as_posix()
        return None


class VerifiedBackendConfig(BaseModel):
    """
    Backend configuration information to provide when invoking the backend.

    Attributes:
        items: List of the model configurations which the backend should 
            generate code for.
    """
    items: list[VerifiedConfig]

    model_config = ConfigDict(frozen=True)

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
from pathlib import Path
from typing import Any, Optional, Self, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_serializer,
    field_validator,
    model_validator,
)

from cfsai_types import __version__

# The versions are synced currently
_CFS_VERSION = __version__
"""
str: The version of the CFS firmware.
"""

_DEFAULT_CACHE_BASE = Path.home() / 'cfs' / _CFS_VERSION / '.cfsai'
"""Path: The default base directory for caching CFS AI-related files."""

_DOC_DEFAULT_CACHE_BASE = Path('$HOME') / 'cfs' / _CFS_VERSION / '.cfsai'
"""Path: Documentation version of default base directory for caching CFS 
AI-related files."""


def _is_supported_url(x: str) -> bool:
    """
    Checks if a given string is a supported HTTP/HTTPS URL.

    Args:
        x: The string to check.

    Returns:
        True if the string is a valid HTTP/HTTPS URL, False otherwise.
    """
    return re.match(r'^https?://', x) is not None

class FileInfo(BaseModel):
    """
    Manage the model file information.

    Attributes:
        model: File or URL path to the model file.
        network: File or URL path to the network configuration file.
    """
    model: Union[HttpUrl, Path] = Field(
        alias="Model",
        description="Path or URL to the model file.",
        json_schema_extra={
            'anyOf': [
                {
                    'type': 'string',
                    'format': 'uri',
                    'description': 'HTTP/HTTPS URL'
                },
                {
                    'type': 'string',
                    'format': 'path',
                    'description': 'File system path'
                }
            ],
            'type': 'string'
        },
    )
    network: Optional[Union[HttpUrl, Path]] = Field(
        alias="NetworkConfig", default=None,
        description="Path or URL to the network config file.",
        json_schema_extra={
            'anyOf': [
                {'type': 'string', 'format': 'uri', 'description': 'HTTP/HTTPS URL'},
                {'type': 'string', 'format': 'path', 'description': 'File system path'}
            ],
            'type': 'string'
        },
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)
    
    @field_serializer('model')
    def _unix_model_style(self, file: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            file: File path to serialize.

        Returns:
            The output directory path in unix style.
        """
        if isinstance(file, Path):
            return file.as_posix()
        else:
            return file

    @field_serializer('network')
    def _unix_network_style(self, file: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Args:
            file: File path to serialize.

        Returns:
            The output directory path in unix style.
        """
        if isinstance(file, Path):
            return file.as_posix()
        else:
            return file
        
    @field_validator('model', mode='plain')
    @classmethod
    def _check_model(cls, v: Any) -> Union[HttpUrl, Path]:
        """
        Validates the model input string.

        v: Input model string.

        Returns:
            The correctly formatted model path/URL.
        """
        if isinstance(v, str):
            if _is_supported_url(v):
                return HttpUrl(v)
            else:
                return Path(v)
        elif isinstance(v, (Path, HttpUrl)):
            return v
        else:
            raise TypeError('Invalid `Model file` type')

    @field_validator('network', mode='plain')
    @classmethod
    def _check_network(cls, v: Any) -> Optional[Union[HttpUrl, Path]]:
        """
        Validates the networ input string.

        v: Input network string.

        Returns:
            The correctly formatted network path/URL.
        """
        if isinstance(v, str):
            if _is_supported_url(v):
                return HttpUrl(v)
            else:
                return Path(v)
        elif isinstance(v, (Path, HttpUrl)):
            return v
        elif not v:
            return None
        else:
            raise TypeError('Invalid `Network Config file` type')
    

class ConfigTargetExplicit(BaseModel):
    """
    Represents an explicit target for code generation representing all relevant
    user configurable parameters for a particular soc.

    Attributes:
        core: Processing core on the soc to target.
        accelerator: Optional accelerator to target via the `core`. 
            Defaults to `None`.
        runtime: Optional graph execution runtime e.g. tflm. Defaults to `None`.
    """
    core: str = Field(
        alias='Core',
        description="Processing core on the soc to target"
    )
    accelerator: Optional[str] = Field(
        alias='Accelerator', default=None,
        description="Optional accelerator to target via the `core`. " \
        "Defaults to `None`"
    )
    runtime: Optional[str] = Field(
        alias='Runtime', default=None,
        description="Optional graph execution runtime e.g. tflm. " \
        "Defaults to `None`"
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        """
        Ensures case consistency by converting certain attributes to uppercase.

        Returns:
            The validated instance of the class.
        """
        self.core = self.core.upper()
        if self.accelerator:
            self.accelerator = self.accelerator.upper()
        if self.runtime:
            self.runtime = self.runtime.upper()
        return self

class ConfigBackend(BaseModel):
    """
    Represents the user configured choice of backend and any accompaning 
    exetension settings.

    Attributes:
        name: Name of the backend.
        extensions: Backend specific configuration settings. Defaults to `None`.
    """
    name: str = Field(
        alias='Name',
        description="Name of the backend"
    )
    extensions: Any = Field(
        alias='Extensions', default=None,
        description="Backend specific configuration settings. " \
        "Defaults to `None`"
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

class ModelConfig(BaseModel):
    """
    Model configuration information. Stores all the necessary data related 
    to the user configuration.
    
    Attributes:
        name: Unique name of the configuration.
        model_file_info: Model file information.
        out_dir: Path to output directory relative to the project root. 
            Defaults to the current directory.
        izer_network_config_file: Optional path to the izer network 
            configuration file. Defaults to `None`.
        target: Target configuration for model deployment.
        backend: Optional backend specific configuration information. 
            Defaults to `None`.
        enabled: Whether this configuration is enabled for code generation. 
            Defaults to `False`.
    """
    name: str = Field(
        alias='Name',
        description='Unique name of the configuration'
    )
    file_info: FileInfo = Field(
        alias='Files',
        description="File data."
    )
    out_dir: Path = Field(
        alias='OutDir', default_factory=lambda: Path("."),
        json_schema_extra={
            'type': 'string',
            'format': 'path',
            'default' : '.'
        },
        description='Path to the output directory'
    )
    target: ConfigTargetExplicit = Field(
        alias='Target',
        description='Target configuration for model deployment'
    )
    backend: Optional[ConfigBackend] = Field(
        alias='Backend', default=None,
        description="Optional backend specific configuration information. " \
        "Defaults to `None`"
    )
    enabled: bool = Field(
        alias='Enabled', default=False,
        description="Whether this configuration is enabled for code " \
        "generation. Defaults to `False`"
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

    @field_serializer('out_dir')
    def _unix_path_style(self, out_dir: Path) -> str:
        """
        Serializes the file path to use Unix-style paths for consistency.

        Returns:
            The output directory path in unix style.
        """
        return out_dir.as_posix()
        
class CacheConfig(BaseModel):
    """
    Cache related configuration which controls the behaviour of how and where 
    files retrieved via URLs are stored.

    Attributes:
        base_dir: The base directory to store and look for cached files.
    """
    base_dir: Path = Field(
        alias='BaseDir', default_factory=lambda: _DEFAULT_CACHE_BASE,
        json_schema_extra={
            'type': 'string',
            'format': 'path',
            'default': _DOC_DEFAULT_CACHE_BASE.as_posix()
        },
        description='Base directory to cache file data'
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

class AiConfig(BaseModel):
    """
    Global AI configuration information.

    Attributes:
        cache_config: Global cache configuration information
    """
    cache_config: CacheConfig = Field(
        alias='CacheConfig', default_factory=CacheConfig,
        description='Configuration options to customize the cache behaviour'
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

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

import os
from enum import Enum
from typing import Literal, Optional, Protocol, Self, Union

from pydantic import BaseModel, Field

from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.support.backend import SupportedBackend


class RegistryLoginInfo(BaseModel):
    """
    Login information to log into a docker registry.

    Attributes:
        username: Username to use when logging in.
        password: Password to use when logging in.
        registry: Docker registry to log into.
    """
    username: str
    password: str
    registry: str

    @classmethod
    def from_env(cls) -> Optional[Self]:
        """
        Builder method to construct an object from environment variables.
        The registry used is "docker.cloudsmith.io/adi/ai-fusion/" for 
        production and "docker.cloudsmith.io/adi/ai-fusion-dev/" for 
        development.

        Returns:
            An instance of `RegistryLoginInfo` if the required information could 
                be found in the os environment variables else `None`.
        """
        username = os.environ.get('CFSAI_USERNAME')
        password = os.environ.get('CFSAI_API_KEY')
        app_env = os.environ.get('APP_ENV')

        if username and password:
            if app_env and app_env == 'development':
                registry = 'docker.cloudsmith.io/adi/ai-fusion-dev/'
            else:
                registry = 'docker.cloudsmith.io/adi/ai-fusion/'
            return cls(
                username=username, 
                password=password,
                registry=registry
            )
        else:
            return None

class SupportedImage(BaseModel):
    """
    Supported container image information.

    Attributes:
        name: Name of the image.
        requires_credentials: Whether the image is private and requires 
            credentials to access.
    """
    name: str
    requires_credentials: bool


class BackendProtocol(str, Enum):
    """
    Communication protocols to communicate with a backend.

    Attributes:
        HTTP: Use HTTP as the communication interface.
        DIRECT: Directly execute the backend.
    """
    HTTP = "http"
    DIRECT = "direct"
    # Add more protocols here in the future if required


class LocalBackend(BaseModel):
    """
    Marker type for a 'local' backend which can run in the same interpreter as 
    the main application.

    Attributes:
        kind: Discriminator attribute for pydantic to differentiate in a `Union`.
    """
    kind: Literal["local"] = "local"


class ContainerBackend(BaseModel):
    """
    Container backend type supplying information about backend's which run 
    inside a container environment.

    Attributes:
        kind: Discriminator attribute from pydantic to differentiate in a `Union`.
        protocol: Communication protocol the backend expects to use.
        image: Information about the container image.
    """
    kind: Literal["container"] = "container"
    protocol: BackendProtocol
    image: SupportedImage


# Union type for the enum variants
BackendKind = Union[LocalBackend, ContainerBackend]
"""Union of Local and Container backends discriminated using the `kind` attribute."""


class BackendInfo(BaseModel):
    """
    Top level backend information type which backends use to tell the main 
    application who they are and how to execute them.

    Attributes:
        kind: Type of backend e.g. LocalBackend or Contained backend and 
            associated metadata.
        name: Name of the backend.
    """
    kind: BackendKind = Field(..., discriminator='kind')
    name: str


class BackendApi(Protocol):
    """
    Backend API protocol which backends can implement. This is mostly for use in 
    type definitions which the type checker can use to perform sub-structural 
    type checking.
    """

    def build(self, cfgs: VerifiedBackendConfig) -> None:
        """
        The build method accepts the verified backend configuration and generates
        the source code for all of the model configurations there in for the 
        provided target.
        
        Args:
            cfgs: Contains a list of backend level configurations containing
                details of everything the backend should process.
        """
        ...

BackendApiMethodName = Literal['build']
"""
String literal names of the backend API. Used by CLI to determine if a string 
argument is a valid API subcommand.
"""


class Backend(Protocol):
    """
    Backend protocol which backends should implement which acts as the interface
    to communicate with the main application.
    """

    @classmethod
    def info(cls) -> BackendInfo:
        """
        Information method which is used by the main application to collect 
        information about the backends.

        Returns:
            Backend information detailing who the backend is and how to execute
                it.
        """
        ...

    @classmethod
    def support(cls) -> SupportedBackend:
        """
        Interface to collect the backend support information detailing the kinds
        of configurations/targets which the backend can support. This 
        information is used to find a suitable backend for a user configuration.

        Returns:
            Backend support information for targeting.
        """
        ...

    def api(self) -> BackendApi:
        """
        Interface for the main api to gain access to the backend api which 
        actually implements the backend functionality.

        Returns:
            An instance of the `BackendApi` which the main application can use.
        """
        ...





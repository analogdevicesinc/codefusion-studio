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

import logging
import os
from pathlib import Path, PurePosixPath
from typing import Any, Optional, Union

from docker import DockerClient
from docker.errors import APIError, ImageNotFound
from docker.models.containers import Container

from cfsai_types.backend_api import RegistryLoginInfo, SupportedImage
from cfsai_types.config.verified import (
    ModelInfo,
    ProjectInfo,
    VerifiedBackendConfig,
    VerifiedConfig,
)
from cfsai_types.exceptions import ContainerError

logger = logging.getLogger(__name__)

def get_current_uid() -> int:
    """Get current user ID in a portable way."""
    if hasattr(os, 'getuid'):
        return os.getuid()  # type: ignore[attr-defined]
    else:
        # On Windows, return a default UID (typically 0 for root-like behavior)
        return 1000


def get_current_gid() -> int:
    """Get current group ID in a portable way."""
    if hasattr(os, 'getgid'):
        return os.getgid()  # type: ignore[attr-defined]
    else:
        # On Windows, return a default GID
        return 1000


CONTAINER_MODELS_PATH = PurePosixPath('/mnt/models')
CONTAINER_OUT_PATH = PurePosixPath('/mnt/out')
CONTAINER_INPUTS_PATH = PurePosixPath('/mnt/inputs')


class DockerError(ContainerError):
    """Docker specific container error type."""

    def __init__(self, image: str, msg: str) -> None:
        """
        Initializes a DockerError instance.

        Args:
            image: Container image name.
            msg: Error message.
        """
        super().__init__('docker', image, msg)


def lazy_install(image: SupportedImage) -> None:
    """
    Lazily attempt to pull the required container image.

    Args:
        image: Image metadata.
    
    Raises:
        DockerError: If credentials are required to pull the image and the 
            credentials were not found as environment variables.
        DockerError: If credentials are required and we failed to log into the 
            registry.
        DockerError: If we failed to pull the image from the registry.
    """
    client = DockerClient()

    try:
        client.images.get(image.name)
    except ImageNotFound:
        if image.requires_credentials:
            info = RegistryLoginInfo.from_env()
            if info is None:
                raise DockerError(
                    image=image.name,
                    msg='Credentials are required to pull this image. ' \
                    'Please set the "CFSAI_USERNAME" and "CFSAI_API_KEY"' \
                    ' environment variables'
                )
            logger.debug('Attempting login')
            try:
                client.login(
                    username=info.username,
                    password=info.password,
                    registry=info.registry
                )
            except APIError as e:
                raise DockerError(
                    image=image.name,
                    msg=f'Failed to login into the registry "{info.registry}"'
                ) from e
            logger.debug('Login successful')
            logger.debug(f'Using image {image.name}')
        try:
            logger.info('Downloading container image...')
            client.images.pull(image.name)
            logger.info('Download complete')
        except APIError as e:
            raise DockerError(
                image=image.name,
                msg=f'Failed to pull the image "{image.name}"\n{e}'
            ) from e

def containerize_config(cfg: VerifiedBackendConfig) -> VerifiedBackendConfig:
    """
    Convert the host backend configuration to a new configuration with all of 
    the paths and other related information converted to the format expected 
    within the container.

    Args:
        cfg: Host backend configuration to convert into the container format.
    
    Returns:
        A new backend configuration object with identical information but 
            formatted according to how the backend expects.
    """
    ret = []
    for v in cfg.items:
        izer_yaml_file = Path(CONTAINER_MODELS_PATH) / v.izer_network_config_file.name \
            if v.izer_network_config_file else None

        ret.append(VerifiedConfig(
            name = v.name,
            prj_info=ProjectInfo(
                name=v.prj_info.name,
                workspace=Path(CONTAINER_OUT_PATH),
                out_dir=v.prj_info.out_dir
            ),
            model_info=ModelInfo(
                file=Path(CONTAINER_MODELS_PATH) / v.model_info.file.name
            ),
            target=v.target,
            backend=v.backend,
            izer_network_config_file=izer_yaml_file
        ))

    return VerifiedBackendConfig(items=ret)


def host_port(container: Container) -> Optional[int]:
    """
    Find the host port that is mapped onto the container `5000/tcp` port which
    is used when communicated with a backend via a RESTAPI.

    Args:
        container: The container to search for the port mapping.
    
    Returns:
        An integer representing the host port if it could be found, else `None`.
    """
    container_port = '5000/tcp'

    container.reload()
    port_info: dict[str, Any] = container.attrs['NetworkSettings']['Ports']
    if port_info.get(container_port) is not None:
        mappings = port_info[container_port]
        if len(mappings) > 0:
            return mappings[0]['HostPort']
    return None

def start_container(
        image_name: str,
        host_cfg: VerifiedBackendConfig,
        extra_volumes: Optional[dict[Path, dict[str, str]]] = None,
        command: Optional[Union[str, list[str]]] = None,
) -> Container:
    """
    Start the container based on the image name with the required data passed 
    through as volumes.

    Args:
        image_name: Name of the image.
        host_cfg: Host backend configuration.
        extra_volumes: Optional additional volumes to pass through to the 
            container. Defaults to `None`.
        command: Optional command to start the container with. Defaults to 
            `None`.
    
    Raises:
        DockerError: If we could not connect to the docker server.
        DockerError: If we could not run the container from the `image_name`.
    """
    # Use sets here to avoid attempting to open volumes for same files separately
    prj_paths = list(set(
        [x.prj_info.workspace / x.prj_info.name for x in host_cfg.items]
    ))
    model_paths = list(set([x.model_info.file for x in host_cfg.items]))

    try:
        client = DockerClient()
    except Exception as e:
        raise DockerError(
            image_name, f'Could not connect to the docker server\n{e}'
        ) from e

    model_volumes = { x.absolute():{
        'bind': str(CONTAINER_MODELS_PATH / x.name),
        'mode': 'ro'
    } for x in model_paths }

    prj_volumes = { x.absolute():{
        'bind': str(CONTAINER_OUT_PATH / x.name),
        'mode': 'rw'
    } for x in prj_paths }

    volumes = {**model_volumes, **prj_volumes}

    if extra_volumes:
        volumes.update(extra_volumes)

    izer_net_config_files = list(set(
        [x.izer_network_config_file for x in host_cfg.items \
         if x.izer_network_config_file]
    ))
    if izer_net_config_files:
        volumes.update({
            x.absolute():{
                'bind': str(CONTAINER_MODELS_PATH / x.name),
                'mode': 'ro'
            } for x in izer_net_config_files
        })

    # Automatically pass host UID and GID as environment variables
    environment = {
        'HOST_UID': str(get_current_uid()),
        'HOST_GID': str(get_current_gid())
    }

    try:
        container = client.containers.run(
            image_name,
            detach=True,
            ports={
                '5000/tcp':('127.0.0.1', None)
            },
            volumes=volumes,
            environment=environment,
            remove=True,
            command=command,
        )
    except Exception as e:
        raise DockerError(
            image_name,
            'Could not spawn a container'
        ) from e

    return container

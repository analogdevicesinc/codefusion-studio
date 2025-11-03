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


import json
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from pydantic import ValidationError

from cfsai.container.utils import (
    DockerError,
    containerize_config,
    lazy_install,
    start_container,
)
from cfsai_types.backend_api import BackendApi, SupportedImage
from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.logging import LogMessage

logger = logging.getLogger(__name__)

def _create_output_dirs(
        host_cfg: VerifiedBackendConfig,
        ) -> None:
    """
    Create output directories used by the configs, because if
    the container has to crate them there may be permission
    issues on the host.

    Args:
        host_cfg: Host backend configuration.
        logger: Host side logger to use.
    """
    for cfg in host_cfg.items:
        # The only contained backend is currently izer,
        # so this check may be redundant but is here for futureproofing.
        if cfg.backend.name == "izer":
            dir=cfg.prj_info.output_path()
            default_dir = Path('src') / 'adi_cnn'
            # if not overriden, all output will go to src subdirectory
            if cfg.prj_info.out_dir == Path("."):
                dir = dir / default_dir
            try:
                os.makedirs(dir, exist_ok=True)
            except Exception as e:
                logger.warning(f'Failure trying to create {dir}: {e}')


def _execute_command(
        image_name: str,
        host_cfg: VerifiedBackendConfig,
        command: str,
    ) -> None:
    """
    Run the container with the necessary backend API command.

    Args:
        image_name: Name of the image start the container from.
        host_cfg: Host backend configuration.
        command: Command to start the container with.
        logger: Host side logger to use.
    
    Raises:
        DockerError: If the container reports an error.
    """
    container_config = containerize_config(host_cfg)
    with tempfile.NamedTemporaryFile(mode='w+', newline='', delete=False) as fd:
        tmp_path = Path(fd.name)
        fd.write(container_config.model_dump_json())
    _create_output_dirs(host_cfg)
    try:
        container = start_container(
            image_name,
            host_cfg=host_cfg,
            extra_volumes={
                tmp_path : {
                    'bind' : str(PurePosixPath('/mnt/config/verified.json')),
                    'mode' : 'ro'
                }
            },
            command=command,
        )
        for log in container.logs(stream=True, follow=True):
            line = log.decode('utf-8').strip()
            try:
                parsed = json.loads(line)
            except json.JSONDecodeError:
                logger.debug(line)
                continue
            try:
                log = LogMessage.model_validate(parsed)
                level = logging.getLevelNamesMapping().get(log.level, logging.INFO)
                if level < logging.ERROR:
                    logger.log(
                        level, 
                        log.msg, 
                        extra={'file_created_event': log.file_created_event}
                    )
                else:
                    # Must be an error re-raise
                    raise DockerError(
                        image=image_name, msg=log.msg
                    )
                continue
            except ValidationError:
                logger.debug(line)
    finally:
        os.remove(tmp_path)


@dataclass
class ContainerExecutor(BackendApi):
    """
    Backend API implementation which directly executes the docker containers 
    on the host side with the appropriate API command and re-logs any container
    logs.

    Attributes:
        image: Image to start the container with.
    """
    image: SupportedImage

    def build(self, cfg: VerifiedBackendConfig) -> None:
        """
        Implementation of the build method for the `BackendApi` which directly
        executes the containers.

        Args:
            cfg: Host backend configuration.
            logger: Host side logger.
        """
        lazy_install(self.image)
        _execute_command(self.image.name, cfg, 'build')


    def check(self, cfg: VerifiedBackendConfig) -> None:
        """
        Implementation of the check method for the `BackendApi` which directly
        executes the containers.

        Args:
            cfg: Host backend configuration.
            logger: Host side logger.
        """
        lazy_install(self.image)
        _execute_command(self.image.name, cfg, 'check')


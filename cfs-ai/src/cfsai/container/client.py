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
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

import requests
from docker.models.containers import Container
from pydantic import TypeAdapter, ValidationError

from cfsai.container.utils import (
    containerize_config,
    host_port,
    lazy_install,
    start_container,
)
from cfsai_types.backend_api import BackendApi, SupportedImage
from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.exceptions import SerializedError
from cfsai_types.logging import LogMessage

logger = logging.getLogger(__name__)

def _collect_logs(
        container: Container,
        stop_event: threading.Event
    ) -> None:
    """
    Collect the logs from the running container and re-log them host side.

    Args:
        logger: Host side logger to use.
        container: Running backend container to collect logs from.
        stop_event: Stop event which causes the function break and return.

    !!! warning
        This function will run indefinitely unless the container dies which 
        it should not unless explicitely stopped or the stop_event is set. 
        Use carefully.
    """
    for log in container.logs(stream=True, follow=True):
        if stop_event.is_set():
            break
        line = log.decode('utf-8').strip()
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            logger.debug(line)
            continue

        try:
            log = LogMessage.model_validate(parsed)
            log = LogMessage.model_validate(parsed)
            level = logging.getLevelNamesMapping().get(log.level, logging.INFO)
            if level < logging.ERROR:
                logger.log(
                    level, 
                    log.msg, 
                    extra={'file_created_event': log.file_created_event}
                )
            else:
                logger.error(
                    log.msg,
                    extra={'file_created_event': log.file_created_event}
                )
            continue
        except ValidationError:
            logger.debug(line)
            continue


def wait_until_container_ready(
        container: Container,
        timeout: float = 30.0,
        interval: float = 0.5
    ) -> int:
    """
    Wait until the container server is up and running by checking the '/health'
    endpoint until a successful return code is returned or the timeout is 
    reached.

    Args:
        container: Container to wait for.
        timeout: Time to wait in seconds before timing out. Defaults to 30 
            seconds.
        interval: Time interval in seconds to query the server. Defaults to 0.5
            seconds.
    
    Returns:
        The host port mapped to container port `5000/tcp`.

    Raises:
        TimeoutError: If the timout is reached.
    """
    start = time.time()
    while time.time() - start < timeout:
        try:
            port = host_port(container)
            if port is None:
                continue
            response = requests.get(
                f"http://localhost:{port}/health",
                timeout=interval # Use same timeout as query interval
            )
            if response.status_code == 200:
                return port
        except requests.RequestException:
            pass
        time.sleep(interval)
    raise TimeoutError(
        "Service in container did not become ready in time."
    )


@contextmanager
def start_server(
        image_name: str,
        host_cfg: VerifiedBackendConfig
    ) -> Iterator[tuple[int, VerifiedBackendConfig]]:
    """
    Start the server container and spawn a logging collection thread while the 
    server is processing.

    Args:
        image_name: Name of the image to start the container from.
        host_cfg: Host backend configuration.
        logger: Host side logger.
    
    Yields:
        A tuple of the host side port to use and the container side backend 
            configuration to send.
    """
    container = None
    thread = None
    stop_event = threading.Event()
    try:
        container = start_container(image_name, host_cfg)
        port = wait_until_container_ready(container)
        thread = threading.Thread(
            target=_collect_logs, args=(logger, container, stop_event)
        )
        thread.start()
        yield port, containerize_config(host_cfg)
    except Exception as e:
        if container:
            _log = container.logs().decode("utf-8")
            logger.debug(f'Container logs:\n\n{_log}')
            raise e
    finally:
        if container:
            container.stop()

        if thread:
            stop_event.set()
            thread.join(timeout=5)


@dataclass
class ContainerClient(BackendApi):
    """
    Backend API implementation which communicates with container REST API server 
    with the appropriate API endpoints and re-logs any container logs.

    Attributes:
        image: Image to start the container with.
    """
    image: SupportedImage

    def _post_config(
            self,
            port: int,
            endpoint: str,
            cfg: VerifiedBackendConfig
        ) -> None:
        """
        Send the container backend configuration to API endpoint as an HTTP 
        POST request.

        Args:
            port: Host side port to use.
            endpoint: API endpoint to use.
            cfg: Container side backend configuration.
            logger: Host logger.
        
        Raises:
            Exception: If the endpoint returned a structured serialized error.
            RuntimeError: If the an error code was returned with no structured,
                serialized error information.
        """
        try:
            ret = requests.post( # noqa: S113 This could be long running
                f'http://localhost:{port}/{endpoint}',
                # `contain_config` adapts the configuration to the container 
                # environment e.g. changing the paths to map to the container 
                # equivalents
                data=cfg.model_dump_json(),
                headers={'Content-Type': 'application/json'}
            )
            ret.raise_for_status()
        except requests.HTTPError as e:
            # An error has occured inside the container. We need to try to read
            # the returned error data (if any) and construct the appropriate error
            # type host side and re-raise it so that a reasonable error message
            # is reported
            try:
                err = e.response.json()
                adapter = TypeAdapter(SerializedError)
                err_obj = adapter.validate_python(err)
                # Lets raise a general exception. The detail of the error was
                # already formatted so we shall pass it up to be printed by the
                # CLI
                raise Exception(err_obj.detail) from e
            except (ValueError, ValidationError):
                pass
            raise RuntimeError('Unknown server error occurred') from e

    def build(self, cfg: VerifiedBackendConfig) -> None:
        """
        Implementation of the build method for the `BackendApi` which executes 
        the build API via a REST API being served in the container.

        Args:
            cfg: Host backend configurtion.
            logger: Host side logger.
        """
        lazy_install(self.image)
        with start_server(self.image.name, cfg) as (port, container_cfg):
            self._post_config(port, 'build', container_cfg)


    def check(self, cfg: VerifiedBackendConfig) -> None:
        """
        Implementation of the check method for the `BackendApi` which executes 
        the check API via a REST API being served in the container.

        Args:
            cfg: Host backend configurtion.
            logger: Host side logger.
        """
        lazy_install(self.image)
        with start_server(self.image.name, cfg) as (port, container_cfg):
            self._post_config(port, 'check', container_cfg)

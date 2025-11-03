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
from pathlib import Path

from cfsai.backend_runtime.logger import setup_logger
from cfsai_types.backend_api import BackendApi, BackendApiMethodName
from cfsai_types.config.verified import VerifiedBackendConfig

logger = logging.getLogger(__name__)

def _handle_error(e: Exception) -> None:
    """
    Handle an error raised from the backend API implementation by logging the 
    error as structured JSON over the containers standout output.

    Args:
        logger: Backend logger.
        e: Exception raised by the API.
    """
    error_msg = str(e)
    logger.error(error_msg)

def backend_executor(api: BackendApi, command: BackendApiMethodName) -> None:
    """
    Backend executor which serves as the entry to all containers running in 
    direct execution mode.

    Args:
        api: Backend API implementation to use.
        command: Backend API to invoke.
    """
    setup_logger()

    with open(Path('/mnt/config/verified.json'), encoding='utf-8') as fd:
        data = json.load(fd)
        cfg = VerifiedBackendConfig.model_validate(data)

    try:
        api.build(cfg)
    except Exception as e:
        _handle_error(e)

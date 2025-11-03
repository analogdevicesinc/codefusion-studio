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

from cfsai_backend_max7800x.direct_api import IzerApi
from cfsai_backend_max7800x.extensions import CfsaiIzerExtensions
from cfsai_types.backend_api import (
    Backend,
    BackendApi,
    BackendInfo,
    LocalBackend,
)
from cfsai_types.config.targets import BackendTarget, ExplicitTarget
from cfsai_types.support.backend import SupportedBackend

app_env = os.environ.get('APP_ENV')
if app_env and app_env == 'development':
    IMAGE_NAME = 'docker.cloudsmith.io/adi/ai-fusion-dev/cfsai-izer:develop-latest'
    REQUIRES_CREDENTIALS = True
else:
    IMAGE_NAME = 'docker.cloudsmith.io/adi/ai-fusion/cfsai-izer:latest'
    REQUIRES_CREDENTIALS = False

class Izer(Backend):
    """Izer backend implementation."""
    @classmethod
    def info(cls) -> BackendInfo:
        """
        Backend information.

        Returns:
            Backend information.
        """
        return BackendInfo(
            name='izer',
            kind=LocalBackend()
        )

    def api(self) -> BackendApi:
        """
        Backend API.

        Returns:
            Backend API.
        """
        return IzerApi()

    @classmethod
    def support(cls) -> SupportedBackend:
        """
        Support information.

        Returns:
            Support information. 
        """
        return SupportedBackend(
            FirmwarePlatforms=["msdk"],
            Targets=[
                BackendTarget(
                    Hardware=ExplicitTarget(
                        Soc='max78002', Core='cm4', Accelerator='cnn'
                    ),
                    FirmwarePlatform='msdk'
                )
            ],
            Extensions=CfsaiIzerExtensions.model_json_schema()
        )

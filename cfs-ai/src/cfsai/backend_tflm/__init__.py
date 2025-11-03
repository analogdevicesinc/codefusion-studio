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


from pydantic.type_adapter import TypeAdapter

from cfsai.backend_tflm.extensions import CfsaiTflmExtensions
from cfsai.backend_tflm.local import LocalCfsaiTflm
from cfsai_types.backend_api import Backend, BackendApi, BackendInfo, LocalBackend
from cfsai_types.config.targets import BackendTarget, GenericTarget
from cfsai_types.support.backend import SupportedBackend


class CfsaiTflm(Backend):
    """CFSAI TFLM backend implemention."""

    @classmethod
    def info(cls) -> BackendInfo:
        """
        Backend information.

        Returns:
            Backend information.
        """
        return BackendInfo(
            name='tflm',
            kind=LocalBackend()
        )

    def api(self) -> BackendApi:
        """
        Backend API.

        Returns:
            Backend API.
        """
        return LocalCfsaiTflm()

    @classmethod
    def support(cls) -> SupportedBackend:
        """
        Support inforamtion.

        Returns:
            Support inforamtion. 
        """
        return SupportedBackend(
            Runtimes=['tflm'],
            Targets=[
                BackendTarget(
                    Hardware=GenericTarget(Family='sharc-fx'),
                    Runtime='tflm'
                ),
                BackendTarget(
                    Hardware=GenericTarget(Family='cortex-m'),
                    Runtime='tflm'
                )
            ],
            Extensions=TypeAdapter(CfsaiTflmExtensions).json_schema()
        )

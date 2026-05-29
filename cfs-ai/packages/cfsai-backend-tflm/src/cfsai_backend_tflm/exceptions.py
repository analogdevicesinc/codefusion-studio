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


from cfsai_types.exceptions import BackendError


class CfsaiTflmError(BackendError):
    """CFSAI TFLM backend error type."""

    def __init__(self, msg: str) -> None:
        """
        Initializes a CfsaiTflmError object.

        Args:
            msg: Error message.
        """
        super().__init__('tflm', msg)

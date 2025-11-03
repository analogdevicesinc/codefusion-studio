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


from typing import Optional

from pydantic import BaseModel, Field


class CfsaiTflmExtensions(BaseModel):
    """
    CFSAI TFLM Extensions type.

    Attributes:
        section: Optional memory section to map data. Defaults to `None`.
        symbol: Optional name to use for generated file and data symbols. 
            Defaults to `None`.
    """
    section: Optional[str] = Field(
        alias='Section', default=None,
        description="Optional memory section to map data"
    )
    symbol: Optional[str] = Field(
        alias='Symbol', default=None,
        description="Name to use for the generated file and data symbols"
    )

    model_config = {'extra': 'forbid'}

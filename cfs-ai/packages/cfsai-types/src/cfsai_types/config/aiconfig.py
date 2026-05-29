# Copyright (c) 2025-2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


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


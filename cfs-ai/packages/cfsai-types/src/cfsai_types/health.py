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


from enum import Enum

from pydantic import BaseModel


class HealthStatus(Enum):
    """
    Server health status to be returned by a server implementing the backend 
    API.

    Attributes:
        ok: Server is operating as expected.
        bad: Something has gone wrong with the server.
    """
    ok = "ok"
    bad = "bad"


class Health(BaseModel):
    """
    Top level health data type with room for extension. Currently only wraps the 
    health status indicator.

    Attributes:
        status: Health status of the server.
    """
    status: HealthStatus

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


from pydantic import BaseModel, ConfigDict, Field


class OperatorInfo(BaseModel):
    """
    Class containing performance information about operators 
    or operator classes.
    """
    name: str = Field(
        alias='Name',
        description='The name of the operator or operator class'
    )
    cycles: float = Field(
        alias='Cycles', gt=0,
        description='The estimated number of cycles to perform 1 operation'
    )
    energy: float = Field(
        alias='Energy', gt=0,
        description='The estimated power consumption to perform 1 operation (nJ)'
    )
    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

class HardwareProfile(BaseModel):
    """Class containing the details of the hardware to be profiled."""
    flash_size: float = Field(
        alias='FlashSize', ge=0,
        description='The total size of on-chip flash memory (KB)'
    )
    ram_size: float = Field(
        alias='RamSize', ge=0,
        description='The total size of on-chip RAM memory (KB)'
    )
    core_clock: float = Field(
        alias='CoreClock', gt=0,
        description='The max clock speed of the core (MHz)'
    )
    supported_ops: list[str] = Field(
        alias='SupportedOps',
        description='List of supported Operators (empty => all are supported)'
    )
    accel_ops: list[str] = Field(
        alias='AccelOps',
        description='List of supported Operators (empty => none are accelerated)'
    )
    supported_data_types: list[str] = Field(
        alias='SupportedDataTypes',
        description='List of supported Operators (empty => all are supported)'
    )
    operator_infos: list[OperatorInfo] = Field(
        alias='OperatorInfos',
        description='List of Operator descriptions'
    )

    model_config = ConfigDict(validate_by_name=True, serialize_by_alias=True)

    def get_operator_info(self, name: str) -> OperatorInfo | None:
        """Return OperatorInfo with the provided name."""
        for op_info in self.operator_infos:
            if op_info.name == name:
                return op_info
        return None
   

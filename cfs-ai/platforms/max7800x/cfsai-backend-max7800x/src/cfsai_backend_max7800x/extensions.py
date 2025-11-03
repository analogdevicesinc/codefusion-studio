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


class CfsaiIzerExtensions(BaseModel):
    """
    Izer extensions type.

    Attributes:
        section: Optional memory section to map data. Default is `None`.
        softmax: Enable softmax layer generation. Default is False
        verbose: Enable verbose output. Default is False
        timer: Specify timer for measurements the inference time(e.g., 0-3).
            Default is `None`.
        prefix: Set test name prefix. Default is ''.
        avg_pool_rounding: Round average pooling results. Default is False
        pipeline: Enable or disable pipeline. Default is True.
        pll: Enable or disable PLL. Default is `None`.
        clock_divider: CNN clock divider Default is 1.
        board_name: Board name. Default is 'EvKit_V1'.
        compact_data: Use memcpy() to load input data in order to save code 
            space. Default is True.
        riscv: Use RISC-V processor. Default is False
    """
    section: Optional[str] = Field(
        alias='Section', default=None,
        description="Optional memory section to map data. Note: ai8xize.py " \
        "may not directly use this; it could be intended for post-processing " \
        "of generated code or if ai8xize.py is extended."
    )
    # Fields from previous example, retained and potentially enhanced
    softmax: bool = Field(
        alias='Softmax', default=False,
        description="Enable softmax layer generation."
    )
    timer: Optional[int] = Field(
        alias='Timer', default=None, ge=0,
        description="Specify timer for measurements the inference time"
        "(e.g., 0-3)."
    )
    prefix: str = Field(
        alias='Prefix', default='',
        description="Set test name prefix."
    )

    avg_pool_rounding: bool = Field(
        alias='AvgPoolRounding', default=False,
        description="Round average pooling results."
    )
    pipeline: Optional[bool] = Field(
        alias='Pipeline', default=True,
        description="Enable or disable pipeline. True for --pipeline, False" \
        " for --no-pipeline, None for default."
    )
    pll: Optional[bool] = Field(
        alias='Pll',
        default=None, # None means use ai8xize.py default (automatic)
        description="Enable or disable PLL. True for --pll, False for "
        "--no-pll, None for default."
    )
    clock_divider: Optional[int] = Field(
        alias='ClockDivider', default=1, ge=1,
        description="CNN clock divider (default: 1 or 4, depends on " \
        "clock source)."
    )
    compact_data: bool = Field(
        alias='CompactData', default=True,
        description="use memcpy() to load input data in order to save code " \
        "space (default)"
    )
    input_shape: Optional[str] = Field(
        alias='InputShape', default=None,
        description='Tuple describing the input shape used to generate random '\
            'sample input data e.g. "227,227,277"'
    )
    fifo: bool = Field(
        alias='Fifo', default=False,
        description='Use a FIFO when reading the layer data (useful for larger models)'
    )

    model_config = {'extra': 'forbid'}

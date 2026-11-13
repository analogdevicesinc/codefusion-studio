# Copyright (c) 2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
CFSAI Model Explorer.

Unified model profiling and compatibility analysis. Dispatches to the
correct backend based on the hardware target (XNNC explore for NNE,
static analysis for Cortex-M / SHARC-FX).
"""

from cfsai_model_explorer.runner import ModelExplorer

__all__ = [
    "ModelExplorer",
]

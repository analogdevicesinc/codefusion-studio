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


"""
Layer names.
"""
from typing import List, Optional

from . import state
from .eprint import eprint
from cfsai_backend_max7800x.exceptions import IzerError


def find_layer(
    all_names: List,  # contains "layer_name"s as first element, "data_buffer_name" as second
    sequence: int,
    name: str,
    keyword: str,
    error: bool = True,
) -> Optional[int]:
    """
    Find layer number given a layer name.
    """
    name = name.lower()
    if name == 'input':
        return -1
    layer_names = all_names[0]
    for ll, e in enumerate(layer_names):
        if e is not None and e.lower() == name:
            return ll
    if name == all_names[1]:
        return -2   # data buffer
    if error:
        raise IzerError(f'Could not find the `{keyword}` layer name `{name}` in layer sequence '
               f'{sequence} of the YAML configuration file.')
    return None


def layer_str(
    ll: int,
) -> str:
    """
    Convert a layer number to a layer name.
    """
    if ll == -1:
        return 'input'
    name = state.layer_name[ll]
    if name is not None:
        return f'{ll} ({name})'
    return str(ll)


def layer_pfx(
    ll: int,
) -> str:
    """
    Convert a layer number to a layer name prefixed by "Layer " and followed by ":".
    """
    return f'Layer {layer_str(ll)}: '

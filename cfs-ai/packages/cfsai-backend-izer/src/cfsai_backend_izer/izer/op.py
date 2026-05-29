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
Operators
"""
NONE = 0
CONV1D = 1
CONV2D = 2
CONVTRANSPOSE2D = 3
LINEAR = 4

ACT_RELU = 1
ACT_ABS = 2

ELTWISE_ADD = -1
ELTWISE_MUL = -2
ELTWISE_OR = -3
ELTWISE_SUB = -4
ELTWISE_XOR = -5

ACT_NAMES = {
    NONE: 'no activation',
    ACT_RELU: 'ReLU',
    ACT_ABS: 'Abs',
}

OP_NAMES = {
    NONE: 'passthrough',
    CONV1D: 'conv1d',
    CONV2D: 'conv2d',
    CONVTRANSPOSE2D: 'convtranspose2d',
    LINEAR: 'linear',
}

ELT_NAMES = {
    NONE: 'none',
    ELTWISE_ADD: 'add',
    ELTWISE_SUB: 'sub',
    ELTWISE_MUL: 'mul',
    ELTWISE_XOR: 'xor',
    ELTWISE_OR: 'or',
}

ENCODING = {
    ELTWISE_ADD: 0b01,
    ELTWISE_SUB: 0b00,
    ELTWISE_XOR: 0b11,
    ELTWISE_OR: 0b10,
}

UNKNOWN = '????'


def string(
        op,
        elt=False,
):
    """
    Return string representation of operator `op`.
    """
    if not elt:
        return OP_NAMES[op] if op in OP_NAMES else UNKNOWN
    # else:
    return ELT_NAMES[op] if op in ELT_NAMES else UNKNOWN


def eltwise(
        op,
):
    """
    Returns `True` when `op` is an element-wise operator.
    """
    return op in [ELTWISE_ADD, ELTWISE_MUL, ELTWISE_SUB, ELTWISE_XOR, ELTWISE_OR]


def eltwise_fn(
        op,
):
    """
    Returns the bit encoding for `op`, where `op` is an element-wise operator.
    """
    if op in ENCODING:
        return ENCODING[op]
    raise NotImplementedError


def act_string(
        act,
):
    """
    Return string representation of activation `act`.
    """
    if act is None:
        return ACT_NAMES[NONE]
    # else:
    return ACT_NAMES[act] if act in ACT_NAMES else UNKNOWN

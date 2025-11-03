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
Contains hard coded sample inputs.
"""
import operator
import os
from functools import reduce

import numpy as np

from . import stats
from .eprint import eprint
from .utils import s2u, u2s
from cfsai_backend_max7800x.exceptions import IzerError

def get(
        filename,
        synthesize_input=None,
        synthesize_words=8,
):
    """
    Return a sample input image from the file name `filename` in channel-first format
    (i.e., CL, CHW)
    """
    if not os.path.exists(filename):
        raise IzerError(f'Sample data file {filename} does not exist!')

    # Load data saved using
    # np.save(os.path.join('tests', f'sample_{dataset}'), data,
    #         allow_pickle=False, fix_imports=False)

    data = np.load(filename)
    if data.dtype.type is not np.dtype('int64').type:
        raise IzerError(f'The sample data array in {filename} is of type {data.dtype}, rather than '
               'int64!')

    shape = data.shape
    stats.resourcedict['input_size'] = reduce(operator.mul, shape)

    if synthesize_input is not None:
        # Every 8 (or synthesize_words) words, add data to the
        # combined 32-bit word for up to 4 channels
        if shape[0] < 1 or shape[0] > 4:
            raise IzerError('`--synthesize-input` requires 1 to 4 input channels.')
        data = data.reshape(shape[0], -1)
        if data.shape[1] % synthesize_words != 0:
            raise IzerError('`--synthesize-words` must be a divisor of the number of pixels per channel '
                   f'({data.shape[1]}).')
        if shape[0] == 3:
            mask = 0xffffff
        elif shape[0] == 2:
            mask = 0xffff
        elif shape[0] == 1:
            mask = 0xff
        else:
            mask = 0xffffffff
        for i in range(synthesize_words, data.shape[1], synthesize_words):
            for j in range(synthesize_words):
                val = 0
                for c in range(shape[0]-1, -1, -1):
                    val = val << 8 | s2u(data[c, i+j-synthesize_words])
                val += synthesize_input
                val &= mask
                for c in range(shape[0]-1, -1, -1):
                    data[c, i+j] = u2s((val >> c * 8) & 0xff)
        data = data.reshape(shape)

    return data


def get_random(
        shape,
        synthesize_input=None,
        synthesize_words=8,
        dtype=np.int64,
        random_range=(-128, 127)  # Typical range for int8 data
):
    """
    Generate random sample input data with the given shape in channel-first format
    (i.e., CL, CHW) that mimics the behavior of the original get() function
    
    Args:
        shape: tuple defining the shape of the tensor (e.g., (3, 225, 225))
        synthesize_input: same as original function
        synthesize_words: same as original function  
        dtype: data type for the generated array (default: np.int64)
        random_range: tuple (min, max) for random integer generation
    """
    
    # Generate random data with the specified shape and dtype
    if dtype == np.int64:
        data = np.random.randint(random_range[0], random_range[1] + 1, 
                                size=shape, dtype=dtype)
    else:
        # For other dtypes, generate and then cast
        data = np.random.randint(random_range[0], random_range[1] + 1, 
                                size=shape).astype(dtype)
    
    # Store input size (mimicking stats.resourcedict behavior)
    input_size = reduce(operator.mul, shape)
    print(f"Input size: {input_size}")  # Replace with your stats storage if needed
    
    if synthesize_input is not None:
        # Replicate the synthesis logic from original function
        if shape[0] < 1 or shape[0] > 4:
            raise ValueError('`synthesize_input` requires 1 to 4 input channels.')
            
        data = data.reshape(shape[0], -1)
        
        if data.shape[1] % synthesize_words != 0:
            raise ValueError('`synthesize_words` must be a divisor of the number of pixels per channel '
                           f'({data.shape[1]}).')
        
        # Set mask based on number of channels
        if shape[0] == 3:
            mask = 0xffffff
        elif shape[0] == 2:
            mask = 0xffff
        elif shape[0] == 1:
            mask = 0xff
        else:
            mask = 0xffffffff
            
        # Apply synthesis transformation
        for i in range(synthesize_words, data.shape[1], synthesize_words):
            for j in range(synthesize_words):
                val = 0
                for c in range(shape[0]-1, -1, -1):
                    val = val << 8 | s2u(data[c, i+j-synthesize_words])
                val += synthesize_input
                val &= mask
                for c in range(shape[0]-1, -1, -1):
                    data[c, i+j] = u2s((val >> c * 8) & 0xff)
                    
        data = data.reshape(shape)
    
    return data
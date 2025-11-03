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
Part number and device type conversion
"""
import argparse

CMSISNN = -1


def device(astring: str) -> int:
    """
    Take die type, or part number, and return the die type.
    """
    s = astring.lower()

    if s.startswith('max'):
        s = s[3:]  # Strip 'MAX' from part number
    elif s.startswith('ai'):
        s = s[2:]  # Strip 'AI' from die type
    elif s == 'cmsis-nn':
        return CMSISNN

    try:
        num = int(s)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(astring, 'is not a supported device type') from exc
    if num in [85, 87]:  # Die types
        dev = num
    elif num == 78000:  # Part numbers
        dev = 85
    elif num == 78002:
        dev = 87
    else:
        raise argparse.ArgumentTypeError(astring, 'is not a supported device type')

    return dev

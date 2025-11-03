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
Print error message to stderr, and stdout as well if needed
"""
import sys

import rich

from . import state


def eprint(*args, error=True, notice=False, prefix=True, exit_code=1, **kwargs):
    """
    Print message to stderr, and stdout as well IF stdout was overridden.
    Add a `prefix` if set (and `error` chooses which).
    """
    if prefix:
        pfx = 'ERROR:' if error else 'WARNING:' if not notice else 'NOTICE:'

        if not state.output_is_console:
            print(pfx, *args, **kwargs)

        color = "red" if error else "yellow" \
            if not notice else "green"

        rich.print('[' + color + ']' + pfx + '[/' + color + '] ', file=sys.stderr, end='')
        print(*args, file=sys.stderr, **kwargs)
    else:
        if not state.output_is_console:
            print(*args, **kwargs)

        print(*args, file=sys.stderr, **kwargs)

    if error and exit_code is not None:
        sys.exit(error)


def wprint(*args, **kwargs):
    """
    Print message to stderr, and stdout as well IF stdout was overridden.
    Add a WARNING: prefix.
    """
    eprint(*args, error=False, **kwargs)


def nprint(*args, **kwargs):
    """
    Print message to stderr, and stdout as well IF stdout was overridden.
    Add a NOTICE: prefix.
    """
    eprint(*args, error=False, notice=True, **kwargs)


def eprint_noprefix(*args, **kwargs):
    """
    Print message to stderr, and stdout as well IF stdout was overridden.
    """
    eprint(*args, prefix=False, exit_code=None, **kwargs)

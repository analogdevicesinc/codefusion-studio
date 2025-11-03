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

import logging
import sys

from cfsai_types.logging import JsonLogFormatter, cfsai_log_message_filter


def setup_logger() -> None:
    """Setup the logger for the backend API."""
    root = logging.getLogger()

    # Remove previous handlers
    while root.hasHandlers():
        root.removeHandler(root.handlers[0])
        
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(JsonLogFormatter())
    stdout_handler.addFilter(lambda record: record.levelno < logging.ERROR)
    stdout_handler.addFilter(cfsai_log_message_filter)
    root.addHandler(stdout_handler)

    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setFormatter(JsonLogFormatter())
    stderr_handler.addFilter(lambda record: record.levelno >= logging.ERROR)
    stderr_handler.addFilter(cfsai_log_message_filter)
    root.addHandler(stderr_handler)

    root.setLevel(logging.DEBUG)
    
    

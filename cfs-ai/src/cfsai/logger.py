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
from typing import ClassVar, Union

from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.text import Text

from cfsai_types.logging import JsonLogFormatter, cfsai_log_message_filter


def format_err(e: Union[Exception, str]) -> Panel:
    """
    Formats the passed error into a user friendly, common error style.

    Args:
        e: Error to format either as an expection type or string.

    Returns:
        Rich formatted panel error type.
    """
    err_msg = Text(str(e), style='white')
    panel = Panel(err_msg, border_style='red', title='Error', title_align='left')
    return panel

class CustomErrorHandler(RichHandler):
    """A custom RichHandler that formats ERROR and CRITICAL logs as rich Panels."""
    def emit(self, record: logging.LogRecord) -> None:
        """
        Emits a log record. If the level is ERROR or CRITICAL, it prints a panel.
        Otherwise, it defers to the parent RichHandler's emit method.
        """
        if record.levelno >= logging.ERROR:
            msg = record.getMessage()
            panel = format_err(msg)
            # Use the handler's console to print the panel directly.
            self.console.print(panel)
        else:
            # For other log levels, use the default RichHandler formatting.
            super().emit(record)

class RichFormatter(logging.Formatter):
    """Custom formatter to format logs using rich styling."""
    FORMATS: ClassVar[dict[int, str]] = {
        # Magnifiying glass emoji
        logging.DEBUG: "[grey58]\U0001F50D[/][grey58]    {message}[/grey58]",
        logging.INFO: "{message}",
        # Warning emoji
        logging.WARNING: "[yellow]\u26A0[/][yellow]     {message}[/]",
        logging.ERROR: "{message}",
        logging.CRITICAL: "{message}"
    }

    def format(self, record: logging.LogRecord) -> str:
        """
        Format the log messages according to our desired format.

        Args:
            record: Log record.

        Returns:
            Formatted string.
        """
        fmt = self.FORMATS.get(record.levelno, "{message}")
        # Rich expects `record.message` substitution, so we use `record.getMessage()`
        return fmt.format(message=record.getMessage())


def setup_logger(
        json_format: bool = False,
        debug_level: bool = False,
) -> None:
    """
    Setup the logger based on the mode.

    Args:
        json_format: Enable JSON mode.
        debug_level: Enable DEBUG mode.
    """
    logger = logging.getLogger()
    stdout_handler: logging.Handler
    stderr_handler: logging.Handler
    if json_format:
        stdout_handler = logging.StreamHandler(sys.stdout)
        stdout_handler.setFormatter(JsonLogFormatter())

        stderr_handler = logging.StreamHandler(sys.stderr)
        stderr_handler.setFormatter(JsonLogFormatter())
    else:
        stdout_handler = RichHandler(
            console=Console(),
            markup=True,
            show_level=False,
            show_path=False,
            show_time=False
        )
        stdout_handler.setFormatter(RichFormatter())

        stderr_handler = CustomErrorHandler(
            console=Console(stderr=True),
            markup=True,
            show_level=False,
            show_path=False,
            show_time=False
        )
        stderr_handler.setFormatter(RichFormatter())
    
    stdout_handler.addFilter(lambda record: record.levelno < logging.ERROR)
    stdout_handler.addFilter(cfsai_log_message_filter)
    logger.addHandler(stdout_handler)

    stderr_handler.addFilter(lambda record: record.levelno >= logging.ERROR)
    stderr_handler.addFilter(cfsai_log_message_filter)
    logger.addHandler(stderr_handler)

    level = logging.DEBUG if debug_level else logging.INFO
    logger.setLevel(level)

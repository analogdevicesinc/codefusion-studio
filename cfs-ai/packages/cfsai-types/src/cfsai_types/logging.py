# Copyright (c) 2025-2026 Analog Devices, Inc.
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
from enum import StrEnum
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, FieldSerializationInfo, field_serializer


def cfsai_log_message_filter(record: logging.LogRecord) -> bool:
    """
    Filter out non cfsai or root logger logs.

    Args:
        record: Log record to process

    Returns:
        True if the log should be logged, False otherwise
    """
    return record.name.startswith('cfsai') or record.name == 'root'


class EventType(StrEnum):
    """
    Type of a logging event.

    Attributes:
        FILE: A file has been created.
        MODEL: A model has been created.
    """
    FILE='Created file'
    MODEL='Created model'


class EventStatus(StrEnum):
    """
    Status of a generated file.

    Attributes:
        NA: Not available.
        OK: File generated successfully.
        FAIL: Failed to generate file.
        SKIP: Skipped file generation.
    """
    NA = 'NA'
    OK = 'OK'
    FAIL = 'Failed'
    SKIP = 'Skipped'

class LogEvent(BaseModel):
    """
    File generation metadata to make external program parsing easier. This allows
    the placement of inline rich styling tags directly in the log message output
    but leaving all of the relavent data unformatted and available.

    Attributes:
        status: Status of the file generation.
        path: Path to the generation file.
    """
    status: EventStatus
    type: EventType
    value: str | Path

    @field_serializer('status', 'type')
    def _enum_name(self, e: StrEnum, _info: FieldSerializationInfo) -> str:
        return e.name




class LogMessage(BaseModel):
    """
    Log message type.

    Attributes:
        level: Level of the log message.
        msg: Log message.
    """
    level: str
    msg: str
    event: Optional[LogEvent] = None


class JsonLogFormatter(logging.Formatter):
    """JSON Log Formatter."""
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log message in a JSON log.

        Args:
            record: Logging record.

        Returns:
            Formatted string.
        """
        msg = str(record.exc_info[1]) if record.exc_info else record.getMessage()
        event: Optional[LogEvent] = \
            getattr(record, 'event', None)
        
        return LogMessage(
            level=record.levelname,
            msg=msg,
            event=event
        ).model_dump_json()

def log_event(
        logger: logging.Logger, 
        type: EventType,
        val: str | Path, 
        status: EventStatus = EventStatus.OK
    ) -> None:
    """
    Log a file creation event with correct metadata.

    Args:
        logger: Logger object to use.
        type: Enum indicating the event type
        val: string (or Path) associated with the event.
        status: Generated file status.
    """
    # If value is a path, normalize to posix
    try:
        p = Path(val)
        val = p.as_posix()
    except Exception: # noqa: S110
        pass
    metadata = LogEvent(status=status, type=type, value=val)
    logger.info(
        f'{type.value} "{val}"',
        extra={'event' : metadata}
    )

def setup_logger(
        debug_level: bool = False,
) -> None:
    """
    Setup the logger based on the mode.

    Args:
        json_format: Enable JSON mode.
        debug_level: Enable DEBUG mode.
    """
    logger = logging.getLogger()
    logger.handlers.clear()
    stdout_handler = logging.StreamHandler(sys.stdout)
    stderr_handler = logging.StreamHandler(sys.stderr)

    stdout_handler.setFormatter(JsonLogFormatter())
    stderr_handler.setFormatter(JsonLogFormatter())

    stdout_handler.addFilter(lambda record: record.levelno < logging.ERROR)
    stdout_handler.addFilter(cfsai_log_message_filter)
    logger.addHandler(stdout_handler)

    stderr_handler.addFilter(lambda record: record.levelno >= logging.ERROR)
    stderr_handler.addFilter(cfsai_log_message_filter)
    logger.addHandler(stderr_handler)

    level = logging.DEBUG if debug_level else logging.INFO
    logger.setLevel(level)

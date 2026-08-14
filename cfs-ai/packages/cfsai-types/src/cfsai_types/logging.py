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


import json
import logging
from enum import StrEnum
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, FieldSerializationInfo, field_serializer

_logs: list[str] = []


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
    """
    FILE='Created file'


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
    Log message type matching the AiEvent interface.

    Attributes:
        type: Event type (FILE, INFO, WARN, or ERROR).
        message: Log message.
        value: Optional associated value (e.g. file path, model name).
    """
    type: str
    message: str
    value: Optional[str] = None


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

        if event:
            _type_map = {'FILE': 'FILE'}
            event_type = _type_map.get(event.type.name, 'INFO')
            value: Optional[str] = str(event.value) if event.value else None
        else:
            _level_map = {'WARNING': 'WARN', 'ERROR': 'ERROR'}
            event_type = _level_map.get(record.levelname, 'INFO')
            value = None

        return LogMessage(
            type=event_type,
            message=msg,
            value=value
        ).model_dump_json(exclude_none=True)

class MemoryLogHandler(logging.Handler):
    """Handler that stores log records in memory."""
    def emit(self, record: logging.LogRecord) -> None:
        """
        Store formatted log record in memory.

        Args:
            record: Logging record.
        """
        if self.formatter:
            _logs.append(self.formatter.format(record))


def dump_logs() -> str:
    """
    Retrieve all collected logs and clear the buffer.

    Returns:
        JSON array string of formatted log messages.
    """
    global _logs
    logs = _logs.copy()
    _logs.clear()
    return json.dumps([json.loads(log) for log in logs])

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
        f'{type.value} {val}',
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
    memory_handler = MemoryLogHandler()
    memory_handler.setFormatter(JsonLogFormatter())
    memory_handler.addFilter(cfsai_log_message_filter)
    logger.addHandler(memory_handler)

    level = logging.DEBUG if debug_level else logging.INFO
    logger.setLevel(level)

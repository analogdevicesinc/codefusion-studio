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
from enum import Enum
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, field_serializer


def cfsai_log_message_filter(record: logging.LogRecord) -> bool:
    """
    Filter out non cfsai or root logger logs.

    Args:
        record: Log record to process

    Returns:
        True if the log should be logged, False otherwise
    """
    return record.name.startswith('cfsai') or record.name == 'root'

class FileGenerationStatus(str, Enum):
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

class FileGenerationMetadata(BaseModel):
    """
    File generation metadata to make external program parsing easier. This allows
    the placement of inline rich styling tags directly in the log message output
    but leaving all of the relavent data unformatted and available.

    Attributes:
        status: Status of the file generation.
        path: Path to the generation file.
    """
    status: FileGenerationStatus
    path: Path

    @field_serializer('path', when_used='json')
    def serialize_path(self, path: Path) -> str:
        """Use unix path styling."""
        return path.as_posix()


class LogMessage(BaseModel):
    """
    Log message type.

    Attributes:
        level: Level of the log message.
        msg: Log message.
    """
    level: str
    msg: str
    file_created_event: Optional[FileGenerationMetadata] = None


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
        file_created_event: Optional[FileGenerationMetadata] = \
            getattr(record, 'file_created_event', None)
        
        return LogMessage(
            level=record.levelname,
            msg=msg,
            file_created_event=file_created_event
        ).model_dump_json()


def file_created_event(
        logger: logging.Logger, 
        file: Path, 
        status: FileGenerationStatus = FileGenerationStatus.OK
    ) -> None:
    """
    Log a file creation event with correct metadata.

    Args:
        logger: Logger object to use.
        file: File to log.
        status: Generated file status.
    """
    metadata = FileGenerationMetadata(status=status, path=file)
    logger.info(
        f'Created file "{file.as_posix()}"',
        extra={'file_created_event' : metadata}
    )

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


import json
import logging
import os
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Optional, Self

from pydantic import BaseModel, Field, RootModel

logger = logging.getLogger(__name__) 

_CFS_APP_NAME = 'com.analog.cfs'
"""Default name of the CFS application directory"""


def _get_pkg_data_path() -> Path:
    """
    Find the the default package manager data directory in a platform agnostic
    manner. Based on [env-paths](https://github.com/sindresorhus/env-paths/blob/main/index.js)
    which is used in core CFS.

    Returns:
        Path to package manager data directory.
    """
    homedir = Path.home()
    app_data: Path
    if sys.platform.lower() == 'darwin':
        app_data = homedir / 'Library' / 'Preferences' / _CFS_APP_NAME
    elif sys.platform.lower() == 'win32':
        app_data = Path(
            os.environ.get('LOCALAPPDATA') or homedir / 'AppData' / 'Local'
        ) / _CFS_APP_NAME / 'Data'
    else:
        # Linux flavour
        app_data = Path(
            os.environ.get('XDG_DATA_HOME') or homedir / '.local' / 'share'
        ) / _CFS_APP_NAME

    return app_data / 'packages'

class CfsPkgMgrIndexEntry(BaseModel):
    """
    Package manager index entry.

    Attributes:
        full_ref: Conan reference.
        path: Absolute path to the package entry.
        requires: Dependant packages.
        description: Package description.
        license: Package license.
        cfs_version: CFS version.
        soc: Relevant socs for this package.
        type: Package type.
    """
    full_ref: str
    path: Path
    requires: list[str]
    description: str
    license: str
    cfs_version: str = Field(
        alias='cfsVersion'
    )
    soc: Optional[list[str]]
    type: Optional[str]


    model_config = {
        "populate_by_name": True  # allow using field names when loading data
    }

    def is_datamodels(self) -> bool:
        """
        Check if the entry contains datamodels.

        Returns:
            True if its datamodels, False otherwise.
        """
        return self.type == 'data-model'

    def supports_soc(self, soc: str) -> bool:
        """
        Does the package support the respective soc.

        Args:
            soc: Soc to check whether its supported.

        Returns:
            True if its supported, False otherwise.
        """
        if self.soc:
            return soc.upper() in self.soc
        return False


class CfsPkgMgrIndex(RootModel[dict[str, CfsPkgMgrIndexEntry]]):
    """Package manager index."""
    @classmethod
    def from_system(cls) -> Optional[Self]:
        """
        Attempt to construct a package manager index from the default package
        manager installation location.

        Returns:
            An instance of the class if the package manage index file could be
                found else None.
        """
        index_path = _get_pkg_data_path() / '.cfsPackages'
        if not index_path.exists():
            logger.warning(
                'Could not find any system package manager installations'
            )
            return None
        logger.debug('Found system package manager index')
        return cls.model_validate(
            json.loads(index_path.read_text())
        )
    
    def iter_packages(self) -> Iterator[CfsPkgMgrIndexEntry]:
        """
        Iterate through the package manager package entries.

        Yields:
            Package manager index entry objects.
        """
        yield from self.root.values()

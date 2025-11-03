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
from collections import defaultdict
from collections.abc import Iterator
from pathlib import Path
from typing import Optional, Self

from pydantic import BaseModel, Field, RootModel, model_validator

from cfsai_types.datamodel import CfsDatamodel
from cfsai_types.packman import CfsPkgMgrIndex

logger = logging.getLogger(__name__)

class CfsDatamodelIndexEntry(BaseModel):
    """
    Datamodel index entry.
    
    Attributes:
        version: Version of CFS.
        schema: Datamodel schema version.
        timestamp: Datamodel generation timestamp.
        description: Datamodel description.
        path: Relative path to datamodel file.
    """
    version: str
    dmschema: str = Field(..., alias='schema')
    timestamp: str # Change to datetime type in future maybe
    description: str
    path: Path

    model_config = {'populate_by_name': True}

    def datamodel(self, path: Optional[Path] = None) -> CfsDatamodel:
        """
        Consume the actual datamodel content.

        Args:
            path: Optional path to the current datamodel index directory.

        Returns:
            Datamodel object.

        Raises:
            FileNotFoundError: If the datamodel file could not be found.
        """
        resolved = path / self.path if path else self.path
        if not resolved.exists():
            raise FileNotFoundError(
                f'Could not find datamodel {resolved}'
            )

        # Perhaps add schema version checks here and produce warnings if they 
        # are out of data
        return CfsDatamodel.model_validate(
            json.loads(resolved.read_text())
        )

class CfsDatamodelIndexData(RootModel[dict[str, dict[str, CfsDatamodelIndexEntry]]]): 
    """Datamodel index data wrapper."""

    @model_validator(mode='after')
    def _case_consistency(self) -> Self:
        root: dict[str, dict[str, CfsDatamodelIndexEntry]] = defaultdict(dict)
        for soc, pkgs in self.root.items():
            for pkg, entry in pkgs.items():
                root[soc.upper()][pkg.upper()] = entry
        self.root = root
        return self

class CfsDatamodelIndex(BaseModel):
    """
    Datamodel index type.

    Attributes:
        index: Datamodel index data.
        path: Path to the index directory.
    """
    index: CfsDatamodelIndexData
    path: Path

    @property
    def root(self) -> dict[str, dict[str, CfsDatamodelIndexEntry]]:
        """Raw datamodel index data."""
        return self.index.root
    
    @root.setter
    def root(self, v: dict[str, dict[str, CfsDatamodelIndexEntry]]) -> None:
        self.index.root = v

    @classmethod
    def from_path(cls, path: Path) -> Optional[Self]:
        """
        Class constructor from a path to the datamodel index directory.

        Args:
            path: Path to the datamodel index directory.

        Returns:
            An instance of the class or None is the `.cfsdatamodels` index file
                could not be found.
        """
        index_file = path.joinpath('.cfsdatamodels')
        if not index_file.exists():
            logger.warning(
                f'Could not find datamodel index "{path.as_posix()}"'
            )
            return None
        
        obj = CfsDatamodelIndexData.model_validate(json.loads(index_file.read_text()))
        logger.debug(
            f'Found a system datamodel index "{path.as_posix()}"'
        )
        return cls(index=obj, path=path)

    def datamodel_list(self) -> list[tuple[str, str]]:
        """
        Get a list of the soc and packages in the index.

        Returns:
            A list of tuples containing the soc and package name respectively.
        """
        datamodels = []
        for soc, pkgs in self.root.items():
            datamodels.extend([(soc, p) for p in pkgs])
        return datamodels
    
    def iter_ai_datamodels(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through the AI enabled datamodels.

        Yields:
            AI enabled datamodel object.
        """
        yield from [d for d in self.iter_datamodels() if d.ai_enabled()]

    def iter_datamodels(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through the datamodels in the index.

        Yields:
            Datamodel object.

        """
        for inner in self.root.values():
           yield from(entry.datamodel(path=self.path) for entry in inner.values())

    def iter_soc_package(self) -> Iterator[tuple[str, str]]:
        """
        Iterate through the soc and packages in the index.

        Yields:
            A tuple with the soc and package names respectively.
        """
        for soc, pkgs in self.root.items():
            for pkg in pkgs:
                yield soc, pkg

    def iter_soc(self) -> Iterator[str]:
        """
        Iterate through the soc names in the index.

        Yields:
            Soc names.
        """
        yield from self.root

    def default_package(self, soc: str) -> Optional[str]:
        """
        Compute the default package which will be read for the respective soc.

        Args:
            soc: Soc to compute the default package name for.

        Returns:
            Name of default package name or None if the soc could not be found.
        """
        packages = self.root.get(soc)
        if packages is None:
            return None
        return min(packages.keys(), key=str.lower)
    
    def get_entry(
            self, 
            soc: str, 
            package: Optional[str] = None
        ) -> Optional[CfsDatamodelIndexEntry]:
        """
        Get the datamodel index entry for the respective soc and optional package.

        Args:
            soc: Soc's datamodel to retrieve.
            package: Optional package to retrieve other wise use the `default_package`.

        Returns:
            Datamodel object or None if it coud not be found.
        """
        packages = self.root.get(soc)
        if packages is None:
            return None
        if package:
            entry = packages.get(package)
            if entry is None:
                return None
        else:
            package = self.default_package(soc)
            # This index should never fail and if it does then something crazy
            # wrong has happend
            entry = packages[package] # type: ignore

        return entry

    def get_datamodel(
            self, 
            soc: str, 
            package: Optional[str] = None
        ) -> Optional[CfsDatamodel]:
        """
        Get the datamodel for the respective soc and optional package.

        Args:
            soc: Soc's datamodel to retrieve.
            package: Optional package to retrieve other wise use the `default_package`.

        Returns:
            Datamodel object or None if it coud not be found.
        """
        entry = self.get_entry(soc, package)
        if entry:
            logger.debug(f'Reading datamodel "{self.path.joinpath(entry.path)}"')
            return entry.datamodel(path=self.path)
        return None


class CfsDatamodelManager:
    """
    Class to manage datamodel access.

    Attributes:
        indices: List of datamodel indices to reference.
        datamodels: List of datamodel objects to manage.
        datamodel_paths: List of datamodel file paths to reference.
        custom_search_paths: List of search paths to look for datamodel
            indices.
        cache: Datamodel cache which stores read datamodel objects according to
            their respective soc and package.
    """
    
    def __init__(self,
            datamodels: Optional[list[CfsDatamodel]] = None,
            datamodel_paths: Optional[list[Path]] = None, 
            custom_search_paths: Optional[list[Path]] = None,
    ) -> None:
        """
        Create a datamodel manager singleton instance. Initialization is only
        done once.
        
        Args:
            datamodels: List of datamodel objects to manage.
            datamodel_paths: List of datamodel file paths to read and manage.
            custom_search_paths: List of search parts to looks for datamodel
                index files ".cfsdatamodels".
        """        
        self.indices: list[CfsDatamodelIndex] = []
        self.datamodels = datamodels if datamodels is not None else []
        self.datamodel_paths = datamodel_paths if datamodel_paths is not None \
            else []
        self.custom_search_paths = custom_search_paths if custom_search_paths \
            is not None else []
            
        self.cache: dict[str, dict[str, CfsDatamodel]] = defaultdict(dict)
        self.refresh()


    def _load_indices(self) -> None:
        """
        Load the index files from the search path and the default package
        manager system paths.
        """
        # Check user search paths first
        for p in self.custom_search_paths:
            index = CfsDatamodelIndex.from_path(p)
            if index:
                self.indices.append(index)
    
        # Attempt to read the package manager datamodel indices
        pkg_man_index = CfsPkgMgrIndex.from_system()
        if pkg_man_index:
            for pkg in pkg_man_index.iter_packages():
                if pkg.type == 'data-model':
                    index = CfsDatamodelIndex.from_path(pkg.path)
                    if index:
                        self.indices.append(index)
            

    def _merge_direct_files(self) -> None:
        """
        Read datamodel files passed directly and insert them into the cache. An
        index entry is also created for each file and a fake datamodel index is 
        created for the direct files.
        """
        fake_indices = []
        for f in self.datamodel_paths:
            dm = CfsDatamodel.model_validate(
                json.loads(f.read_text())
            )
            logger.debug(f'Found datamodel from file {f.as_posix()}')
            index_entry = CfsDatamodelIndexEntry(
                version=dm.version,
                dmschema=dm.dmschema,  # type: ignore
                timestamp=str(dm.timestamp),
                description=dm.description,
                path=Path(f.name)
            )
            # Same logic as `packages/cfs-data-model/build-scripts/
            # generate-data-model-index.js`
            index_data: dict[str, dict[str, CfsDatamodelIndexEntry]] = defaultdict(dict)
            for part in dm.parts:
                if part.package:
                    index_data[dm.name][part.package] = index_entry

            index = CfsDatamodelIndexData.model_validate(index_data)
            self._insert_to_cache(dm)
            fake_indices.append(
                CfsDatamodelIndex(
                    index=index,
                    path=f.parent
                )
            )
        # Direct files passed should take precedence
        if fake_indices:
            self.indices = [*fake_indices, *self.indices]

    def _insert_to_cache(self, datamodel: CfsDatamodel) -> None:
        """
        Insert a datamodel into the cache.

        Args:
            datamodel: Datamodel object to insert into the cache.
        """
        # Same logic as `packages/cfs-data-model/build-scripts/
        # generate-data-model-index.js`
        for part in datamodel.parts:
            if part.package:
                self.cache[datamodel.name][part.package] = datamodel

    
    def _get_from_cache(
            self, 
            soc: str, 
            package: Optional[str] = None
        ) -> Optional[CfsDatamodel]:
        """
        Attempt to retrieve a datamodel from the cache.

        Args:
            soc: Name of the soc.
            package: Optional name of the package, otherwise the first package
                is taken in alphanumeric order. Default is None.

        Returns:
            Datamodel object or None if not in the cache.
        """
        ret = None
        if soc in self.cache:
            packages = self.cache[soc]
            if package:
                if package in packages:
                    ret = packages[package]
            else:
                key = min(packages.keys(), key=str.lower)
                ret = packages[key]
        if ret:
            logger.debug(f'Found cached datamodel for {soc}[{ret.part_package}]')
        return ret

    def get(
            self, 
            soc: str, 
            package: Optional[str] = None
        ) -> Optional[CfsDatamodel]:
        """
        Retrieve a datamodel.

        Args:
            soc: Soc to retrieve.
            package: Optional package to retrieve, otherwise the first package
                in alphanumeric order is retrieved. Default is None.
        
        Returns:
            Datamodel object or None if could not be found.
        """
        logger.debug(
            f'Getting datamodel for {soc}' + (f'[{package}]' if package else '')
        )
        # Check cache
        cached = self._get_from_cache(soc, package)
        if cached is not None:
            return cached

        for index in self.indices:
            dm = index.get_datamodel(soc, package)
            if dm:
                # Add to cache first
                self._insert_to_cache(dm)
                return dm
        return None
    
    def socs(self) -> list[str]:
        """
        Retrieve a list of the socs available on the index by traversing the 
        index list. This is a quick operation as no file reads are required.

        Returns:
            List of available soc names.
        """
        socs = set()
        for index in self.indices:
            socs.update(
                [soc for soc, _ in index.datamodel_list()]
            )
        return list(socs)
    
    def socs_pkgs(self) -> list[tuple[str, str]]:
        """
        Retrieve a list of the socs and packages available on the index by 
        traversing the index list. This is a quick operation as no file reads 
        are required.

        Returns:
            List of available soc names.
        """
        socs = set()
        for index in self.indices:
            socs.update(
                [s for s in index.datamodel_list()]
            )
        return list(socs)
    
    def ai_socs(self) -> list[str]:
        """
        Retrives a list of the AI supported socs available on the index. This is
        an expensive operation as all of the datamodels must be read to determine
        if they are AI supported or not. There is a PR open to add this information
        to the index file.

        Returns:
            List of AI supported soc names.
        """
        # This is gonna be inefficient for the time being
        socs = set()
        for index in self.indices:
            socs.update(
                [d.name for d in index.iter_ai_datamodels()]
            )
        return list(socs)
    
    def ai_socs_pkgs(self) -> list[tuple[str, str]]:
        """
        Retrives a list of the AI supported socs and packages available on the index. 
        This is an expensive operation as all of the datamodels must be read to 
        determine if they are AI supported or not. There is a PR open to add this 
        information to the index file.

        Returns:
            List of AI supported soc and package names.
        """
        # This is gonna be inefficient for the time being
        socs = set()
        for index in self.indices:
            socs.update(
                [(d.name, d.part_package) for d in index.iter_ai_datamodels()]
            )
        return list(socs)
    
    def refresh(self) -> None:
        """Refresh the manager cache and read all of the index files."""
        logger.debug('Refreshing datamodel manager cache')
        self.cache.clear()
        if self.datamodels is not None:
            for d in self.datamodels:
                self._insert_to_cache(d)
        self._load_indices()
        self._merge_direct_files()

    def iter_datamodels(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through all of the available datamodels including each of the 
        packages for all of the socs.

        Yields:
            Datamodel object.
        
        Raises:
            ValueError: If the index specifies an `(soc, package)` combination
                which `get` cannot find.
        """
        # This is inefficient and we're ignore packages
        history = set()
        _iter_list = ((s, p) for index in self.indices \
                      for (s, p) in index.iter_soc_package())
        for soc, pkg in _iter_list:
            if (soc, pkg) in history:
                continue
            dm = self.get(soc, pkg)
            if dm is None:
                raise ValueError(f'Could not find data model for {soc}')
            history.add((soc, pkg))
            yield dm

    def iter_datamodels_no_pkg(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through the available soc datamodels taking the first in terms
        of alphanumeric naming packages for each soc.

        Yields:
            Datamodel object.

        Raises:
            ValueError: If the index specifies an `(soc, package)` combination
                which `get` cannot find.
        """
        # This is inefficient and we're ignore packages
        history = set()
        _iter_list = (s for index in self.indices for s in index.iter_soc())
        for soc in _iter_list:
            if soc in history:
                continue
            dm = self.get(soc)
            if dm is None:
                raise ValueError(f'Could not find data model for {soc}')
            history.add(soc)
            yield dm

    def iter_ai_datamodels(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through the available AI supported sooc datamodels taking the 
        first in terms of alphanumeric naming packages for each soc.

        Yields:
            Datamodel object.
        """
        for dm in self.iter_datamodels():
            if dm.ai_enabled():
                yield dm

    def iter_ai_datamodels_no_pkg(self) -> Iterator[CfsDatamodel]:
        """
        Iterate through the available AI supported sooc datamodels taking the 
        first in terms of alphanumeric naming packages for each soc.

        Yields:
            Datamodel object.
        """
        for dm in self.iter_datamodels_no_pkg():
            if dm.ai_enabled():
                yield dm

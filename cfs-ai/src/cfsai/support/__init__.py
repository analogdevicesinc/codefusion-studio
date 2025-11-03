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


import hashlib
import logging
import os
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path, PurePath
from typing import Optional, Union

import httpx
from pydantic import HttpUrl

from cfsai.backend_manager import BackendManager
from cfsai_types.config.aiconfig import ConfigBackend
from cfsai_types.config.cfsconfig import CfsConfig
from cfsai_types.config.verified import (
    ModelInfo,
    ProjectInfo,
    VerifiedConfig,
)
from cfsai_types.datamodel_manager import CfsDatamodelManager
from cfsai_types.exceptions import SupportError
from cfsai_types.support import GroundTruth

DEFAULT_MODEL_CACHE = 'models'
DEFAULT_INPUT_CACHE = 'inputs'

logger = logging.getLogger(__name__)

def _is_download_required(url: str, local_path: Path) -> bool:
    """
    Check if a remote file needs to be downloaded.
    Download if:
        * File isn't already in cache.
        * Last-Modified header is newer than cached file.
        * No Last-Modified header and cached file is over 1 hour old.
    Use cached if:
        * Remote file is unavailable.
        * Cached file is newer than Last-Modified header.
        * No Last-Modified header and cached file is under 1 hour old. 
 
    Returns:
        False if the cached file should be used.
        True if the remote file should be downloaded.
    """
    if not local_path.exists():
        # If local file doesn't exist, then download is required
        return True

    try:
        # Send a HEAD request to get headers without downloading the whole file
        with httpx.Client(follow_redirects=True, timeout=10) as client:
            response = client.head(url)
            response.raise_for_status()
            last_modified = response.headers.get("Last-Modified")
        
        if last_modified:
            # Convert header timestamp to datetime
            target_time = parsedate_to_datetime(last_modified)
        else:
            # We don't know if file has changed. Assume that if it's <1 hour old
            # then it's still valid. Otherwise re-download
            target_time = datetime.now(UTC) - timedelta(hours=1)
        # Convert to UTC
        target_time = target_time.astimezone(UTC) if \
                      target_time.tzinfo else target_time.replace(tzinfo=UTC) 
       
        # get datetime of local file
        local_timestamp = os.path.getmtime(local_path)
        local_time = datetime.fromtimestamp(local_timestamp, tz=UTC)
        
        return target_time > local_time

    except Exception as e:
        # Something went wrong accessing remote file, use local
        logger.info(f'Problem fetching remote file info: {e}')
        return False

def _download_to_cache(
        url: str,
        cache_dir: Path,
        filename: str
) -> Path:
    """
    Downloads the provided url into the provided cache_dir and returns the local
    file path. Uses the SHA-256 of the URL as the directory name to avoid  
    deduplicate downloads and file name conflicts.

    Args:
        url: URL of the file to download.
        cache_dir: Cache base directory to download the file to.
        filename: Name to store the downloaded file as.

    Returns:
        Path to the downloaded file.
    
    Raises:
        SupportError: If the download returns a non 200 HTTP status code.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Stable, filesystem-safe filename
    dest = cache_dir / filename
    if not _is_download_required(url, dest):
        logger.info(f'Using cached {url}')
        return dest
    logger.info(f'Downloading {url}')

    with httpx.stream("GET", url, follow_redirects=True, timeout=30.0) as r:
        try:
            r.raise_for_status()
        except Exception as e:
            raise SupportError(f'Failed to download {url}') from e
        with dest.open("wb") as fh:
            for chunk in r.iter_bytes():
                fh.write(chunk)

    return dest

def _resolve_source(
        input_path: Union[HttpUrl, Path],
        cache_dir: Path,
) -> Path:
    """
    Resolves the passed path or URL to a local file system path.
    
    Args:
        input_path: Input URL or file path to resolve.
        cache_dir: Directory to download the file to if a download is required.
    
    Raises:
        ValueError: If `input_path` is a URL and has no path part.
    """
    if isinstance(input_path, Path):
        return input_path.expanduser().resolve()
    else:
        url_str = str(input_path)
        p = input_path.path
        if p is None:
            raise ValueError('Invalid URL (has no path)')
        filename = PurePath(p).name
        dirname = hashlib.sha256(url_str.encode()).hexdigest()
        cache_dir = cache_dir / dirname
        return _download_to_cache(url_str, cache_dir, filename)
    

def support(
    datamodel_file_paths: Optional[list[Path]] = None,
    datamodel_search_paths: Optional[list[Path]] = None
) -> GroundTruth:
    """
    Collects all of the collateral required to instantiate a `GroundTruth` 
    object and builds one.

    Args:
        datamodel_file_paths: Optional list of paths to datamodel files to pass
            onto the datamodel manager.
        datamodel_search_paths: Optioanl list of paths to datamodel index 
            directories to pass onto the datamodel manager.

    Returns:
        A ground truth instance with all of the supported backends and 
            datamodels.
    """
    mgr = BackendManager()

    return GroundTruth(
        datamodels=CfsDatamodelManager(
            custom_search_paths=datamodel_search_paths,
            datamodel_paths=datamodel_file_paths,
        ),
        backends= {n : b.support() for n, b in mgr.iter_backends()}
    )


def validate(
        ground_truth: GroundTruth,
        cfsconfig: CfsConfig,
        cwd: Optional[Path] = None
    ) -> list[VerifiedConfig]:
    """
    Validate the provided cfsconfig structure is supportable and return the
    associated list of verified model configurations.

    Args:
        cfsconfig: CFS configuration object representing the user configuration.
        ground_truth: Optional custom ground truth instance to use. If not 
            provided this will be retrieved using `support`. This option is 
            intended for testing purposes. Defaults to `None`.
        cwd: Optional current working directory. Defaults to `None` which will
            be inferred to mean the current directory.
        
    Returns:
        List of verified model configuration instances.
    
    Raises:
        ValueError: If the a core is targeted without a valid project.
        SupportError: If a backend could not be found to support the provided
            configuration.
        ValueError: If the user provided backend could not be found.
        SupportError: If the user provided backend is not actually supported for
            the configuration.
    """
    if cwd is None:
        cwd = Path.cwd()

    verified = []
    for prj, config in cfsconfig.iter_enabled():
        # Is this a valid target ?
        target = ground_truth.resolve_user_target(
            cfsconfig.soc, 
            config.target, 
            prj,
            package=cfsconfig.package
        )

        # Is there an existing project for this core ? CLI will always be true,
        # but could fail for the .cfsconfig file
        if not len([x for x in cfsconfig.projects if x.core_id == target.core]) > 0:
            raise ValueError(
                f'A project for {target.core} could not be found'
            )

        # No user specified backend, lets find one
        if config.backend is None:
            found_backend = ground_truth.resolve_backend(target)
            if found_backend is None:
                raise SupportError(
                    'Could not find a backend which supports this configuration'
                )
            backend = ConfigBackend(Name=found_backend)
        else:
            # Verify user backend selection
            user_backend = ground_truth.backends.get(config.backend.name)
            if user_backend is None:
                raise ValueError(
                    f'Could not find the backend "{config.backend}"'
                )
            if not user_backend.can_support(target):
                raise SupportError(
                    f'{config.backend} cannot support the passed configuration'
                )
            backend = config.backend

        model_file = _resolve_source(
            config.file_info.model,
            cfsconfig.aiconfig.cache_config.base_dir / DEFAULT_MODEL_CACHE
        )
        
        if config.file_info.network is not None:
            izer_network_config_file = _resolve_source(
                config.file_info.network,
                cfsconfig.aiconfig.cache_config.base_dir / DEFAULT_INPUT_CACHE
            )
        else:
            izer_network_config_file = None

        # All looks good to me !
        verified.append(VerifiedConfig(
            name=config.name,
            prj_info=ProjectInfo(
                name=prj.name,
                workspace=cwd,
                out_dir=config.out_dir
            ),
            model_info=ModelInfo(
                file=model_file,
            ),
            target=target,
            backend=backend,
            izer_network_config_file=izer_network_config_file
        ))
    return verified


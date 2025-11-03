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


from cfsai_types.config.verified import VerifiedConfig

CFS_DIR = '.cfs'
"""Name of the project cfs directory."""

def check_file_paths(cfg: VerifiedConfig) -> None:
    """
    Check that all the file paths inside the configuration point to existing 
    files.

    Args:
        cfg: Model configuration.

    Raises:
        FileNotFoundError: If files in `cfg` could not be found with an error
            message detailing the files which were not found.
    
    !!! note
        We will check the project directories separately
    """
    invalid_paths: list[str] = []

    # Check the model path
    model_path = cfg.model_info.file
    if not model_path.exists() or not model_path.is_file():
        invalid_paths.append(model_path.as_posix())

    # Check the YAML file path
    if cfg.izer_network_config_file:
        yaml_path = cfg.izer_network_config_file
        if not yaml_path.exists() or not yaml_path.is_file():
            invalid_paths.append(yaml_path.as_posix())

    if len(invalid_paths) > 0:
        # Format an error message and raise a FileNotFoundError
        err_msg = 'The following files could not be found'
        file_list = '\n'.join([f'  - {x}' for x in invalid_paths])
        raise FileNotFoundError(f'{err_msg}\n{file_list}')
    else:
        return

def check_prj_path(cfg: VerifiedConfig) -> None:
    """
    Check that all the project paths make sense and exist.

    Args:
        cfg: Model configuration.
    
    Raises:
        NotADirectoryError: If the `cwd` of `prj_info` is not a directory.
        FileNotFoundError: If the `cfg.prj_info.name` cannot be found in the
            `cwd` directory.
    
    """
    cwd = cfg.prj_info.workspace
    prj_name = cfg.prj_info.name

    if not cwd.is_dir():
        raise NotADirectoryError(f'{cwd} is not a directory')

    dirs = [d.name for d in cwd.iterdir() if d.is_dir() and d.name != CFS_DIR]

    if prj_name not in dirs:
        raise FileNotFoundError(
            f'The following project "{prj_name}" could not be found in {cwd.as_posix()}'
        )
    else:
        return

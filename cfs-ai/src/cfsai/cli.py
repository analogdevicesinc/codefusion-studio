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
from dataclasses import dataclass
from pathlib import Path, PurePath
from typing import Annotated, Any, Optional, get_args
from urllib.parse import urlparse

import typer
from cfsai_compatibility_analyzer import CompatibilityAnalyzer
from cfsai_resource_profiler import TFLiteResourceProfiler
from pydantic import BaseModel, HttpUrl
from rich.console import Console
from rich.table import Table

from cfsai import __version__
from cfsai.backend_manager import BackendManager
from cfsai.backend_runtime import backend_executor, backend_http_server
from cfsai.logger import setup_logger
from cfsai.support import DEFAULT_MODEL_CACHE, _resolve_source, support, validate
from cfsai.ui import convert_export_to_ui
from cfsai.utils import check_file_paths, check_prj_path
from cfsai_types.backend_api import (
    BackendApi,
    BackendApiMethodName,
    BackendProtocol,
    ContainerBackend,
)
from cfsai_types.config.aiconfig import (
    _DEFAULT_CACHE_BASE,
    AiConfig,
    ModelConfig,
    _is_supported_url,
)
from cfsai_types.config.cfsconfig import CfsConfig, ConfiguredProject
from cfsai_types.config.targets import UserTarget
from cfsai_types.config.verified import VerifiedBackendConfig, VerifiedConfig
from cfsai_types.datamodel import CfsDatamodel
from cfsai_types.exceptions import SupportError
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.support import GroundTruth
from cfsai_types.support.backend import SupportedBackend

VALID_API_NAMES = set(get_args(BackendApiMethodName))

console = Console()
logger = logging.getLogger(__name__)

@dataclass
class CliContext:
    """
    Dataclass to store CLI context.
    
    Attributes:
        debug_level: CLI debug logging level
        debug_level: CLI json logging output format.
        datamodel_search_paths: User provided datamodel search paths
        datamodel_files: User provided datamodel files
    """
    debug_level: bool
    json_format: bool
    datamodel_search_paths: Optional[list[str]]
    datamodel_files: Optional[list[str]]

def _resolve_dm_paths(
        cli_ctx: CliContext
    ) -> tuple[list[Path], list[Path]]:
    """
    Resolve the user passed datamodel files and search paths and also insert the 
    development paths if we are in development mode.
    """
    user_paths = cli_ctx.datamodel_search_paths
    user_files = cli_ctx.datamodel_files

    paths = [Path(p) for p in user_paths] if user_paths else []
    files = [Path(f) for f in user_files] if user_files else []

    # If in dev mode insert the local datamodels to search path
    if os.environ.get('APP_ENV') == 'development':
        dev_path = (Path(__file__).parent.parents[2]).joinpath(
            'packages',
            'cfs-data-models',
            'socs'
        )
        if not dev_path.exists():
            raise RuntimeError(
                'In development mode and could not find local data model'
                f' index at {dev_path}'
            )
        elif not any(p.name == '.cfsdatamodels' for p in dev_path.iterdir()):
            raise RuntimeError(
                'In development mode and .cfsdatamodel index could not '
                f'be found in {dev_path}.\n'
                'Please run `yarn ws:data-models generate-index`'
            )
        paths = [dev_path, *paths]
    return paths, files
        

def _print_consumable_json(content: str) -> None:
    """
    Small utility function write JSON directly to stdout and flush immediately.
    
    Args:
        content: JSON content to write to stdout 
    
    """
    console.file.write(content + '\n')
    console.file.flush()

def _construct_config(
        target: str,
        model: str,
        cwd: Path,
        output_path: Optional[Path],
        backend: Optional[str],
        runtime: Optional[str],
        firmware_platform: Optional[str],
        izer_network_config: Optional[str],
        extensions: Optional[dict]
    ) -> CfsConfig:
    """
    Construct a `CfsConfig` file based on the user provided command line flags.

    Args:
        target: Dot separated hardware target string.
        model: Model path or URL.
        cwd: Path to the current working directory.
        output_path: Path to dump to generated code relateive to `cwd`.
        backend: Optional backend to use.
        runtime: Optional runtime to target.
        firmware_platform: Optional firmware platform to target.
        izer_network_config: Optional path or URL to the izer network 
            configuration file.
        extensions: Optional extensions dictionary.
    
    Returns:
        CFS config object.
            
    Raises:
        typer.Exit: If the `target` is not correctly parsed.
        typer.Exit: If the `target` is generic.
        typer.Exit: If the validation of the `CfsConfig` fails.
            
    !!! note
        In the case that the user is not specifying a cfsconfig file its safer to assume
        that they are not using the default cfs project layout. We need to internally 
        construct a basic cfsconfig to move forward so the easiest thing to do here is 
        to assume `cwd` points to the actual project directory. We can then internally
        use the the path `cwd/..` as the internal `cwd` and set the `ProjectName` to be 
        `cwd.stem`
    """
    try:
        parsed_target = UserTarget.from_dot_string(target)
    except Exception as _:
        logger.error(
            f'{target} is not a valid target specification.\n'\
            f'Must be in the format {UserTarget.grammar()}'
        )
        raise typer.Exit(code=1)
    
    name = PurePath(urlparse(model).path).stem
    try:
        cfg = CfsConfig(
            Soc=parsed_target.soc,
            Package=parsed_target.package,
            AiConfig=AiConfig(),
            Projects=[
                ConfiguredProject(
                    CoreId=parsed_target.core,
                    PlatformConfig={ 'ProjectName': cwd.stem },
                    FirmwarePlatform=firmware_platform,
                    AIModels=[
                        ModelConfig.model_validate({
                            "Name" : name,
                            "Files" : { 
                                "Model": model, 
                                "NetworkConfig": izer_network_config 
                            },
                            "OutDir" : output_path,
                            "Target" : {
                                "Core" : parsed_target.core,
                                "Accelerator" : parsed_target.accelerator,
                                "Runtime" : runtime
                            },
                            "Backend" : { 
                                "Name" : backend,
                                "Extensions" : extensions
                            } if backend else None,
                            "Enabled" : True
                        })
                    ]
                )
            ]
        )
    except Exception as e:
        logger.error(e)
        raise typer.Exit(code=1)

    return cfg
    
def _read_cfsconfig(
        config_path: Path, 
        core_to_build: Optional[str]
    ) -> CfsConfig:
    """
    Read the cfsconfig file from the system.

    Args:
        logger: CLI logger.
        config_path: Path to the cfsconfig file.
        core_to_build: Optional single core/project to build.

    Returns:
        CFS config object.

    Raises:
        typer.Exit: If `config_path` is not a file.
        typer.Exit: If the file could not be read or parsed as JSON.
        typer.Exit: If the file contents failed to be validated as a `CfsConfig`
            object.

    """
    if not config_path.is_file():
        logger.error(f'{config_path.as_posix()} is not a file')
        raise typer.Exit(code=1)

    try:
        with open(config_path, encoding='utf-8') as fd:
            config_data = json.load(fd)
    except Exception as e:
        logger.error(f'Failed to open {config_path.as_posix()}\n{e}')
        raise typer.Exit(code=1)
    
    try:
        cfg = CfsConfig.model_validate(config_data)
    except Exception as e:
        logger.error(f'{config_path} is not a valid cfsconfig file.\n{e}')
        raise typer.Exit(code=1)
    
    logger.debug(f'Successfully read {config_path.as_posix()}')
    # If we're only building for a specific core, disable the rest
    # Note this changes the representation of the file passed in by the user
    if core_to_build:
        found_core = False
        for prj in cfg.projects:
            if prj.core_id == core_to_build:
                found_core = True
            else:
                prj.enabled = False
        if not found_core:
            logger.error(f'{core_to_build} is not found in project.')
            raise typer.Exit(code=1)
        logger.debug(f'Only building for core "{core_to_build}"')
    
    return cfg

def _get_cfg_and_api(
        ground_truth: GroundTruth,
        output_path: Path,
        config_path: Optional[Path],
        target: Optional[str],
        model: Optional[str],
        backend: Optional[str],
        cwd: Path,
        runtime: Optional[str],
        firmware_platform: Optional[str],
        no_path_checks: bool,
        core_to_build: Optional[str],
        izer_network_config: Optional[str],
        extensions: Optional[list[str]]
    ) -> tuple[tuple[BackendApi, VerifiedBackendConfig], ...]:
    """
    Get the backend configuration and apis.

    Args:
        ground_truth: Support information.
        output_path: Path to output the generated code.
        config_path: Optional path to the cfsconfig file.
        target: Optional dot separated string hardware target.
        model: Optional model path or URL.
        backend: Optional backend name.
        cwd: Path to the working directory to use.
        runtime: Optional runtime to target.
        firmware_platform: Optional firmware platform to target.
        no_path_checks: Whether of not to check project paths.
        core_to_build: Optional single core/project to build.
        izer_network_config: Optional izer network config file path or URL.
        extensions: Optional list of extension assignment strings.

    Returns:
        A tuple of backend API and verified backend configuration tuples.
    
    Raises:
        typer.Exit: If a config file is not specified and neither a target or 
            model is specified.
        typer.Exit: If `cwd` is not a directory.
        typer.Exit: If the cfsconfig object is not valid.
        typer.Exit: If any path check fails for files and projects.
        typer.Exit: If a backend API cannot be found.
    """
    if config_path is not None:
        if target:
            logger.warning(
                f'Ignoring target {target}. Using {config_path} instead.'
            )
        if model:
            logger.warning(
                f'Ignoring model {model}. Using {config_path} instead.'
            )
        if backend:
            logger.warning(
                f'Ignoring backend {backend}. Using {config_path} instead.'
            )
        if runtime:
            logger.warning(
                f'Ignoring runtime {runtime}. Using {config_path} instead.'
            )
        if firmware_platform:
            logger.warning(
                f'Ignoring firmware platform {firmware_platform}. ' \
                    f'Using {config_path} instead.'
            )
        if izer_network_config:
            logger.warning(
                f'Ignoring izer network config {izer_network_config}. ' \
                    f'Using {config_path} instead.'
            )
        if extensions:
            logger.warning(
                f'Ignoring extensions "{extensions}". ' \
                    f'Using {config_path} instead.'
            )

        cfg = _read_cfsconfig(config_path, core_to_build)
    else:
        if target is None or model is None:
            logger.error('A target and model are the minimum required options')
            raise typer.Exit(code=1)
        
        if core_to_build:
            logger.warning(
                f'Ignoring core {core_to_build}. Only valid for config files.'
            )

        if not cwd.is_dir():
            logger.error(f'{cwd} is not a directory')
            raise typer.Exit(code=1)
        
        if extensions is not None:
            if backend is None:
                logger.error(SupportError(
                    msg='Backend must be specified if passing extensions',
                    support=list(ground_truth.backends.keys())
                ))
                raise typer.Exit(code=1)
            merged_exts = {}
            for e in extensions:
                parts = e.split('=')
                if len(parts) != 2:
                    logger.error(f'Invalid extension assignment <{e}>')
                    raise typer.Exit(code=1)
                key, value = parts
                if key in merged_exts:
                    logger.error(f'Duplicate extension assignment <{e}>')
                    raise typer.Exit(code=1)
                merged_exts[key] = value
        else: 
            merged_exts = None

        cfg = _construct_config(
            target=target,
            model=model,
            cwd=cwd,
            output_path=output_path,
            backend=backend,
            runtime=runtime,
            firmware_platform=firmware_platform,
            izer_network_config=izer_network_config,
            extensions=merged_exts
        )
        # Need to change this here to be consistent with how cfs projects are
        # structured. The constructed cfsconfig stores the `cwd` directory name
        # as the ProjectName meaning that the 'project' needs to be inside the
        # current working directory
        cwd = cwd.parent

    try:
        verified = validate(ground_truth, cfg, cwd=cwd)
    except Exception as e:
        logger.error(e)
        raise typer.Exit(code=1)
    logger.debug('Successfully validated configuration')
    # Unless told otherwise do path existence sanity checks
    try:
        for vcfg in verified:
            if not no_path_checks:
                check_prj_path(vcfg)
            check_file_paths(vcfg)
    except Exception as e:
        logger.error(e)
        raise typer.Exit(code=1)

    mgr = BackendManager()
    ret: dict[str, tuple[BackendApi, list[VerifiedConfig]]] = dict()
    for v in verified:
        api = mgr.get_backend_api(v.backend.name)
        if api is None:
            logger.error(
                f'{v.backend.name} could not be found. This should have been '\
                'caught earlier, please report this as an issue'
            )
            raise typer.Exit(code=1)
        if v.backend.name in ret:
            ret[v.backend.name][1].append(v)
        else:
            ret[v.backend.name] = (api, [v])

    return tuple(
        [(api, VerifiedBackendConfig(items=cfgs)) for api, cfgs in ret.values()]
    )

cli = typer.Typer(name='cfsai', add_completion=False)
    
@cli.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: Annotated[
        bool,
        typer.Option(
            '--version',
            is_eager=True,
            help='Show version and exit'
        )
    ] = False,
    debug_level: Annotated[
        bool, 
        typer.Option(
        '--verbose',
        help='Enable verbose logging'
    )] = False,
    json_format: Annotated[
        bool,
        typer.Option(
            '--json',
            help='Output in json format'
        )
    ] = False,
    datamodel_search_paths: Annotated[
            Optional[list[str]],
            typer.Option(
                '--datamodel-search-path', '-s',
                help='Path to search for a datamodel index file ".cfsdatamodels"'
            )
        ] = None,
    datamodel_files: Annotated[
        Optional[list[str]],
        typer.Option(
            '--datamodel-file', '-d',
            help='Path to a datamodel file to read in.'
        )
    ] = None,
) -> None:
    """CFSAI Helping you put your AI model on hardware !"""
    # Configure root logger
    setup_logger(json_format=json_format, debug_level=debug_level)
    ctx.obj = CliContext(
        debug_level=debug_level,
        json_format=json_format,
        datamodel_search_paths=datamodel_search_paths,
        datamodel_files=datamodel_files
    )
    if version:
        console.print(f'cfsai {__version__}', highlight=False)
        raise typer.Exit()
    
    if ctx.invoked_subcommand is None:
        # No subcommand is invoked, show help
        console.print(ctx.get_help())
        raise typer.Exit()

@cli.command()
def build(
        ctx: typer.Context,
        output_path: Annotated[
            Path,
            typer.Option(
                '--output-path', '-o',
                help='Output path to dump output to relative to `cwd`'
            )
        ] = Path('.'),
        config_path: Annotated[
            Optional[Path],
            typer.Option(
                '--config', '-c',
                help='Path to the cfsconfig file'
            )
        ] = None,
        target: Annotated[
            Optional[str],
            typer.Option(
                '--target', '-t',
                help=f'Hardware target in the format {UserTarget.grammar()}'
            ),
        ] = None,
        model: Annotated[
            Optional[str],
            typer.Option(
                '--model', '-m',
                help='Path to the model file'
            )
        ] = None,
        backend: Annotated[
            Optional[str],
            typer.Option(
                '--backend', '-b',
                help='Name of the backend to use'
            )
        ] = None,
        cwd: Annotated[
            Path,
            typer.Option(
                help='Change the working directory to the specified path to' \
                ' a cfs project'
            )
        ] = Path('.'),
        runtime: Annotated[
            Optional[str],
            typer.Option(
                '--runtime', '-r',
                help='Optional name of the runtime to use e.g. tflm'
            )
        ] = None,
        firmware_platform: Annotated[
            Optional[str],
            typer.Option(
                help='Optional name of the firmware platform to use e.g. msdk, zephyr'
            )
        ] = None,
        no_path_checks: Annotated[
            bool,
            typer.Option(
                '--no-path-checks',
                help='Disables checks related to project paths'
            )
        ] = False,
        core_to_build: Annotated[
            Optional[str], 
            typer.Option(
                '--only-core',
                help='Only generate models for the named core.'
            )
        ] = None,
        izer_network_config: Annotated[
            Optional[str],
            typer.Option(
                '--izer-network-config',
                help='Path or URL to the Izer network configuration YAML ' \
                'file. Required for the `izer` backend.'
            )
        ] = None,
        extensions: Annotated[
            Optional[list[str]],
            typer.Option(
                '--extension', '-e',
                help='Backend specific fields provided as key=value pairs'
            )
        ] = None
    ) -> None:
    """Compile a model to source code or a linkable binary."""
    cwd = cwd.resolve()
    dm_paths, dm_files = _resolve_dm_paths(ctx.obj)

    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    cfg_api_lst = _get_cfg_and_api(
        ground_truth=gt,
        output_path=output_path,
        config_path=config_path,
        target=target,
        model=model,
        backend=backend,
        cwd=cwd,
        runtime=runtime,
        firmware_platform=firmware_platform,
        no_path_checks=no_path_checks,
        core_to_build=core_to_build,
        izer_network_config=izer_network_config,
        extensions=extensions
    )
    for api, vcfg in cfg_api_lst:
        try:
            api.build(vcfg)
        except Exception as e:
            logger.error(e)
            raise typer.Exit(code=1)


def _execute(
        backend: Annotated[
            str,
            typer.Argument(
                help='Name of the backend to use'
            )
        ],
        command: Annotated[
            str,
            typer.Argument(
                help='Sub command to execute'
            )
        ]
    ) -> None:
    """Run the passed backend implementation."""
    mgr = BackendManager()
    _backend = mgr.get(backend)

    if _backend is None:
        logger.error(SupportError(
            msg=f'Invalid backend "{backend}" received',
            support=mgr.registered_backends()
        ))
        raise typer.Exit(code=1)

    if command not in VALID_API_NAMES:
        logger.error(SupportError(
            msg=f'Command "{command}" is not valid',
            support=list(VALID_API_NAMES)
        ))
        raise typer.Exit(code=1)

    info = _backend.info()
    if not isinstance(info.kind, ContainerBackend):
        logger.error(f'{backend} is not a contained backend')
        raise typer.Exit(code=1)

    if info.kind.protocol == BackendProtocol.HTTP:
        logger.warning(f'"{backend}" prefers to be an HTTP server')

    backend_executor(_backend.api(), command) # type: ignore[arg-type]

def _serve(
        backend: Annotated[
            str,
            typer.Argument(
                help='Name of the backend to use'
            )
        ]
    ) -> None:
    """Run the passed backend implementation."""
    mgr = BackendManager()
    _backend = mgr.get(backend)

    if _backend is None:
        logger.error(SupportError(
            msg=f'Invalid backend "{backend}" received',
            support=mgr.registered_backends()
        ))
        raise typer.Exit(code=1)

    info = _backend.info()
    if not isinstance(info.kind, ContainerBackend):
        logger.error(f'{backend} is not a contained backend')
        raise typer.Exit(code=1)

    if info.kind.protocol == BackendProtocol.DIRECT:
        logger.warning(f'"{backend}" prefers to be a directly executed')

    backend_http_server(_backend.api())

# This should be moved to cfsai-tflite in a refactor but here now for 
# convenience
def _is_valid_tflite_file(f: Path) -> bool:
    if not f.exists() or not f.is_file():
        return False
    with open(f, 'rb') as fd:
        raw = fd.read()
    return raw[4:8] == b'TFL3'


def _validate_model_and_target(
        ground_truth: GroundTruth,
        model: Optional[str], 
        target: Optional[str]
    ) -> tuple[HardwareProfile, Path]:
    """
    Common initialization logic for advanced AI tools CLI commands.
    
    Validates and processes the model and target parameters that are shared
    between the advanced AI tools.

    Args:
        ground_truth: Support information to get the datamodel.
        model: Optional path or URL to the model file.
        target: Optional target specification string (format: <soc>.<core>).
        
    Returns:
        Tuple containing:
            - dict: Hardware specification datamodel for the target SoC
            - Path: Resolved path to the model file
            
    Raises:
        typer.Exit: If target or model parameters are missing
        typer.Exit: If target specification is invalid
        typer.Exit: If model file is not a valid TFLite file
        typer.Exit: If the target SoC is not supported
    """
    # A target and model must be supplied (until cfsconfig files are supported)
    if target is None or model is None:
        logger.error('A target and model are the minimum required options')
        raise typer.Exit(code=1)
    # Parse target
    try:
        parsed_target = UserTarget.from_dot_string(target)
    except Exception as _:
        logger.error(
            f'{target} is not a valid target specification.\n'\
            f'Must be in the format {UserTarget.grammar()}'
        )
        raise typer.Exit(code=1)

    if parsed_target.accelerator:
        logger.error(
            f'Accelerators like "{parsed_target.accelerator}" are not currently '
            'supported for this feature'
        )
        raise typer.Exit(code=1)

    # Resolve model
    _model = HttpUrl(model) if _is_supported_url(model) else Path(model)
    model_path = _resolve_source(
        _model,
        _DEFAULT_CACHE_BASE / DEFAULT_MODEL_CACHE
    )

    # Only tflite is supported. We check after download for convenience 
    if not _is_valid_tflite_file(model_path):
        logger.error(
            f'"{model}" is not a TFLITE file'
        )
        raise typer.Exit(code=1)
    
    datamodel = ground_truth.datamodels.get(parsed_target.soc)
    if datamodel is None or not datamodel.ai_enabled():
        logger.error(SupportError(
            f'"{parsed_target.soc}" is not a supported SoC',
            support=ground_truth.supported_socs()
        ))
        raise typer.Exit(code=1)
    core_model = datamodel.get_core(parsed_target.core)
    if core_model is None:
        logger.error(SupportError(
            f'"{parsed_target.core}" not found in datamodel',
            support=[c.id for c in datamodel.iter_ai_cores()]
        ))
        raise typer.Exit(code=1)
    hw_profile = core_model.hw_profile
    if hw_profile is None:
        logger.error(SupportError(
            f'"{parsed_target.core}" doesn\'t contain a hardware profile',
            support=ground_truth.supported_socs()
        ))
        raise typer.Exit(code=1)
    return hw_profile, model_path
     


@cli.command()
def profile(
    ctx: typer.Context,
    model: Annotated[
        Optional[str],
        typer.Option(
            '--model', '-m',
            help='Path to the model file'
        )
    ] = None,
    target: Annotated[
        Optional[str],
        typer.Option(
            '--target', '-t',
            help=f'Hardware target in the format {UserTarget.grammar()}'
        ),
    ] = None,
    json_file: Annotated[
        Optional[str],
        typer.Option(
            '--json-file', '-j',
            help='Path to the JSON file for output'
        )
    ] = None,
    text_file: Annotated[
        Optional[str],
        typer.Option(
            '--text-file', '-f',
            help='Path to the text file for output'
        )
    ] = None
) -> None:
    """Profile resource usage for a model given a target."""
    # Validate input parameters
    dm_paths, dm_files = _resolve_dm_paths(ctx.obj)

    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    hw_profile, model_path = _validate_model_and_target(gt, model, target)

    # Initialize resource profiler with performance characteristics
    profiler = TFLiteResourceProfiler()
    
    # Perform comprehensive resource analysis with hardware context
    profiling_report = profiler.analyze_model(
        model_path.as_posix(), 
        hardware_profile=hw_profile
    )

    if json_file:
        profiling_report.save_as_json(json_file)
    if text_file:
        profiling_report.save_as_text(text_file)
    if not json_file and not text_file:
        profiling_report.visualize_resource_profile()


@cli.command()
def compat(
    ctx: typer.Context,
    model: Annotated[
        Optional[str],
        typer.Option(
            '--model', '-m',
            help='Path to the model file'
        )
    ] = None,
    target: Annotated[
        Optional[str],
        typer.Option(
            '--target', '-t',
            help=f'Hardware target in the format {UserTarget.grammar()}'
        ),
    ] = None,
    json_file: Annotated[
        Optional[str],
        typer.Option(
            '--json-file', '-j',
            help='Path to the JSON file for output'
        )
    ] = None,
) -> None:
    """Analyze compatibility usage for a model given a target."""
    cli_ctx: CliContext = ctx.obj
    dm_paths, dm_files = _resolve_dm_paths(ctx.obj)

    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    # Validate input parameters
    hw_profile, model_path = _validate_model_and_target(gt, model, target)

    analyzer = CompatibilityAnalyzer()
    compatibility_report = analyzer.analyze_model(
        model_path.as_posix(), 
        hw_profile
    )

    json_format = cli_ctx.json_format
    compatibility_report.set_json(json_format)
    if json_file:
        compatibility_report.save_as_json(json_file)
    compatibility_report.print_report()

    if compatibility_report.has_critical_issues():
        # Return error code 10 here so differentiate between errors running (1)
        raise typer.Exit(code=10)

@cli.command(name='clean-cache')
def clean_cache() -> None:
    """Clean the cache which stores downloaded models."""
    for dirpath, _dirnames, filenames in os.walk(_DEFAULT_CACHE_BASE):
        for filename in filenames:
           file_path = os.path.join(dirpath, filename)
           try:
               os.remove(file_path)
               logger.info(f"Deleted: {file_path}")
           except Exception as e:
               logger.error(f"Failed to delete {file_path}: {e}")
               raise typer.Exit(code=1)

class ExportData(BaseModel):
    """Export data type to make JSON serialization simple."""
    Config: dict[str, Any]
    Datamodels: dict[str, CfsDatamodel]
    SupportedBackends: dict[str, SupportedBackend]
    Project: dict[str, Any]


@cli.command()
def export(
    ctx: typer.Context,
    ui: Annotated[
        bool,
        typer.Option(
            '--ui',
            help='Generate JSON structure required for the CFS System Planner'
        )
    ] = False
) -> None:
    """Export the support data."""
    cli_ctx: CliContext = ctx.obj
    dm_paths, dm_files = _resolve_dm_paths(ctx.obj)
    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    json_format = cli_ctx.json_format

    export_data = ExportData(
        Config=AiConfig.model_json_schema(),
        Project=ConfiguredProject.model_json_schema(),
        SupportedBackends={k : v for k, v in gt.backends.items()},
        Datamodels={
            dm.name : dm \
            for dm in gt.datamodels.iter_ai_datamodels_no_pkg()
        }
    )
    if ui:
        console.print_json(
            json.dumps(convert_export_to_ui(export_data.model_dump()))
        )
    else:
        if json_format:
            _print_consumable_json(export_data.model_dump_json())
        else:
            console.print_json(export_data.model_dump_json())

@cli.command(name='list-targets')
def list_targets(
    ctx: typer.Context,
    packages: Annotated[
        bool,
        typer.Option(
            '--packages',
            help='Include packages in the target list'
        )
    ] = False
) -> None:
    """Print a list of supported targets."""
    cli_ctx: CliContext = ctx.obj
    dm_paths, dm_files = _resolve_dm_paths(cli_ctx)
    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    json_format = cli_ctx.json_format
    targets: list[UserTarget] = []

    iterator = gt.datamodels.iter_ai_datamodels() if packages else \
        gt.datamodels.iter_ai_datamodels_no_pkg()
    for dm in iterator:
        soc = dm.name
        package = dm.part_package if packages else None
        cores = [x.id for x in dm.iter_ai_cores()]
        accels = [x for x in dm.iter_accelerators()]
        if not cores:
            continue
        targets.extend([UserTarget(Soc=soc, Package=package, Core=c) for c in cores])
        targets.extend([
            UserTarget(
                Soc=soc, 
                Package=package, 
                Core=ac, 
                Accelerator=a.name
            ) for a in accels for ac in a.cores if ac in cores
        ])
    
    if json_format:
        content = json.dumps([t.model_dump() for t in targets])
        _print_consumable_json(content)
    else:
        output = 'Supported target combinations in format ' \
            f'{UserTarget.grammar()}:\n\n'
        output += '\n'.join([f'  - {t.into_dot_string()}' for t in targets])
        console.print(output, highlight=False) 

@cli.command(name='list-extensions')
def list_extensions(ctx: typer.Context, backend: str) -> None:
    """Print a schema of the available extensions for passed backend."""
    cli_ctx: CliContext = ctx.obj
    dm_paths, dm_files = _resolve_dm_paths(cli_ctx)
    gt = support(
        datamodel_file_paths=dm_files,
        datamodel_search_paths=dm_paths
    )
    json_format = cli_ctx.json_format

    _backend = gt.backends.get(backend)
    if not _backend:
        logger.error(
            SupportError(
                msg=f'"{backend}" is not a supported backend',
                support=gt.supported_backends()
            )
        )
        raise typer.Exit(code=1)
    
    if _backend.extensions is None:
        raise typer.Exit()
    
    props: dict[str, dict[str, Any]] = _backend.extensions.get('properties') # type: ignore
    if props is None:
        logger.error('Invalid backend extension schema.')
        raise typer.Exit(code=1)
    if json_format:
        _print_consumable_json(json.dumps(props))
    else:
        table = Table(title=backend)
        table.add_column("Name")
        table.add_column("Description")
        table.add_column("Type")
        table.add_column("Default")
        for k, v in props.items():
            prop_ty: Optional[str] = v.get('type', None)
            prop_any_of: Optional[list[dict[str, str]]] = v.get('anyOf', None)
            if prop_ty:
                ty = prop_ty
            elif prop_any_of:
                ty = ' | '.join(set([t.get('type', 'null') for t in prop_any_of]))
            else:
                logger.warning(
                    f'Skipping extensions {k} due to missing type information'
                )
                continue # Lets not fail here, just generate a warning and skip
            _default = v.get('default')
            default = 'null' if _default is None else str(_default)
            table.add_row(
                k,
                v.get('description', 'No description provided.'),
                ty,
                default
            )
        console.print(table)
        

@cli.command(name='list-backends')
def list_backends(ctx: typer.Context) -> None:
    """List the supported backends."""
    cli_ctx: CliContext = ctx.obj
    mgr = BackendManager()
    json_format = cli_ctx.json_format

    if json_format:
        _print_consumable_json(
            json.dumps({'backends': [n for n, _ in mgr.iter_backends()]})
        )
    else:
        output = '\n'.join([f'  - {n}' for n, _ in mgr.iter_backends()])
        console.print(output)

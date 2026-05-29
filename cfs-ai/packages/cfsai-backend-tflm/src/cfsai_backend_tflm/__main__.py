# Copyright (c) 2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import TypeAdapter

from cfsai_backend_tflm.exceptions import CfsaiTflmError
from cfsai_backend_tflm.extensions import CfsaiTflmExtensions
from cfsai_tflite import TfliteInfo
from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.logging import EventType, log_event, setup_logger

timestamp = time.ctime()

logger = logging.getLogger("cfsai_backend_tflm")


@dataclass
class _FileInfo:
   symbol: str
   section: str
   size: str
   contents: str

@dataclass
class _GenInfo:
    files: list[_FileInfo] = field(default_factory=list)
    arena_size: int = 0
    arena_section: str = ''
    arena_estimated: bool = False

def _generate_array(input_fname: Path, cols:int) -> tuple[int, str]:
    """ 
    Reads tflite file and converts it to a C array of bytes.

    Args:
        input_fname: Path to the input file.
        cols: Number of columns (bytes) to display per line.

    Returns:
        Tuple of the size of model in bytes and string hex representation of 
            model.
    """
    with open(input_fname, 'rb') as input_file:
        buffer = input_file.read()
    size = len(buffer)

    # Convert buffer array to hex string
    hex_values = [f'0x{b:02x}' for b in buffer]
    lines = [','.join(hex_values[i:i+cols]) for i in range(0, len(hex_values), cols)]
    out_string = ',\n'.join(lines)

    return size, out_string

def _generate_c_file(
        out_fname: Path,
        model: str,
        gen: _GenInfo,
        info: TfliteInfo
    ) -> None:
    """ 
    Writes model data to cpp source file.

    Args:
        out_fname: Path to the output c source code file.
        model: Name of the model.
        gen: Class describing the data to be generated.
        info: Model information.
    """
    with open(out_fname, 'w') as f:
        files_text = ''
        for file in gen.files:
            files_text += (
                f'alignas(16) const unsigned char {file.symbol}[] = {{\n' +
                file.contents + '\n' + 
                '};\n\n'
            )
        # Text structure used for any compatibility code
        compat_text = f'const unsigned int {model}_len = {model.upper()}_LEN;\n'
        text = (
            f'/*\n * Generated C representation of {model} on {timestamp}. Do not modify.\n */\n\n' # noqa: E501
            f'#include "{model}.hpp"\n\n'
            f'alignas(16) unsigned char {model}_arena[{gen.arena_size}];\n' +  
            files_text + 
            info.get_resolver_code(model) +
            compat_text
        )
        f.write(text)

def _generate_h_file(
        out_fname: Path,
        model: str,
        gen: _GenInfo,
        info: TfliteInfo
    ) -> None:
    """ 
    Writes model metadata to hpp header file.

    Args:
        out_fname: Path to the output header file.
        model: Name of the model.
        gen: Class describing the data to be generated.
        info: Model information.
    """
    with open(out_fname, 'w') as f:

        upper = model.upper()

        files_text = ''
        macros_text = ''
        for file in gen.files:
            macros_text +=  f'#define {file.symbol.upper()}_LEN ({file.size})\n' 
            files_text += (
                f'extern const unsigned char {file.symbol}[] __attribute__(({file.section}aligned(16)));\n\n' # noqa: E501
            )
        arena_status = "estimated" if gen.arena_estimated else "provided"
        macros_text += (
            f'/* Arena size for {model} ({arena_status})*/\n'
            f'#define {upper}_ARENA_SIZE ({gen.arena_size})\n'
        )

        if len(info.input_width) != len(info.input_len):
            raise CfsaiTflmError(
                'Model input width and length lists must be the same length. '
                f'Got {len(info.input_width)} widths '
                f'and {len(info.input_len)} lengths.'
            )
        if len(info.output_width) != len(info.output_len):
            raise CfsaiTflmError(
                'Model output width and length lists must be the same length. '
                f'Got {len(info.output_width)} widths '
                f'and {len(info.output_len)} lengths.'
            )
        if len(info.input_width) == 0:
            raise CfsaiTflmError(
                'Model has no inputs.'
            )
        if len(info.output_width) == 0:
            raise CfsaiTflmError(
                'Model has no outputs.'
            )
        if len(info.input_width) > 1:
            logger.warning(
                'Model has multiple inputs. '
                'Macros will be generated for all but APIs will only use input 0.'
            )
        if len(info.output_width) > 1:
            logger.warning(
                'Model has multiple outputs. '
                'Macros will be generated for all but APIs will only use output 0.'
            )

        for i in range(len(info.input_width)):
            macros_text += (
                f'#define {upper}_INPUT_{i}_WIDTH ({info.input_width[i]})\n'
                f'#define {upper}_INPUT_{i}_LEN ({info.input_len[i]})\n'
            )
        for i in range(len(info.output_width)):
            macros_text += (
                f'#define {upper}_OUTPUT_{i}_WIDTH ({info.output_width[i]})\n'
                f'#define {upper}_OUTPUT_{i}_LEN ({info.output_len[i]})\n'
            )

        macros_text += f'#define {upper}_NUM_OPERATORS ({info.num_operators})\n' 

        text = (
            f'/*\n * Generated C representation of {model} on {timestamp}. Do not modify.\n\n' # noqa: E501
            f'Model summary:\n--------------\n{info.summary}\n\n'
            f'Model graph:\n------------\n{info.graph}\n*/\n\n' +
            macros_text +
            '\n\n'
            '#if defined(__cplusplus)\n'
            '#pragma GCC diagnostic push\n'
            '// TFLM library mixes float/double literals which produces warnings\n'
            '#pragma GCC diagnostic ignored "-Wdouble-promotion"\n'
            '#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"\n'
            '#pragma GCC diagnostic pop\n\n'
            f'{info.get_resolver_prototype(model)} \n'
            '#else /* __cplusplus */ \n'
            '#warning TensorFlow Lite Micro sources require C++ for full functionality\n' # noqa: E501
            '#endif /* __cplusplus */\n\n' 
            f'extern unsigned char {model}_arena[] __attribute__(({gen.arena_section}aligned(16)));\n\n' + #noqa: E501
            files_text
        )
        f.write(text)

def _generate_top_level_header(
        symbols: set[str],
        build_dir: Path
    ) -> None:
    """ 
    Writes top level adi_tflm.h.

    Args:
        symbols: list of symbols created, from which we can infer the filenames.
        build_dir: Directory to create header in.
    """
    out_path = build_dir / 'adi_tflm.hpp'
    include_text = (
        '// Standard TfLM includes\n'
        '#pragma GCC diagnostic push\n'
        '// TFLM library mixes float/double literals which produces warnings\n'
        '#pragma GCC diagnostic ignored "-Wdouble-promotion"\n'
        '#include "tensorflow/lite/core/c/common.h"\n'
        '#include "tensorflow/lite/micro/micro_interpreter.h"\n'
        '#include "tensorflow/lite/micro/micro_log.h"\n'
        '#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"\n'
        '#include "tensorflow/lite/micro/micro_profiler.h"\n'
        '#include "tensorflow/lite/micro/recording_micro_interpreter.h"\n'
        '#include "tensorflow/lite/micro/system_setup.h"\n'
        '#include "tensorflow/lite/schema/schema_generated.h"\n'
        '#pragma GCC diagnostic pop\n\n'
    )

    with open(out_path, 'w') as f:

        text = (
            f'/*\n * Generated C representation of enabled models on {timestamp}. Do not modify.\n' # noqa: E501
            ' */\n\n' + 
            include_text + 
            '// TLFM Model includes\n'
        )
        for s in symbols:
            text += f'#include "{s}.hpp"\n' 

        f.write(text)

def _to_c_identifier(s: str) -> str:
    """
    Perform some basic operations to make the provided string a valid C variable
    name.

    Args:
        s: String to convert to a valid C identifier.

    Returns:
        A valid C identifier.
    """
    # Strip whitespace
    s = s.strip()
    # Replace invalid characters with underscores
    s = re.sub(r'[^a-zA-Z0-9_]', '_', s)
    # Prepend underscore if required
    if not re.match(r'^[a-zA-Z_]', s):
        s = '_' + s

    return s

def _build(cfgs: VerifiedBackendConfig) -> None:
    """
    Build API implementation.

    Args:
        cfgs: Array of backend configurations.

    Raises:
        CfsaiTflmError: If the user provides backend extensions they are not
            valid.
    """
    logger.debug(f'Building TFLM for {cfgs.items[0].target.core}')
    used_symbols = set()
    for cfg in cfgs.items:
        # Get config data
        build_dir = cfg.prj_info.output_path()
        model_file = cfg.files['Model']

        # If no out_dir has been specified, use adi_tflm
        if cfg.prj_info.out_dir == Path("."):
            report_dir = Path(cfg.prj_info.name) / 'src' / 'adi_tflm'
            build_dir = build_dir / 'src' / 'adi_tflm' 
        else:
            report_dir = cfg.prj_info.out_dir

        # Load TFLM Extension config entry (if exists)
        if cfg.backend.extensions is not None:
            ta = TypeAdapter(CfsaiTflmExtensions)
            try:
                ext = ta.validate_python(cfg.backend.extensions)
            except Exception as e:
                raise CfsaiTflmError(
                    f'config.backend "{cfg.backend}" does not appear to '
                    'contain a valid CfsaiTflmExtensions'
                ) from e
        else:
            ext = CfsaiTflmExtensions()

        # config is good, start work
        build_dir.mkdir(exist_ok=True, parents=True)

        info = TfliteInfo(model_file)
        

        # Use overridden symbol if defined, otherwise fall back to name
        model_name = _to_c_identifier(
            ext.symbol if ext.symbol else cfg.name
        )
        # Check if symbol has already been used
        if model_name in used_symbols:
            raise CfsaiTflmError(
                f'Duplicate model symbol "{model_name}" found'
            )
        else:
            used_symbols.add(model_name)

        # Construct generation data
        gen_data = _GenInfo()

        model_size, model_array = _generate_array(model_file, 16)
        gen_data.files.append(_FileInfo(
             model_name, 
             f'section("{ext.section}"), ' if ext.section else '',
             model_size, 
             model_array
        ))

        if 'Dataset' in cfg.files:
            data_size, data_array = _generate_array(cfg.files['Dataset'], 16)
            gen_data.files.append(_FileInfo(
                f'{model_name}_dataset', 
                f'section("{ext.dataset_section}"), ' if ext.dataset_section else '',
                data_size,
                data_array
            ))

        # Set up arena details
        if ext.arena_size:
            gen_data.arena_size = ext.arena_size
        else:
            logger.info(
                f'No arena size provided. Estimated to be {info.arena_size} bytes'
            )
            gen_data.arena_size = info.arena_size
            gen_data.arena_estimated = True
        gen_data.arena_section = \
            f'section("{ext.arena_section}"), ' if ext.arena_section else ''



        # Start generating code
        _generate_c_file(
            build_dir / f'{model_name}.cpp',
            model_name,
            gen_data,
            info
        )
        log_event(logger, EventType.FILE, report_dir / f'{model_name}.cpp')
        _generate_h_file(
           build_dir / f'{model_name}.hpp',
           model_name,
           gen_data,
           info
        )
        log_event(logger, EventType.FILE, report_dir / f'{model_name}.hpp')
    
    _generate_top_level_header(used_symbols, build_dir)
    log_event(logger, EventType.FILE, report_dir / 'adi_tflm.hpp')

if __name__ == "__main__":
    """
    If invoked directly, read VerfiedBackendConfig from a file
    and execute that.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True, help='Config file')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()

    setup_logger(debug_level=args.verbose)

    logger.debug(f"Invoking tflm with: \n{args}")

    try:
        # Read JSON and parse into Pydantic model
        with open(args.file) as f:
            data = json.load(f)
            cfgs = VerifiedBackendConfig(**data)
            _build(cfgs)
    except Exception as e:
        logger.error(f'{e.__class__.__name__}{e}')
        sys.exit(1)


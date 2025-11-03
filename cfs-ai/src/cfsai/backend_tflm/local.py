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
import re
import time
from pathlib import Path

from pydantic import TypeAdapter

from cfsai.backend_tflm.exceptions import CfsaiTflmError
from cfsai.backend_tflm.extensions import CfsaiTflmExtensions
from cfsai_tflite import TfliteInfo
from cfsai_types.backend_api import BackendApi
from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.logging import file_created_event

timestamp = time.ctime()
logger = logging.getLogger(__name__)
    

def _generate_array(input_fname: Path) -> tuple[int, str]:
    """ 
    Reads tflite file and converts it to a C array of bytes.

    Args:
        input_fname: Path to the input file.

    Returns:
        Tuple of the size of model in bytes and string hex representation of 
            model.
    """
    with open(input_fname, 'rb') as input_file:
        buffer = input_file.read()
    size = len(buffer)

    # Convert buffer array to hex string
    hex_values = [hex(buffer[i]) for i in range(len(buffer))]
    out_string = ','.join(hex_values)

    return size, out_string

def _generate_c_file(
        out_fname: Path,
        model: str,
        array_contents: str,
        size: int,
        info: TfliteInfo
    ) -> None:
    """ 
    Writes model data to cpp source file.

    Args:
        out_fname: Path to the output c source code file.
        model: Name of the model.
        array_contents: Model array contents.
        size: Size of the model array.
        info: Model infomation.
    """
    with open(out_fname, 'w') as f:
        text = (
            f'/*\n * Generated C representation of {model} on {timestamp}. Do not modify.\n */\n\n' # noqa: E501
            f'#include "{model}.hpp"\n\n'
            f'const unsigned int {model}_len = {size};\n'
            f'alignas(16) unsigned char {model}[] = {{' +
            array_contents +
            '};\n\n' +
            info.get_resolver_code(model)
        )
        f.write(text)

def _generate_h_file(
        out_fname: Path,
        model: str,
        section: str,
        info: TfliteInfo
    ) -> None:
    """ 
    Writes model metadata to hpp header file.

    Args:
        out_fname: Path to the output header file.
        model: Name of the model.
        section: Memory to store model data in.
        info: Model infomation.
    """
    with open(out_fname, 'w') as f:

        text = (
            f'/*\n * Generated C representation of {model} on {timestamp}. Do not modify.\n\n' # noqa: E501
            f'Model summary:\n--------------\n{info.summary}\n\n'
            f'Model graph:\n------------\n{info.graph}\n*/\n\n'
            f'#define {model.upper()}_NUM_OPERATORS ({info.num_operators})\n\n'
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
            f'extern const unsigned int {model}_len;\n'
            f'extern unsigned char {model}[] __attribute__(({section}aligned(16)));\n\n'
        )
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

class LocalCfsaiTflm(BackendApi):
    """CFSAI TFLM backend API implementation."""

    def build(self, cfgs: VerifiedBackendConfig) -> None:
        """
        Build API implementation.

        Args:
            cfgs: Array of backend configurations.
            logger: Host side logger.

        Raises:
            CfsaiTflmError: If the user provides backend extensions they are not
                valid.
        """
        used_symbols = {}
        for cfg in cfgs.items:
            # Get config data
            model_file = cfg.model_info.file
            build_dir = cfg.prj_info.output_path()

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
            size, array = _generate_array(model_file)

            # Convert from optional to str
            section = f'section("{ext.section}"), ' if ext.section else ''

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
                used_symbols[model_name] = True

            # Start generating code
            _generate_c_file(
                build_dir / f'{model_name}.cpp',
                model_name,
                array,
                size,
                info
            )
            file_created_event(
                logger,
                report_dir / f'{model_name}.cpp'
            )
            _generate_h_file(
                build_dir / f'{model_name}.hpp',
                model_name,
                section,
                info
            )
            file_created_event(
                logger,
                report_dir / f'{model_name}.hpp'
            )


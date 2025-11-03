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


import subprocess
import platform
import urllib.request
import zipfile
import shutil
import tempfile
import re
from typing import Optional
from pathlib import Path

try:
    from hatchling.builders.hooks.plugin.interface import BuildHookInterface
except ImportError:
    # Just to make the script runnable without hatching
    BuildHookInterface = object # type: ignore

CWD = Path(__file__).parent
FLATC_VERSION = '25.2.10'
TARGET_DIR = Path(CWD, 'src', 'cfsai_tflite', 'schema')
SCHEMA_NAME = 'schema.fbs'
DEFAULT_PKG_NAME = 'tflite'
NEW_PKG_NAME = 'schema'
NEW_PKG_PYTHON_PATH = 'cfsai_tflite.schema'
SYSTEM = platform.system().lower()
ARCH = platform.machine().lower()
VENV = '.venv'
TEMP_ZIP_LOC: Optional[Path] = None

if 'linux' in SYSTEM:
    ZIP_NAME = 'Linux.flatc.binary.g++-13.zip'
    FLATC_BIN_NAME = 'flatc'
elif 'windows' in SYSTEM:
    ZIP_NAME = 'Windows.flatc.binary.zip'
    FLATC_BIN_NAME = 'flatc.exe'
elif 'darwin' in SYSTEM:
    FLATC_BIN_NAME = 'flatc'
    if 'x86_64' in ARCH:
        ZIP_NAME = 'MacIntel.flatc.binary.zip'
    elif 'arm64' in ARCH:
        ZIP_NAME = 'Mac.flatc.binary.zip'
    else:
        raise SystemError(f'{ARCH} is not supported on mac')
else:
    raise SystemError(f'{SYSTEM} is not supported')

RELEASE_URL = f'https://github.com/google/flatbuffers/releases/download/v{FLATC_VERSION}/{ZIP_NAME}'

def _find_venv_bin() -> Optional[Path]:
    cwd = CWD
    while True:
        if VENV in [f.name for f in cwd.iterdir() if f.is_dir()]:
            return cwd / VENV / 'Scripts' if 'windows' in SYSTEM else \
                cwd / VENV / 'bin'
        if cwd.parent == cwd:
            return None
        cwd = cwd.parent

def _get_flatc_bin(to: Path):
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        zip_path = tmpdir_path / ZIP_NAME
        urllib.request.urlretrieve(RELEASE_URL, zip_path)

        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(tmpdir_path)

        flatc_bin = next(tmpdir_path.rglob('flatc*'))
        shutil.move(flatc_bin, to)
        print(f"✅ flatc downloaded to {to.as_posix()}")
        to.chmod(0o755)

def _resolve_flatc(venv_bin: Path) -> Path:

    if FLATC_BIN_NAME not in [f.name for f in venv_bin.iterdir() if f.is_file()]:
        print(f"Downloading flatc from {RELEASE_URL}")
        _get_flatc_bin(venv_bin / FLATC_BIN_NAME)
    else:
        print(f"✅ found flatc {(venv_bin / FLATC_BIN_NAME).as_posix()}")
    
    return venv_bin / FLATC_BIN_NAME
    
def _post_process(out_dir: Path):
    if not out_dir.is_dir():
        raise FileNotFoundError(f'Cannot post process {out_dir} which is not a directory')
    
    mods = []
    # Iterate through the generated python modules
    for mod in out_dir.glob("*.py"):
        if mod.is_file():
            try:
                content = mod.read_text(encoding='utf-8')
                # Substitute `from tflite` to `from cfsai_tflite.schema`
                new_content = re.sub(
                    rf'\bfrom {DEFAULT_PKG_NAME}\b', 
                    f'from {NEW_PKG_PYTHON_PATH}',
                    content
                )
                mod.write_text(new_content, encoding='utf-8')
                shutil.move(mod, TARGET_DIR / mod.name)
                mods.append(mod.stem)
                print(f"✅ {mod}")
            except Exception as e:
                print(f"❌ Error processing {mod}: {e}")
                raise RuntimeError
    if '.gitignore' not in [f.name for f in TARGET_DIR.iterdir() if f.is_file()]:
        with open(TARGET_DIR / '.gitignore', 'w', encoding='utf-8') as fd:
            fd.write('*')
    with open(TARGET_DIR / '__init__.py', 'w', encoding='utf-8') as fd:
        for mod in mods:
            if mod == '__init__':
                continue
            fd.write(f"from {NEW_PKG_PYTHON_PATH}.{mod} import {mod} as {mod}\n")

    shutil.rmtree(out_dir)

def code_gen():
    venv_bin = _find_venv_bin()
    if venv_bin:
        print(f'✅ found virtual environment {venv_bin.parent}')
        flatc = _resolve_flatc(venv_bin)
        # Check if we have the schema
        schema_path = Path(SCHEMA_NAME)
        if not schema_path.exists():
            raise FileNotFoundError(f'Could not find the schema {schema_path}')
        
        if TARGET_DIR.exists() and len(list(TARGET_DIR.iterdir())) > 1:
            print("✅ flatbuffer parser already generated")
        else:
            result = subprocess.run(
                [str(flatc), '--python', '-o', TARGET_DIR.as_posix(), schema_path.as_posix()],
                capture_output=True, text=True
            )
            if result.returncode != 0:
                raise subprocess.SubprocessError(result.stdout, result.stderr)

            _post_process(TARGET_DIR / DEFAULT_PKG_NAME)
    else:
        print('Could not find virtual environment skipping parser generation')


class CustomBuildHook(BuildHookInterface):

    def initialize(self, version, build_data):
        code_gen()
        return super().initialize(version, build_data)
    
if __name__ == '__main__':
    
    code_gen()
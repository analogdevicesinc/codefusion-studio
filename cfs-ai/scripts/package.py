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
import sys
import platform
import subprocess
from pathlib import Path
import urllib.request as request
import json
import tarfile
import zipfile
import os 
import shutil
from dataclasses import dataclass
from typing import Self, Optional

logging.basicConfig(
    level=logging.DEBUG
)
logger = logging.getLogger(__name__)

@dataclass
class LlvmTriple:
    arch: str
    vendor: str
    os: str
    toolchain: Optional[str]

    @classmethod
    def from_string(cls, v: str) -> Self:
        split = v.strip().split('-')
        if len(split) == 4:
            arch, vendor, os, toolchain = split
        elif len(split) == 3:
            toolchain = None
            arch, vendor, os = split
        else:
            raise ValueError(
                f'Invalid LLVM triple "{v}"'
            )
        
        return cls(
                arch=arch,
                vendor=vendor,
                os=os,
                toolchain=toolchain
            )
    
    def __str__(self) -> str:
        ret = f'{self.arch}-{self.vendor}-{self.os}'
        if self.toolchain:
            ret = f'{ret}-{self.toolchain}'
        return ret

@dataclass
class Version:
    major: int
    minor: int
    patch: Optional[int]
    delim: str = '.'

    def __str__(self) -> str:
        ret = f'{self.major}{self.delim}{self.minor}'
        if self.patch:
            ret = f'{ret}{self.delim}{self.patch}'
        return ret

    @classmethod
    def from_string(cls, v: str, delim='.') -> Self:
        split = v.strip().split(delim)
        if len(split) == 3:
            major, minor, patch = split
            patch = int(patch)
        elif len(split) == 2:
            patch = None
            major, minor = split
        else:
            print(f'Invalid version {v}')
            exit(-1)
        return cls(int(major), int(minor), patch)

    def no_patch(self) -> str:
        return f'{self.major}{self.delim}{self.minor}'


@dataclass
class Distribution:
    pyver: Version
    tag: str
    target: LlvmTriple
    ext: str
    prepend: Optional[str] = None

    def __str__(self) -> str:
        ret = f'cpython-{str(self.pyver)}+{self.tag}-{str(self.target)}-install_only.{self.ext}'
        if self.prepend:
            ret = f'{self.prepend}-{ret}'
        return ret

    def github_name(self) -> str:
        arch = self.target.arch
        os = self.target.os
        if os == 'windows':
            os = 'windows-latest'
        elif os == 'linux':
            os = 'ubuntu-latest'
        else:
            os = 'macos-latest'
        
        ret = f'cpython-{self.pyver.no_patch()}-{os}.{self.ext}'
        if self.prepend:
            ret = f'{self.prepend}-{ret}'
        return ret


    @classmethod
    def from_pyver_and_tag(cls, pyver: str, tag: str) -> Self:
        # These version maps are based on the pinned release
        version_map = {
            '3.10' : Version(3, 10, 18),
            '3.11' : Version(3, 11, 13),
            '3.12' : Version(3, 12, 11),
            '3.13' : Version(3, 13, 6)
        }
        system_map = {
            'linux' : LlvmTriple(
                arch='x86_64',
                vendor='unknown',
                os='linux',
                toolchain='gnu' # Maybe musl in future !?!?
            ),
            'windows' : LlvmTriple(
                arch='x86_64',
                vendor='pc',
                os='windows',
                toolchain='msvc'
            ),
            'darwin' : LlvmTriple(
                arch='aarch64',
                vendor='apple',
                os='darwin',
                toolchain=None
            )
        }

        resolved_pyver = version_map.get(pyver)
        if resolved_pyver is None:
            logger.error(f'Could not resolve the provided python version "{pyver}"')
            exit(-1)

        system = platform.system().lower()
        resolved_system = system_map.get(system)
        if resolved_system is None:
            logger.error(f'Unsupported system "{system}"')
            exit(-1)
        
        return cls(
            target=resolved_system,
            pyver=resolved_pyver,
            tag=tag,
            ext='tar.gz'
        )

@dataclass
class ReleaseDataV1:
    version: int
    tag: str
    release_url: str
    asset_url_prefix: str

    @classmethod
    def from_github(cls) -> Self:
        url = 'https://raw.githubusercontent.com/astral-sh/'\
            'python-build-standalone/latest-release/latest-release.json'
        with request.urlopen(url) as res:
            return cls(**json.load(res))
    
    @classmethod
    def from_pinned_release(cls) -> Self:
        # This is an arbitrary choice
        return cls(
            version=1,
            tag='20250808',
            release_url='https://github.com/astral-sh/python-build-standalone/releases/tag/20250808',
            asset_url_prefix='https://github.com/astral-sh/python-build-standalone/releases/download/20250808'
        )
    
    def file_url(self, dist: Distribution) -> str:
        filename = str(dist)
        return f'{self.asset_url_prefix}/{filename}'


def zip_directory_contents(source_dir: str, output_zip_path: str):
    logger.info(f'Zipping {source_dir}')
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Preserve relative path inside the zip
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

def compress_directory_contents(source_dir: Path, output_path: Path):
    logger.info(f'Compressing {source_dir}')
    with tarfile.open(output_path, 'w:xz') as tar:
        for x in source_dir.iterdir():
            tar.add(x, arcname=x.name)


def pip_install(python_path: Path, dist_path: Path):
    system = platform.system().lower()

    if 'windows' in system:
        python_exe = python_path / 'python.exe'
    else:
        python_exe = python_path / 'bin' / 'python'
    
    python_exe.chmod(0o755)
    pip_cmd = [
        'uv', 'pip',
        'install',
        '--python', f'{python_exe.as_posix()}',
        '--force-reinstall',
        f'--find-links={dist_path.absolute()}',
        '--torch-backend', 'cpu',
        'cfsai'
    ]
    logger.info(f'Executing => {" ".join(pip_cmd)}')
    result = subprocess.run(
        pip_cmd,
        capture_output=True
    )
    logger.debug(f'return code => {result.returncode}')
    logger.debug(f'stdout => {result.stdout.decode("utf-8")}')
    logger.warning(f'stderr => {result.stderr.decode("utf-8")}')

    if result.returncode != 0:
        logger.error('pip failed')
        exit(-1)

def bootstrap(repo_root: Path, workspace: Path):
    cli_bootstraper = repo_root / 'cli'
    
    build_name = 'cfsai.exe' if 'windows' in platform.system().lower() else 'cfsai'
    if 'linux' in platform.system().lower():
        build_path = cli_bootstraper / 'target' / 'x86_64-unknown-linux-musl' / 'release' / build_name
    else:
        build_path = cli_bootstraper / 'target' / 'release' / build_name
    if not build_path.exists():
        logger.error(f'Could not find binary "{build_path.as_posix()}"')
        exit(-1)
    
    bin_path = workspace / 'bin'
    bin_path.mkdir(exist_ok=True)

    shutil.move(build_path, bin_path / build_name)

def ui_json(repo_root: Path, workspace: Path):
    shutil.copy(repo_root / 'ui' / 'ui.json' , workspace / 'ui.json')

def extract_zip(src: Path, dest: Path):
    try:
        logger.info(f'Executing => extract {src}')
        with zipfile.ZipFile(src, 'r') as zip_ref:
            zip_ref.extractall(dest)
    except FileNotFoundError:
        logger.error(f'ZIP file not found: {src.as_posix()}')
        exit(-1)
    except zipfile.BadZipFile:
        logger.error(f'Bad ZIP file: {src.as_posix()}')
        exit(-1)
    except Exception as e:
        logger.error(f'extracting ZIP file: {e}')
        exit(-1)

def tflm_src_cortex(repo_root: Path, workspace: Path):
    # Copy the TFLM source and libs (zipped)
    tflm_src  = repo_root / 'platforms' / 'cortex-m' / 'lib' / 'tflite-micro' / 'tflm.zip'
    tflm_dest = workspace / 'lib' / 'cortex-m'
    tflm_dest.mkdir(parents=True, exist_ok=True)

    extract_zip(tflm_src, tflm_dest)

def tflm_src_sfx(repo_root: Path, workspace: Path):
    # Copy the TFLM sources (zipped), the Makefiles
    tflm_src  = repo_root / 'platforms' / 'sharc-fx' / 'lib' / 'tflite-micro'
    tflm_dest = workspace / 'lib' / 'sharc-fx' / 'tflite-micro'
    tflm_dest.mkdir(parents=True, exist_ok=True)

    extract_zip(tflm_src / 'tflm_src.zip', tflm_dest)

    try:
        shutil.copy(tflm_src / 'Makefile' , tflm_dest / 'Makefile')
        shutil.copy(tflm_src / 'project.mk' , tflm_dest / 'project.mk')
    except FileNotFoundError as e:
        logger.error(f'File not found during copy: {e}')
        exit(-1)
    except shutil.Error as e:
        logger.error(f'Error copying files: {e}')
        exit(-1)
    except Exception as e:
        logger.error(f'Unexpected error during file copy: {e}')
        exit(-1)

def examples(repo_root: Path, workspace: Path):
    dest = workspace / 'examples'
    src = repo_root / 'examples'
    shutil.copytree(src, dest)

def strip(dist_path: Path):
    system = platform.system().lower()
    if 'linux' in system or 'darwin' in system:
        strip_cmd = f"strip --strip-unneeded $(find {dist_path} -type f -executable)"
    
        logger.info(f'Executing => {strip_cmd}')
        result = subprocess.run(
            strip_cmd,
            shell=True,
            capture_output=True,
            text=True
        )
        logger.info('Execution completed')
        # Don't check the results of the strip, because it'll complain about
        # skipping files that aren't in an executable format.
    elif 'windows' in system:
        # Use llvm-strip on Windows for .exe and .dll files
        # Note: Assumes llvm-strip is in PATH
        if shutil.which('llvm-strip'):
            exe_files = list(dist_path.rglob("*.exe")) \
                + list(dist_path.rglob("*.dll")) \
                + list(dist_path.rglob("*.lib")) \
                + list(dist_path.rglob("*.pyd"))

            if not exe_files:
                logger.info("No executables found to strip on Windows.")
                return
            
            logger.info(f"Stripping {len(exe_files)} files")
            batch_size = 50
            # Batch files to avoid command line length issues
            for i in range(0, len(exe_files), batch_size):
                batch = exe_files[i:i + batch_size]
                strip_cmd = ["llvm-strip"] + [str(f) for f in batch]
                result = subprocess.run(strip_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"Error stripping batch {i//batch_size + 1}: {result.stderr}")
                else:
                    logger.info(f"Batch {i//batch_size + 1} stripped successfully")
        else:
            logger.info('Could not find `llvm-strip`')
            return

def remove_pyc(dist_path: Path):
    for f in dist_path.rglob('*.pyc'):
        f.unlink()

def remove_static_libs(dist_path: Path):
    if 'windows' in platform.system().lower():
        for f in dist_path.rglob('*.lib'):
            f.unlink()
        

def package(pyver: str) -> Path:
    release_data = ReleaseDataV1.from_pinned_release()
    dist = Distribution.from_pyver_and_tag(pyver, release_data.tag)

    repo_root_path = Path(__file__).parent.parent
    dist_path = repo_root_path / 'dist'
    if not dist_path.exists():
        print(f'Could not find {dist_path}. Please build the packages')
        exit(-1)
    
    fileurl = release_data.file_url(dist) 
    python_targz_path = dist_path / str(dist)
    logger.debug(f'Retrieving {fileurl}')
    request.urlretrieve(fileurl, python_targz_path)

    if not python_targz_path.exists():
        logger.error(f'Could not find python dist {python_targz_path}')
        exit(-1)
    
    workspace_path = dist_path / 'workspace'
    workspace_path.mkdir()
    python_path = workspace_path / 'python'
    with tarfile.open(python_targz_path, 'r:gz') as tar:
        tar.extractall(path=workspace_path)
    if not python_path.exists():
        logger.error(f'Could not find {python_path} after extracting {python_targz_path}')
        exit(-1)

    pip_install(python_path, dist_path)
    bootstrap(repo_root_path, workspace_path)
    ui_json(repo_root_path, workspace_path)
    tflm_src_sfx(repo_root_path, workspace_path)
    tflm_src_cortex(repo_root_path, workspace_path)
    examples(repo_root_path, workspace_path)
    strip(workspace_path)
    remove_pyc(dist_path)
    remove_static_libs(dist_path)

    # Kind of a hack
    dist.prepend = 'cfsai'
    dist.ext = 'tar.xz'
    compress_directory_contents(
        workspace_path,
        dist_path / dist.github_name()
    )
    return dist_path / dist.github_name()
    
def main():
    if len(sys.argv) != 2:
        logger.error(f'Invalid format, please call the script and pass the python version as an argument')
        exit(-1)

    package(sys.argv[1])

if __name__ == '__main__':
    main()

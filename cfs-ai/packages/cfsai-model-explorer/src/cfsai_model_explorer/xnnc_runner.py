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

"""
XNNC explore runner.

Runs ``mot neuroweave explore`` inside a Docker/Podman container that ships
the XNNC toolchain.  The Docker image is passed by the registry
(resolved from ``mot.json``), with ``XNNC_DOCKER_IMAGE`` env var
as a fallback for testing.
"""

from __future__ import annotations

import logging
import os
import platform
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from cfsai_model_explorer.exceptions import XnncNotFoundError, XnncRunError

logger = logging.getLogger(__name__)

EXPLORE_TIMEOUT_SECONDS = 300
DEFAULT_DSP_FREQ = 700
DEFAULT_NNE_FREQ = 1250


class XnncRunner:
    """
    Run XNNC explore inside a Docker/Podman container.

    Parameters
    ----------
    docker_image : str, optional
        Full image reference.  Resolved automatically from ``mot.json``
        in the CFS install tree when omitted.
    soc : str, optional
        SoC identifier passed to the container (e.g. ``ad71270``).
    subsystem : str, optional
        Subsystem identifier passed to the container (e.g. ``NSS``).
    container_cmd : ``"docker"`` | ``"podman"``, optional
        Container runtime. Auto-detected if omitted.
    """

    def __init__(
        self,
        docker_image: str | None = None,
        soc: str | None = None,
        subsystem: str | None = None,
        container_cmd: str | None = None,
        **_kwargs: object,
    ) -> None:
        """Initialize the runner and verify Docker image is available."""
        self._soc = soc or ""
        self._subsystem = subsystem or ""
        self._docker_image = _resolve_docker_image(docker_image)
        self._container_cmd = container_cmd or _find_container_cmd()

        if not _image_exists(self._container_cmd, self._docker_image):
            raise XnncNotFoundError(
                f"Docker image not found: {self._docker_image}. "
                f"Pull it first with: {self._container_cmd} pull {self._docker_image}",
                error_code="IMAGE_NOT_FOUND",
            )

    def run_explore(
        self,
        model_path: str | Path,
        dsp_freq: int = DEFAULT_DSP_FREQ,
        nne_freq: int = DEFAULT_NNE_FREQ,
    ) -> str:
        """Run XNNC explore and return the report text."""
        model_path = Path(model_path).resolve()
        if not model_path.exists():
            raise XnncRunError(
                f"Model file not found: {model_path}",
                error_code="MODEL_NOT_FOUND",
            )

        name = model_path.stem
        _validate_name(name)
        host_tmp = tempfile.mkdtemp(
            prefix="xnnc-explore-",
            dir=_docker_accessible_tmpdir(),
        )

        try:
            self._setup_host_dir(host_tmp, model_path)
            self._run_container(host_tmp, name)
            report_file = os.path.join(host_tmp, f"{name}_report.txt")
            if not os.path.exists(report_file):
                raise XnncRunError(
                    f"Explore report not found at {report_file}",
                    error_code="REPORT_MISSING",
                )
            with open(report_file) as f:
                return f.read()
        finally:
            shutil.rmtree(host_tmp, ignore_errors=True)

    def _setup_host_dir(
        self,
        host_tmp: str,
        model_path: Path,
    ) -> None:
        shutil.copy2(model_path, os.path.join(host_tmp, model_path.name))

    def _run_container(self, host_tmp: str, name: str) -> None:
        model_filename = f"{name}.tflite"

        cmd: list[str] = [self._container_cmd, "run", "--rm"]

        if platform.system() != "Windows":
            try:
                uid, gid = os.getuid(), os.getgid()
                if self._container_cmd == "podman":
                    cmd.append("--userns=keep-id")
                cmd.extend(["-u", f"{uid}:{gid}"])
            except AttributeError:
                pass

        cmd.extend([
            "-e", "HOME=/tmp/work",
            "-e", "NUMBA_CACHE_DIR=/tmp/numba_cache",
            "-e", "MPLCONFIGDIR=/tmp/mpl_cache",
            "-v", f"{host_tmp}:/host_data",
            self._docker_image,
            "neuroweave", "explore",
            "--soc", self._soc,
            "--subsystem", self._subsystem,
            f"/host_data/{model_filename}",
            "-o", "/host_data",
        ])

        logger.info("Running XNNC explore: %s %s",
                     self._container_cmd, self._docker_image)

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=EXPLORE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as e:
            raise XnncRunError(
                f"XNNC explore timed out after {EXPLORE_TIMEOUT_SECONDS}s",
                error_code="XNNC_TIMEOUT",
            ) from e
        except FileNotFoundError as e:
            raise XnncRunError(
                f"Container runtime not found: {self._container_cmd}",
                error_code="CONTAINER_NOT_FOUND",
            ) from e

        if result.returncode != 0:
            raise XnncRunError(
                f"XNNC explore failed (exit {result.returncode}):\n"
                f"{result.stdout}\n{result.stderr}",
                error_code="XNNC_NONZERO_EXIT",
                details={"returncode": result.returncode},
            )


# ----------------------------------------------------------------------
# Image resolution
# ----------------------------------------------------------------------

def _resolve_docker_image(explicit: str | None) -> str:
    """Resolve the Docker image reference.

    1. Explicit argument (passed from the registry via mot.json lookup)
    2. XNNC_DOCKER_IMAGE env var (fallback for testing / CI)
    """
    if explicit:
        return explicit

    env_image = os.environ.get("XNNC_DOCKER_IMAGE")
    if env_image:
        return env_image

    raise XnncNotFoundError(
        "No Docker image specified. Set XNNC_DOCKER_IMAGE env or "
        "ensure backends/mot.json is present in the CFS install.",
        error_code="DOCKER_IMAGE_MISSING",
    )


# ----------------------------------------------------------------------
# Container helpers
# ----------------------------------------------------------------------

_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9_.\-]+$")


def _validate_name(name: str) -> None:
    """Reject model names with characters unsafe for file paths."""
    if not _SAFE_NAME_RE.fullmatch(name):
        raise XnncRunError(
            f"Unsafe model name: {name!r}. "
            "Only alphanumeric, underscore, hyphen, and dot are allowed.",
            error_code="UNSAFE_MODEL_NAME",
        )


def _find_container_cmd() -> str:
    for cmd in ("docker", "podman"):
        if shutil.which(cmd):
            return cmd
    raise XnncNotFoundError(
        "No container runtime found. Install Docker or Podman.",
        error_code="CONTAINER_NOT_FOUND",
    )


def _image_exists(container_cmd: str, image: str) -> bool:
    try:
        subprocess.run(
            [container_cmd, "image", "inspect", image],
            capture_output=True,
            timeout=5,
            check=True,
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
            FileNotFoundError):
        return False


def _docker_accessible_tmpdir() -> str | None:
    """
    On WSL, /tmp is invisible to Docker Desktop. Use /mnt/c/temp instead.
    On native Linux or Mac, return None to use the system default.
    """
    if _is_wsl():
        d = "/mnt/c/temp"
        os.makedirs(d, exist_ok=True)
        return d
    return None


def _is_wsl() -> bool:
    try:
        with open("/proc/version") as f:
            return "microsoft" in f.read().lower()
    except OSError:
        return False

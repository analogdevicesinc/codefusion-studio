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


from importlib.metadata import version
from pathlib import Path

__version__: str

try:
    __version__ = version(__package__)
except Exception:
    __version__ = '0.0.0+local'

# ruff: noqa: E402
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env.development")

from cfsai.backend_manager import BackendManager
from cfsai.support import support, validate
from cfsai_types.backend_api import Backend, BackendApi

# Re-export types for simplicity
from cfsai_types.config.cfsconfig import CfsConfig, ModelConfig
from cfsai_types.config.verified import VerifiedConfig

__all__ = [
    'Backend',
    'BackendApi',
    'BackendManager',
    'CfsConfig',
    'ModelConfig',
    'VerifiedConfig',
    'support',
    'validate',
]

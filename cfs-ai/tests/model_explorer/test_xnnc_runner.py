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

"""Tests for the XNNC runner."""

import pytest

from cfsai_model_explorer.xnnc_runner import (
    _validate_name,
    _is_wsl,
)
from cfsai_model_explorer.exceptions import XnncRunError


class TestValidateName:
    """Test model name shell-safety validation."""

    def test_simple_name(self):
        _validate_name("mnist_int8")  # should not raise

    def test_name_with_dots(self):
        _validate_name("model.v2")  # should not raise

    def test_name_with_hyphens(self):
        _validate_name("kws-ref-model")  # should not raise

    def test_semicolon_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("model;rm -rf /")

    def test_space_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("my model")

    def test_backtick_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("model`whoami`")

    def test_dollar_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("model$HOME")

    def test_newline_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("safe\nmalicious")

    def test_empty_rejected(self):
        with pytest.raises(XnncRunError, match="Unsafe model name"):
            _validate_name("")


class TestIsWsl:
    """Test WSL detection."""

    def test_returns_bool(self):
        result = _is_wsl()
        assert isinstance(result, bool)

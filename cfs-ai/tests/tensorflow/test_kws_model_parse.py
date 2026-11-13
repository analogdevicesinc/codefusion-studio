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

"""Regression test for DeprecatedBuiltinCode fallback (CFSIO-26927).

The KWS DS-CNN model contains operators whose BuiltinCode accessor
returns 0 while the real opcode lives in DeprecatedBuiltinCode.
Without the fallback the parser maps them to ADD (opcode 0), producing
wrong layer names and incorrect MAC totals.
"""

from pathlib import Path

import pytest

from cfsai_model_parser.parse_tflm import TFLiteParser

CFS_AI_ROOT = Path(__file__).parent.parent.parent
MODELS_DIR = CFS_AI_ROOT / 'tests' / 'data' / 'models'

KWS_MODEL = 'kws_ref_model.tflite'

# Ops expected in the KWS DS-CNN model
EXPECTED_OPS = {'CONV_2D', 'DEPTHWISE_CONV_2D', 'FULLY_CONNECTED',
                'SOFTMAX', 'RESHAPE', 'AVERAGE_POOL_2D'}


class TestKwsModelParse:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.parser = TFLiteParser()
        self.model_path = MODELS_DIR / KWS_MODEL
        if not self.model_path.exists():
            pytest.skip(f'Model not found: {KWS_MODEL}')

    def test_no_false_add_ops(self):
        """ADD should not appear — it is the opcode-0 sentinel, not a real op in this model."""
        result = self.parser.parse_model(str(self.model_path))
        layer_names = [layer.name for layer in result.layer_details]
        assert 'ADD' not in layer_names, (
            f'ADD found in layer names — DeprecatedBuiltinCode fallback may be broken: {layer_names}')

    def test_expected_ops_present(self):
        """The parser must recover the real operator names via DeprecatedBuiltinCode."""
        result = self.parser.parse_model(str(self.model_path))
        layer_names = {layer.name for layer in result.layer_details}
        missing = EXPECTED_OPS - layer_names
        assert not missing, f'Expected ops missing from parse result: {missing}'

    def test_fc_layer_has_nonzero_macs(self):
        """FULLY_CONNECTED MACs must be positive — a misidentified ADD would yield 0."""
        result = self.parser.parse_model(str(self.model_path))
        fc_layers = [l for l in result.layer_details if l.name == 'FULLY_CONNECTED']
        assert fc_layers, 'No FULLY_CONNECTED layer found'
        for layer in fc_layers:
            assert layer.macs > 0, (
                f'FULLY_CONNECTED layer {layer.index} has 0 MACs')

    def test_total_macs_sanity(self):
        """Total MACs for the KWS model should be in a reasonable range."""
        result = self.parser.parse_model(str(self.model_path))
        assert result.total_macs > 0
        print(f'\nKWS DS-CNN: {result.total_macs:,} MACs, '
              f'{len(result.layer_details)} layers')

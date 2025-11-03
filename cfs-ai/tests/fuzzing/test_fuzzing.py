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


from hypothesis import given, settings, HealthCheck
import pytest

from cfsai_types.config.cfsconfig import CfsConfig
from cfsai.support import validate
from strats import core_cfs_strat

@pytest.mark.fuzzing
@settings(max_examples=10, suppress_health_check=[HealthCheck.too_slow])
@given(core_cfs_strat())
def test_fuzz_valid_cfsconfig(config: CfsConfig):
    try:
        _ = validate(config)
    except Exception as e:
        # Display the config in the test output
        pytest.fail(f"Test failed with config: {config}. Error: {e}")
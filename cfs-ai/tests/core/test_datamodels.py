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


from pathlib import Path
from cfsai_types.datamodel_manager import CfsDatamodelManager

DEV_DATAMODELS_INDEX = Path(__file__).parent.parents[2].joinpath(
    "packages",
    "cfs-data-models",
    "socs"
)

def test_datamodel_sync():

    mgr = CfsDatamodelManager(custom_search_paths=[DEV_DATAMODELS_INDEX])

    for d in mgr.iter_datamodels():
        pass
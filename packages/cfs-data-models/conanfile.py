'''

  Copyright (c) 2025 Analog Devices, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

'''

import os
import json
from collections import defaultdict
from pathlib import Path
from conan import ConanFile
from conan.tools import files

class BasicConanfile(ConanFile):
    name = "cfs_base_data_models"
    description = "CFS data models for MAX32XXX and MAX78XXX processors"
    license = "Apache-2.0"
    package_id_unknown_mode = "unrelated_mode"
    exports = "package.json"
    exports_sources = (
      "build-scripts/generate-data-model-index.js",
      "socs/*.json",
      "!socs/datamodel-schema.json"
    )
    cfs_version = "^2.0"
    cfs_soc = (
        "MAX32650", "MAX32655", "MAX32657", "MAX32658",
        "MAX32670", "MAX32690",
        "MAX78000", "MAX78002"
    )
    cfs_pkg_type = "data-model"

    def set_version(self):
        if not self.version:
            recipe_folder = Path(self.recipe_folder)
            with open(recipe_folder / 'package.json') as pkg_json:
                self.version = json.load(pkg_json)['version']
            run_num = os.getenv('GITHUB_RUN_NUMBER')
            if run_num:
                self.version += '+' + run_num

    def build(self):
        self.run("node build-scripts/generate-data-model-index.js")

    def package(self):
        files.copy(self, "*.json", self.source_folder + "/socs", self.package_folder)
        files.copy(self, ".cfsdatamodels", self.source_folder + "/socs", self.package_folder)

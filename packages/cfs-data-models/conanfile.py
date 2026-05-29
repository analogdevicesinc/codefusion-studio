'''

  Copyright (c) 2025-2026 Analog Devices, Inc.

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
      "LICENSE",
      "socs/*.json",
      "!socs/datamodel-schema.json"
    )
    cfs_version = "^2.0"
    cfs_pkg_type = "data-model"

    def init(self):
        index_path = Path(self.recipe_folder)/".cfsdatamodels"
        if index_path.exists():
            index_data = json.loads(index_path.read_text(encoding='utf-8'))
            self.cfs_soc = []
            self.cfs_components = []
            for soc, packages in index_data.items():
                self.cfs_soc.append(soc)
                for package, package_data in packages.items():
                    self.cfs_components.append({
                        'name': f"{soc}:{package}".lower(),
                        'version': package_data['version'],
                        'type': 'data-model',
                    })


    def export(self):
        # Since we were creating a .cfsdatamodels file anyway (previously on build), leverage it
        # on export so it can be used to compute and store cfs_soc and cfs_components
        self.run("node build-scripts/generate-data-model-index.js", cwd=self.recipe_folder)
        files.copy(self, ".cfsdatamodels", self.recipe_folder + "/socs", self.export_folder)

    def set_version(self):
        if not self.version:
            recipe_folder = Path(self.recipe_folder)
            with open(recipe_folder / 'package.json') as pkg_json:
                self.version = json.load(pkg_json)['version']
            run_num = os.getenv('GITHUB_RUN_NUMBER')
            if run_num:
                self.version += '+' + run_num

    def package(self):
        files.copy(self, "LICENSE", self.source_folder, self.package_folder)
        files.copy(self, "*.json", self.source_folder + "/socs", self.package_folder)
        files.copy(self, ".cfsdatamodels", self.recipe_folder, self.package_folder)

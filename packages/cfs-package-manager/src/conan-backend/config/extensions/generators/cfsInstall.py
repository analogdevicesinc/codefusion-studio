"""

Copyright (c) 2024 Analog Devices, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

import json
from conan.tools import files


def _parse_dep(dep):

    def ensureList(x):
        return x if isinstance(x, (list, tuple)) else [x] if x is not None else []

    conanfile = dep._conanfile
    info = {
        "full_ref": dep.ref.repr_notime(),
        "path": dep.package_folder,
        "requires": [x.ref.name for x in dep.dependencies.values()],
        "description": dep.description,
        "license": dep.license,
        "cfsVersion": getattr(conanfile, "cfs_version", ""),
    }

    if hasattr(conanfile, "cfs_soc"):
        info["soc"] = ensureList(conanfile.cfs_soc)

    if hasattr(conanfile, "cfs_pkg_type"):
        info["type"] = conanfile.cfs_pkg_type

    return info


class CfsInstall:
    def __init__(self, conanfile):
        self._conanfile = conanfile
        self.output = conanfile.output

    def generate(self):
        installed_packages = {
            f"{dep.ref.name}": _parse_dep(dep)
            for _, dep in self._conanfile.dependencies.items()
        }
        files.save(
            self._conanfile, ".cfsPackages", json.dumps(installed_packages, indent=2)
        )

import os, json
from conan import ConanFile
from conan.tools import files


class BasicConanfile(ConanFile):
    name = "test_pkg_with_license2"
    description = "Test package with GNU GPL 2.0 license"
    license = "GPL-2.0"
    package_type = "unknown"
    package_id_unknown_mode = "unrelated_mode"
    cfs_pkg_type = "sdk"

    exports = "tool.json", "LICENSE"
    exports_sources = "tool.json", "LICENSE"

    cfs_version = "^2.0"

    def set_version(self):
        # If version is already set (from --version flag), use it as is
        if not self.version:
            # Otherwise read from tool.json
            with open(self.recipe_folder + "/tool.json") as tool_json:
                self.version = json.load(tool_json)["version"]

    def package(self):
        files.copy(self, "LICENSE", self.source_folder, self.package_folder)

        # Update tool.json with the version in package folder
        tool_json_path = os.path.join(self.source_folder, 'tool.json')
        with open(tool_json_path, 'r', encoding='utf-8') as tool_json:
            version_data = json.load(tool_json)

        # Strip '+' and anything following it from the version
        base_version = self.version.split('+')[0]
        version_data['version'] = base_version

        # Write updated tool.json to package folder
        package_tool_json_path = os.path.join(self.package_folder, 'tool.json')
        with open(package_tool_json_path, 'w', encoding='utf-8') as tool_json_write:
            json.dump(version_data, tool_json_write, indent=4)

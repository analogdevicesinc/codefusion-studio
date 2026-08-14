from conan import ConanFile
from conan import tools


class BasicConanfile(ConanFile):
    name = "test_pkg_prerelease_consumer"
    version = "1.0"
    description = "Consumer package that requires prerelease dependency via version range"
    license = "<Your project license goes here>"
    homepage = "<Your project homepage goes here>"
    exports_sources = ".cfsplugin", "index.js"
    extension_properties = {"my_extension_property": False}
    requires = "test_pkg_prerelease1/[^1.2.0-b.1, include_prerelease]"

    def package(self):
        tools.files.copy(self, ".cfsplugin", self.source_folder, self.package_folder)
        tools.files.copy(self, "index.js", self.source_folder, self.package_folder)

    def package_info(self):
        self.cpp_info.components["plugin"].srcdirs = ["."]

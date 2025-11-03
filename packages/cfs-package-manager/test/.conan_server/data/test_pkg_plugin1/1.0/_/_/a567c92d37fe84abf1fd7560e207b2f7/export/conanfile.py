from conan import ConanFile, tools


class BasicConanfile(ConanFile):
    name = "test_pkg_plugin1"
    version = "1.0"
    description = "A test package setting pkg type to plugin"
    license = "The license of the plugin"
    exports_sources = ".cfsplugin", "index.js"
    cfs_version = "1.1.0"
    cfs_soc = "plugin1Soc"
    cfs_pkg_type = "plugin"

    # The actual creation of the package, once it's built, is done in the package() method.
    # Using the copy() method from tools.files, artifacts are copied
    # from the build folder to the package folder
    def package(self):
        tools.files.copy(self, ".cfsplugin", self.source_folder, self.package_folder)
        tools.files.copy(self, "index.js", self.source_folder, self.package_folder)

    def package_info(self):
        self.cpp_info.components["plugin"].srcdirs = ["."]

from conan import ConanFile, tools


class BasicConanfile(ConanFile):
    name = "private_pkg"
    version = "1.0"
    description = "A test package which requires authentication"
    license = "The license of the plugin"
    exports_sources = ".cfsplugin", "index.js"
    cfs_version = "2.0.0"

    # The actual creation of the package, once it's built, is done in the package() method.
    # Using the copy() method from tools.files, artifacts are copied
    # from the build folder to the package folder
    def package(self):
        tools.files.copy(self, ".cfsplugin", self.source_folder, self.package_folder)
        tools.files.copy(self, "index.js", self.source_folder, self.package_folder)

    def package_info(self):
        self.cpp_info.components["plugin"].srcdirs = ["."]

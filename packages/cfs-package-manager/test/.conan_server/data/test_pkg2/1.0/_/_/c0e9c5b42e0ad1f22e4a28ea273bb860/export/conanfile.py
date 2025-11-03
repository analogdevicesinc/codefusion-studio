from conan import ConanFile, tools


class BasicConanfile(ConanFile):
    name = "test_pkg2"
    version = "1.0"
    description = "A basic recipe"
    license = "<Your project license goes here>"
    homepage = "<Your project homepage goes here>"
    exports_sources = ".cfsplugin", "index.js"
    extension_properties = {"my_extension_property": False}

    # The actual creation of the package, once it's built, is done in the package() method.
    # Using the copy() method from tools.files, artifacts are copied
    # from the build folder to the package folder
    def package(self):
        tools.files.copy(self, ".cfsplugin", self.source_folder, self.package_folder)
        tools.files.copy(self, "index.js", self.source_folder, self.package_folder)

    def package_info(self):
        self.cpp_info.components["plugin"].srcdirs = ["."]

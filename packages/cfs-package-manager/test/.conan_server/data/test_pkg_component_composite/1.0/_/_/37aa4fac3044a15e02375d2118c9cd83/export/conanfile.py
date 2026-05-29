from conan import ConanFile, tools


class BasicConanfile(ConanFile):
    name = "test_pkg_component_composite"
    version = "1.0"
    description = "A test package that includes multiple components"
    license = "The license of the package"
    exports_sources = ".cfsplugin", "index.js"
    cfs_version = "1.1.0"
    cfs_soc = "plugin1Soc", "plugin2Soc1", "plugin2Soc2"
    cfs_components = [
        {
            "name": "plugin1",
            "version": "2.1.0",
            "type": "plugin",
        },
        {
            "name": "plugin2",
            "version": "2.1.0",
            "type": "plugin",
        },
        {
            "name": "datamodels",
            "version": "2.0.0",
            "type": "data-model",
        },
    ]

    # The actual creation of the package, once it's built, is done in the package() method.
    # Using the copy() method from tools.files, artifacts are copied
    # from the build folder to the package folder
    def package(self):
        tools.files.copy(self, ".cfsplugin", self.source_folder, self.package_folder)
        tools.files.copy(self, "index.js", self.source_folder, self.package_folder)

    def package_info(self):
        self.cpp_info.components["plugin"].srcdirs = ["."]

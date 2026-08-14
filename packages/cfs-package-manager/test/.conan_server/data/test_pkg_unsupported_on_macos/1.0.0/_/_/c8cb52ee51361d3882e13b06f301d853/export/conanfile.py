from conan import ConanFile
from conan.errors import ConanInvalidConfiguration
from conan.tools.files import save


class PlatformSelectivePkgConan(ConanFile):
    name = "test_pkg_unsupported_on_macos"
    version = "1.0.0"
    package_type = "application"

    settings = "os", "arch", "compiler", "build_type"

    def validate(self):
        os_name = str(self.settings.os)
        unsupported = "Macos"
        if os_name == unsupported:
            raise ConanInvalidConfiguration(
                f"{self.name}/{self.version} does not support {unsupported}"
            )

    def package(self):
        save(self, self.package_folder + "/README.txt", f"Test package {self.name}: unsupported on { 'Macos' }.\\n")

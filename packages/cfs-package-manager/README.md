# cfs-package-manager

## Running tests

### Installer dependencies

Currently package manager has a dependency on conan, which is a python package.
This is typically provided by the installer, where package manager also lives,
but for development purposes (such as running tests) it is necessary to manually
provide the path to the installer via CFS_INSTALL_DIR environment variable.

Additionally test can be run on any python environment with conan installed,
however it is recommended to use the installer provided python interpreter to ensure
both python and conan versions are aligned.

### Conan test server

In order to test functionality, test code needs a server test to pull packages from.
For that purpose test folder contains the configuration and packages for a
[conan server](https://docs.conan.io/2/reference/conan_server.html#reference-conan-server)

As a result, it is required to install and run `conan-server` (yet another python package)
before runing the tests through yarn. You can find more info on
[conan-server documentation](https://docs.conan.io/2/tutorial/conan_repositories/setting_up_conan_remotes/conan_server.html)

### TL;DR

1. Create and activate a python [virtual environment](https://docs.python.org/3/library/venv.html).
Note that this does not require to use the same python environment that the test will do, since
   it will only be used as a local conan server:
   - bash:

     ```bash/zsh
     python -m venv .venv
     source .venv/bin/activate
     ```

   - Command Prompt:

     ```cmd
     python -m venv .venv
     .venv/bin/activate.bat
     ```

   - PowerShell:

     ```powershell
     python -m venv .venv
     .venv/bin/activate.ps1
     ```

2. Install and run conan server:

   ```shell
   pip install conan-server
   conan_server -d <path to packages/cfs-package-manager/test/.conan_server>
   ```

3. On a separate terminal, setup environment variables
   - Bash:

     ```bash
     export CFS_INSTALL_DIR="<CFS 2.0.0 installer path>"
     ```

   - Command Prompt:

     ```cmd
     set CFS_INSTALL_DIR=<CFS 2.0.0 installer path>
     ```

   - PowerShell:

     ```powershell
     $env:CFS_INSTALL_DIR = "<CFS 2.0.0 installer path>"
     ```

4. Run the tests

```bash
 yarn ws:pkg-mgr test
```

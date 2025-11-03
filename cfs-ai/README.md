## Setup
This project is using [uv](https://docs.astral.sh/uv/) to manage its python environment. As such to get started you should install `uv` for you development environment. To setup the environment with the correct python version, runtime dependencies and development dependencies you should run the following commands in the repository root.

```bash
uv python install # Will install the correct python version from the .python-version file
uv sync --locked --all-extras --dev # Installs the dependencies
```

And that is it, your environment should be good to go !

## Project Structure
The application is structured as a [uv workspace](https://docs.astral.sh/uv/concepts/projects/workspaces/) with several interdependent packages. The main application and CLI is located in the [src/cfsai](./src/cfsai/) directory and other dependent packages can be found in the [packages](./packages/) and the [platforms](./platforms/) directories.

## Usage
There are two methods to invoke the CLI,
- Invoking the module itself
- Building the package and running the executable
Both methods are shown below

```bash
# Firstly in both cases the virtual environment should be activated or prepend your
# command with `uv run` which activates the environment and executes the following
# command

# Linux/MacOS
source .venv/bin/activate
# Windows
.\.venv\Scripts\activate.bat

# Invoking the module
python -m cfsai --help
# - OR -
cfsai --help

# Building the released package
uv build --all-packages
cargo build --release --manifest-path cli/Cargo.toml
uv run python scripts/package.py 3.13

# Invoking the built release
cfsai --help
```


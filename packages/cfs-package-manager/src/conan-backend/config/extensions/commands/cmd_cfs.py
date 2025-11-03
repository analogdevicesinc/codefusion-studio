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
from pathlib import Path
import fnmatch
from collections.abc import MutableMapping, Sequence
import re

from conan.api.conan_api import ConanAPI
from conan.api.output import cli_out_write
from conan.cli.command import conan_command, conan_subcommand
from conan import conan_version

if conan_version < "2.17":
    from conans.util.runners import conan_run, check_output_runner
else:
    from conan.internal.util.runners import conan_run, check_output_runner
from conan.errors import ConanException
from conan.api.model import RecipeReference
from conan.internal.conan_app import ConanApp


class PackagesJson(MutableMapping):
    """
    A class to read .cfsPackages content.

    Aside from exposing the content of the json as a dictionary, it also provides helper methods
    that return other derived information
    """

    def __init__(self):
        self._packages_json = Path(".cfsPackages")
        self.store = (
            json.loads(self._packages_json.read_text()) if self._packages_json.exists() else {}
        )

    def __getitem__(self, key):
        return self.store[self._keytransform(key)]

    def __setitem__(self, key, value):
        self.store[self._keytransform(key)] = value

    def __delitem__(self, key):
        del self.store[self._keytransform(key)]

    def __iter__(self):
        return iter(self.store)

    def __len__(self):
        return len(self.store)

    def _keytransform(self, key):
        return key

    def get_consumers(self, pkg_name):
        return {
            x["full_ref"].split("#")[0] for x in self.store.values() if pkg_name in x["requires"]
        }

    def sync_file(self):
        self._packages_json.write_text(json.dumps(dict(self), indent=2))


def handle_and_raise_conan_exception(e):
    """
    Processes and raises a ConanException with a user-friendly error message based on the provided exception.

    This function analyzes the exception message from Conan commands, formats it for readability,
    and raises a more descriptive ConanException depending on the error type:
      - Detects authentication errors and raises a specific message listing affected remotes.
      - Detects unresolved package errors and raises a message listing missing packages.
      - For all other errors, raises a ConanException with the processed error message.

    Args:
        e (Exception): The original exception raised by Conan commands, expected to have a message in e.args[0].

    Raises:
        ConanException: With a formatted and user-friendly error message, specific to the detected error type.
    """
    # First, process line breaks from stdout
    error_msg = e.args[0].replace("\\n", "\n")

    # Trim out anything before "ERROR: " text, if possible
    error_pattern = re.compile(r".*ERROR: (.*)", re.DOTALL)
    error_match = error_pattern.findall(error_msg)
    if len(error_match) == 1:
        error_msg = error_match[0]

    # Check for authentication errors
    authentication_error_pattern = re.compile(
        r"Conan interactive mode disabled(?:\. \[Remote: (.+)\])?"
    )
    authentication_errors = authentication_error_pattern.findall(error_msg)
    if len(authentication_errors) > 0:
        exceptionMsg = ""
        for error in authentication_errors:
            if error == "" or error is None:
                continue
            exceptionMsg += f"Authentication error on remote '{error}'\n"
        if exceptionMsg == "":
            exceptionMsg = "Authentication error"
        raise ConanException(exceptionMsg)

    # Check for missing recipe errors
    missing_recipe_error_pattern = re.compile(r"Missing prebuilt package for '([^']+)'", re.DOTALL)
    missing_recipe_errors = missing_recipe_error_pattern.findall(error_msg.replace('\r', '').replace("\\'", "'").strip())
    if missing_recipe_errors:
        raise ConanException(
            f"The following packages are not available and cannot be installed: {', '.join(missing_recipe_errors)}"
        )

    # Check for packages not found
    unresolved_error_pattern = re.compile(r"Unable to find '(.*)' in remotes")
    unresolved_errors = unresolved_error_pattern.findall(error_msg)
    if unresolved_errors:
        raise ConanException(
            f"Couldn't find the following packages: {', '.join(unresolved_errors)}"
        )

    # Unexpected error, re-throw it
    raise ConanException(error_msg)


def parse_manifest_file(manifest_path_str: str):
    """
    Reads and parses a manifest file, performing validation checks.

    Args:
        manifest_path_str: String path to the manifest file

    Returns:
        The parsed manifest data

    Raises:
        ConanException: If the file doesn't exist, isn't readable, or has invalid content
    """
    # Check if file exists and is accessible
    manifest_path = Path(manifest_path_str)
    if not manifest_path.exists():
        raise ConanException(f"Manifest file not found: {manifest_path}")

    # Read and parse the manifest file
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        raise ConanException("Invalid JSON format in manifest file.")
    except Exception as e:
        raise ConanException(f"Error reading manifest file: {str(e)}")

    # Validate manifest structure
    if "version" not in manifest or "packages" not in manifest or not isinstance(manifest["packages"], list):
        raise ConanException("Invalid manifest format. Must contain 'version' and 'packages' fields.")

    return manifest


def get_required_packages_from_manifest(manifest_packages: Sequence[dict[str, str]]):
    """
    Determines which packages from the manifest need to be installed.

    Args:
        manifest_packages: List of package objects from the manifest with name and version

    Returns:
        A list of package objects (dict with name and version) that need to be installed
    """
    packages = PackagesJson()

    # Create a set of installed package references in the format "name/version"
    installed_packages = {x["full_ref"].split("#")[0] for x in packages.values()}

    # Filter out packages that are already installed
    packages_to_install = []
    for pkg in manifest_packages:
        pkg_name = pkg["name"]
        pkg_version = pkg["version"]
        pkg_ref = f"{pkg_name}/{pkg_version}"

        # Add to installation list if not already installed
        if pkg_ref not in installed_packages:
            packages_to_install.append({"name": pkg_name, "version": pkg_version})

    return packages_to_install


def install_packages(pkg_refs_to_install: Sequence[str], no_remote: bool = False):
    """
    Installs one or multiple packages at once.

    Args:
        pkg_refs_to_install: Sequence of package references in "name/version" format

    Returns:
        A list of package references that were newly installed
    """

    packages = PackagesJson()

    # Used to compute newly installed packages
    pkgs_before_install = {x["full_ref"].split("#")[0] for x in packages.values()}

    # Get all current package references
    current_pkg_refs = {k: v["full_ref"] for k, v in packages.items()}

    # Add all new packages to install
    for pkg_ref in pkg_refs_to_install:
        package_name, _ = pkg_ref.split("/", 1)
        # This will either add or overwrite package to install, which is a simple behavior.
        # If we want to handle updating existing packages through a different path in the future
        # this is the place to make that decision
        current_pkg_refs[package_name] = pkg_ref

    # Build the install command with all required packages
    requires = " ".join(f"--requires={ref}" for ref in current_pkg_refs.values())
    try:
        cmd = f"conan install {requires} -g CfsInstall --envs-generation=false --output-folder={Path()}"
        if no_remote:
            cmd += " --no-remote"
        check_output_runner(cmd)
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    # Determine which packages were newly installed
    pkgs_after_install = {x["full_ref"].split("#")[0] for x in PackagesJson().values()}
    installed_packages = pkgs_after_install - pkgs_before_install

    return list(installed_packages)


@conan_command(group="CFS")
def cfs(conan_api: ConanAPI, parser, *args):
    """
    Commands used by CFS package manager API
    """
    pass


@conan_subcommand()
def cfs_list(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns a list of all the installed packages
    """

    subparser.add_argument(
        "pattern",
        nargs="?",
        default="*",
        help="Optional pattern to be matched with package names",
    )

    subparser.add_argument(
        "-f",
        "--filter",
        action="append",
        default=[],
        help="Optional argument in the form KEY=VALUE used to filter "
        "returned packages only to the ones with matching metadata."
        "If this argument is used multiple times, all conditions must be satisfied",
    )

    args = parser.parse_args(*args)

    def filter_match(pkg):
        for filter in args.filter:
            k, v = filter.split("=")
            if k not in pkg:
                return False
            if isinstance(pkg[k], (list, tuple)):
                if v not in pkg[k]:
                    return False
            elif pkg[k] != v:
                return False
        return True

    packages = PackagesJson()

    pkg_references = (x["full_ref"].split("#")[0] for x in packages.values() if filter_match(x))
    package_list = fnmatch.filter(pkg_references, args.pattern)

    if package_list:
        cli_out_write("\n".join(package_list))


@conan_subcommand()
def cfs_search(conan_api: ConanAPI, parser, subparser, *args):
    """
    Retrieve CFS packages available for install.
    """

    subparser.add_argument(
        "pattern",
        help="Pattern to be matched with package names",
    )
    args = parser.parse_args(*args)
    try:
        pkg_dict = json.loads(check_output_runner(f'conan search "{args.pattern}" --format=json'))
    except Exception as e:
        handle_and_raise_conan_exception(e)

    authErrors=[]
    for remote, pkgs in pkg_dict.items():
        if "error" in pkgs:
            error_msg = pkgs["error"]

            # Handle authentication errors. Because we set core:non_interactive=True, we receive this
            # error when authentication is required
            if "Conan interactive mode disabled" in error_msg:
                authErrors.append(remote)
                continue
            # If the error is about a recipe not found, we can skip it
            # This is useful for cases where the user is searching for a package that does not exist
            if re.compile(r"Recipe '(.*)' not found").match(error_msg):
                continue
            raise ConanException(f"Unexpected error accessing remote '{remote}':\n{error_msg}")
    if len(authErrors) > 0:
        exceptionMsg = ""
        for error in authErrors:
            exceptionMsg += f"Authentication error on remote '{error}'\n"
        raise ConanException(exceptionMsg)
    pkg_list = [pkg for remote in pkg_dict.values() for pkg in remote if "error" not in pkg]

    cli_out_write("\n".join(pkg_list))


@conan_subcommand()
def cfs_install(conan_api: ConanAPI, parser, subparser, *args):
    """
    Installs a CFS package and all its dependencies
    """

    subparser.add_argument("reference", help="CFS package reference")
    subparser.add_argument(
        "-nr",
        "--no-remote",
        action="store_true",
        required=False,
        help="Do not use remote, resolve exclusively in the cache",
    )
    args = parser.parse_args(*args)

    # Use the reusable install_packages function with a single reference
    installed_packages = install_packages([args.reference], args.no_remote)

    if installed_packages:
        cli_out_write("\n".join(installed_packages))


@conan_subcommand()
def cfs_uninstall(conan_api: ConanAPI, parser, subparser, *args):
    """
    Uninstalls a CFS package
    """

    subparser.add_argument("pkg_name", help="CFS package name")
    args = parser.parse_args(*args)

    packages = PackagesJson()

    if args.pkg_name not in packages:
        raise ConanException(f"Package {args.pkg_name} is not installed")

    consumers = packages.get_consumers(args.pkg_name)
    if consumers:
        raise ConanException(
            f"{args.pkg_name} cannot be uninstalled because other packages depend on it ({', '.join(consumers)})"
        )

    del packages[args.pkg_name]

    if not packages:
        # This was the last installed package, cannot run conan install without requires!
        packages.sync_file()
        return

    requires = " ".join(f"--requires={pkg['full_ref']}" for pkg in packages.values())
    conan_run(
        f"conan install {requires} -g CfsInstall --envs-generation=false --output-folder={Path()}"
    )


@conan_subcommand()
def cfs_get_path(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns the installation path of a CFS package
    """

    subparser.add_argument("pkg_name", help="CFS package name (does not include version)")
    args = parser.parse_args(*args)

    packages = PackagesJson()

    if args.pkg_name not in packages:
        raise ConanException(f"Package {args.pkg_name} is not installed")

    cli_out_write(packages[f"{args.pkg_name}"]["path"])


@conan_subcommand()
def cfs_get_pkg_info(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns metadata of a given CFS package.
    This method doesn't require the package to be installed.
    """

    def ensureList(x):
        return x if isinstance(x, (list, tuple)) else [x] if x is not None else []

    subparser.add_argument("reference", help="CFS package reference")
    args = parser.parse_args(*args)

    # This uses a non-public (as in, not documented) conan method, so it may change in the future, but there is no
    # public API for downloading just the recipe of a package from any remote
    try:
        remotes = conan_api.remotes.list()
        app = ConanApp(conan_api)
        layout, recipe_status, remote = app.proxy.get_recipe(
            RecipeReference.loads(args.reference), remotes, True, True
        )
        conanfile = conan_api.local.inspect(layout.conanfile(), remotes=remotes, lockfile=None)
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    pkg_info = {
        "reference": {"name": conanfile.name, "version": conanfile.version},
        "description": conanfile.description,
        "license": conanfile.license,
        "cfsVersion": getattr(conanfile, "cfs_version", ""),
    }

    if hasattr(conanfile, "cfs_soc"):
        pkg_info["soc"] = ensureList(conanfile.cfs_soc)

    if hasattr(conanfile, "cfs_pkg_type"):
        pkg_info["type"] = conanfile.cfs_pkg_type

    cli_out_write(json.dumps(pkg_info, indent=2))


@conan_subcommand()
def cfs_local_consumers(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns the packages that depend on a given package, including transitive consumers.
    """

    subparser.add_argument("pkg_name", help="CFS package name (does not include version)")
    args = parser.parse_args(*args)

    packages = PackagesJson()

    if args.pkg_name not in packages:
        raise ConanException(f"Package {args.pkg_name} is not installed")

    consumers = packages.get_consumers(args.pkg_name)
    if consumers:
        cli_out_write("\n".join(consumers))


@conan_subcommand()
def cfs_dependencies(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns the packages given package depends on, including transitive dependencies.
    This method doesn't require the package to be installed.
    """

    subparser.add_argument("reference", help="CFS package reference")
    args = parser.parse_args(*args)

    try:
        pkg_dict = json.loads(
            check_output_runner(f'conan graph info --requires="{args.reference}" --format=json')
        )
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    for info in pkg_dict["graph"]["nodes"].values():
        if info["ref"] == "conanfile":
            # The first node is the conanfile, which should be the same that the requested package,
            # since we only requested one package, but just in case lets skip it
            continue

        if info["label"] == args.reference:
            dependencies = {x["ref"] for x in info["dependencies"].values()}
            if dependencies:
                cli_out_write("\n".join(dependencies))


@conan_subcommand()
def cfs_install_manifest(conan_api: ConanAPI, parser, subparser, *args):
    """
    Installs packages from a manifest file. Checks if each package is already installed,
    and installs only those that are not yet installed or have a different version.

    The manifest is a JSON file with the following structure:
    {
        "version": 1,
        "packages": [
            {"name": "package1", "version": "1.0.0"},
            {"name": "package2", "version": "2.0.0"}
        ]
    }
    """
    subparser.add_argument("manifest_path", help="Path to the manifest file containing packages to install")
    args = parser.parse_args(*args)

    try:
        # Read and validate manifest file
        manifest = parse_manifest_file(args.manifest_path)
        manifest_packages = manifest["packages"]

        if not manifest_packages:
            # No packages to install
            return

        # Get packages that need to be installed
        packages_to_install = get_required_packages_from_manifest(manifest_packages)

        if not packages_to_install:
            # No packages need to be installed
            return

        # Convert packages to install to reference format
        package_references = [f"{pkg['name']}/{pkg['version']}" for pkg in packages_to_install]

        # Install all packages at once and get the installed packages
        installed_packages = install_packages(package_references)

        # Return the list of installed packages
        if installed_packages:
            cli_out_write("\n".join(installed_packages))

    except Exception as e:
        if isinstance(e, ConanException):
            raise e
        raise ConanException(f"Error installing packages from manifest: {str(e)}")


@conan_subcommand()
def cfs_check_manifest(conan_api: ConanAPI, parser, subparser, *args):
    """
    Checks a manifest file and returns a list of packages that need to be installed.
    Does not perform any installation, only checks what's missing.

    The manifest is a JSON file with the following structure:
    {
        "version": 1,
        "packages": [
            {"name": "package1", "version": "1.0.0"},
            {"name": "package2", "version": "2.0.0"}
        ]
    }
    """
    subparser.add_argument("manifest_path", help="Path to the manifest file containing packages to check")
    args = parser.parse_args(*args)

    try:
        # Read and validate manifest file
        manifest = parse_manifest_file(args.manifest_path)
        manifest_packages = manifest["packages"]

        if not manifest_packages:
            # No packages to check
            cli_out_write("[]")
            return

        # Get packages that need to be installed
        packages_to_install = get_required_packages_from_manifest(manifest_packages)

        # Return JSON list of packages that need to be installed
        cli_out_write(json.dumps(packages_to_install))

    except Exception as e:
        if isinstance(e, ConanException):
            raise e
        raise ConanException(f"Error checking manifest: {str(e)}")

@conan_subcommand()
def cfs_delete(conan_api: ConanAPI, parser, subparser, *args):
    """
    Deletes CFS packages from the local cache and removes all related info from the file system.
    For individual packages: fails if the package is installed.
    For wildcard patterns: deletes only packages that are not installed.
    """
    subparser.add_argument("pattern", help="CFS package pattern (e.g., 'my_package/1.0.0' or 'my_package/*')")
    args = parser.parse_args(*args)

    is_wildcard = '*' in args.pattern

    try:
        # Query the local cache for packages matching the pattern
        cached_result = json.loads(check_output_runner(f'conan list "{args.pattern}" --format=json'))

        # Check if the result contains error information
        if isinstance(cached_result, dict) and "Local Cache" in cached_result:
            local_cache_data = cached_result["Local Cache"]
            if isinstance(local_cache_data, dict) and "error" in local_cache_data:
                error_msg = local_cache_data["error"]
                if "not found" in error_msg:
                    raise ConanException(f"No local packages found matching pattern '{args.pattern}' to delete.")
                else:
                    raise ConanException(f"Error listing packages: {error_msg}")

        # Extract package references from the local cache
        local_cache = cached_result.get("Local Cache", {})
        cached_packages = [pkg for pkg in local_cache.keys() if pkg != "error" and "/" in pkg]

    except Exception as e:
        # Check if this is a ConanException we just raised
        if isinstance(e, ConanException):
            raise e
        # Check if this is a case where no packages match the pattern or other conan errors
        error_msg = str(e)
        if ("Recipe" in error_msg and "not found" in error_msg) or \
           ("not found" in error_msg) or \
           ("argument" in error_msg.lower() and ("invalid" in error_msg.lower() or "empty" in error_msg.lower())):
            raise ConanException(f"No local packages found matching pattern '{args.pattern}' to delete.")
        handle_and_raise_conan_exception(e)

    if not cached_packages:
        raise ConanException(f"No local packages found matching pattern '{args.pattern}' to delete.")

    # Get installed package references
    installed_refs = {pkg["full_ref"].split("#")[0] for pkg in PackagesJson().values()}

    # Determine which packages can be deleted (not installed)
    to_delete = [pkg for pkg in cached_packages if pkg not in installed_refs]
    # Determine which packages are still installed
    installed = [pkg for pkg in cached_packages if pkg in installed_refs]

    if is_wildcard:
        # For wildcard patterns: delete only non-installed packages
        if not to_delete:
            if installed:
                raise ConanException(
                    f"Cannot delete the following package(s) because they are still installed: {', '.join(installed)}."
                )
            raise ConanException(f"No packages found matching wildcard pattern '{args.pattern}' to delete.")
    else:
        # For individual packages: fail if any package is installed
        if installed:
            raise ConanException(
                f"Cannot delete the following package(s) because they are still installed: "
                f"{', '.join(installed)}. Please uninstall them first."
            )
        if not to_delete:
            raise ConanException(f"No packages found matching pattern '{args.pattern}' to delete.")

    # Delete the packages that are not installed
    deleted = []
    for pkg in to_delete:
        try:
            # Use conan remove command directly to handle revisions automatically
            check_output_runner(f'conan remove "{pkg}" -c')
            deleted.append(pkg)
        except Exception as e:
            # For ConanException, re-raise as is; for other exceptions, process them
            if isinstance(e, ConanException):
                raise e
            else:
                handle_and_raise_conan_exception(e)

    # Output the deleted packages for the caller
    if deleted:
        cli_out_write("\n".join(deleted))

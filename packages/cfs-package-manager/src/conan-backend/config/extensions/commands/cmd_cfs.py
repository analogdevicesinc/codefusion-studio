"""

Copyright (c) 2025-2026 Analog Devices, Inc.

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
from conan.api.model import ListPattern
from conan.cli.command import conan_command, conan_subcommand
from conan import conan_version

if conan_version < "2.17":
    from conans.util.runners import conan_run, check_output_runner
else:
    from conan.internal.util.runners import conan_run, check_output_runner
from conan.errors import ConanException
from conan.api.model import ListPattern, RecipeReference
from conan.internal.conan_app import ConanApp
from conan.internal.model.version_range import VersionRange
from conan.internal.model.version import Version

# Characters that indicate a version range expression (rather than a literal version)
VERSION_RANGE_CHARS = "*^~><|"


def has_version_range(version_expr: str) -> bool:
    """
    Detects if a version expression uses range syntax.
    """
    return any(char in version_expr for char in VERSION_RANGE_CHARS)


def version_satisfies(installed_version: str, required_range: str) -> bool:
    """
    Check if an installed version satisfies a version range requirement.

    Args:
        installed_version: The currently installed version (e.g., "2.3.0")
        required_range: The required version range (e.g., "^2.1.0", "~1.2", ">=1.0.0 <2.0.0")

    Returns:
        True if the installed version satisfies the range, False otherwise
    """
    try:
        # If the range includes pre-release constraints, add include_prerelease flag
        # so Conan properly considers pre-release versions as valid matches
        range_with_prerelease = required_range
        if has_prerelease_token(required_range) and "include_prerelease" not in required_range:
            range_with_prerelease = f"{required_range}, include_prerelease"

        version_range = VersionRange(range_with_prerelease)
        version = Version(installed_version)
        return version_range.contains(version, None)
    except (ValueError, TypeError):
        # VersionRange or Version raises ValueError/TypeError for malformed version
        # strings. Returning False is safe: the caller will treat the installed
        # version as not satisfying the range and schedule a re-install, which is
        # the conservative correct behaviour.
        return False


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

    # Check for version range resolution errors (no available version satisfies the requested range)
    version_range_error_pattern = re.compile(r"Package '([^']+)' not resolved: Version range")
    version_range_errors = version_range_error_pattern.findall(error_msg)
    if version_range_errors:
        # Strip brackets from version for cleaner output
        cleaned_refs = [re.sub(r'\[([^\]]+)\]', r'\1', ref) for ref in version_range_errors]
        raise ConanException(
            f"No versions found matching the specified range for: {', '.join(cleaned_refs)}"
        )

    # Check for package not found with bracket syntax (e.g., "Package 'pkg/[1.0]' not found")
    package_not_found_pattern = re.compile(r"Package '([^']+)' not found")
    package_not_found_errors = package_not_found_pattern.findall(error_msg)
    if package_not_found_errors:
        # Strip brackets from version for cleaner output
        cleaned_refs = [re.sub(r'\[([^\]]+)\]', r'\1', ref) for ref in package_not_found_errors]
        raise ConanException(
            f"Couldn't find the following packages: {', '.join(cleaned_refs)}"
        )

    # Check for package not resolved with no remote (local install failure)
    no_remote_pattern = re.compile(r"Package '([^']+)' not resolved.*No remote")
    no_remote_errors = no_remote_pattern.findall(error_msg)
    if no_remote_errors:
        # Strip brackets from version for cleaner output
        pkg_ref = no_remote_errors[0]
        pkg_ref = re.sub(r'\[([^\]]+)\]', r'\1', pkg_ref)
        raise ConanException(
            f"Package {pkg_ref} not resolved: No remote defined"
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
        A dictionary of package references mapped to package objects (with name and version) that need to be installed
    """
    packages = PackagesJson()

    # Create a mapping of package names to their installed versions (name -> version)
    installed_packages = {}
    for pkg_data in packages.values():
        full_ref = pkg_data["full_ref"].split("#")[0]  # Remove revision hash
        name, version = full_ref.split("/")
        installed_packages[name] = version

    packages_to_install = []
    for pkg in manifest_packages:
        pkg_name = pkg["name"]
        pkg_version = pkg["version"]
        installed_version = installed_packages.get(pkg_name)

        # Not installed - needs installation
        if installed_version is None:
            packages_to_install.append({"name": pkg_name, "version": pkg_version})
            continue

        # Check if version requirement is satisfied
        is_version_range = has_version_range(pkg_version)
        version_matches = (
            version_satisfies(installed_version, pkg_version) if is_version_range
            else installed_version == pkg_version
        )

        if not version_matches:
            packages_to_install.append({"name": pkg_name, "version": pkg_version})

    return packages_to_install


def get_packages_requiring_license_acceptance(conan_api: ConanAPI, pkg_refs: Sequence[str]):
    """
    Determines which packages from the provided list require license acceptance.
    Only checks packages that are NOT already present in the local cache.
    If a package is already cached, it means the license was previously accepted.

    Args:
        conan_api: The ConanAPI instance to use for inspecting packages
        pkg_refs: List of package references in "name/version" format

    Returns:
        A list of package reference strings that require license acceptance.
    """
    if not pkg_refs:
        return []

    # Use cached binaries (not recipe metadata) to infer accepted licenses.
    # Recipes can be cached after metadata inspection without user acceptance.
    packages_in_cache = get_conan_cached_packages()

    # Only check license for packages NOT in cache.
    # For version ranges, check whether any cached concrete version satisfies the range.
    packages_to_check = [
        pkg_ref for pkg_ref in pkg_refs
        if not is_requirement_cached(pkg_ref, packages_in_cache)
    ]

    if not packages_to_check:
        # All packages are already cached, no license acceptance needed
        return []

    remotes = conan_api.remotes.list()
    app = ConanApp(conan_api)
    packages_requiring_license = []

    for pkg_ref in packages_to_check:
        try:
            reference_to_inspect = normalize_reference(pkg_ref)
            layout, _, _ = app.proxy.get_recipe(
                RecipeReference.loads(reference_to_inspect), remotes, True, True
            )
            conanfile = conan_api.local.inspect(
                layout.conanfile(), remotes=remotes, lockfile=None
            )

            # Fallback for ranges: some Conan paths may not expose recipe/license metadata
            # consistently from range refs, so resolve to a concrete ref and retry once.
            if (
                not getattr(conanfile, "license", None)
                and has_version_range(split_recipe_ref(pkg_ref)[1] or "")
            ):
                resolved_ref = resolve_recipe_reference(pkg_ref)
                if resolved_ref != reference_to_inspect:
                    layout, _, _ = app.proxy.get_recipe(
                        RecipeReference.loads(resolved_ref), remotes, True, True
                    )
                    conanfile = conan_api.local.inspect(
                        layout.conanfile(), remotes=remotes, lockfile=None
                    )

            pkg_license = getattr(conanfile, "license", None)
            license_file = Path(layout.conanfile()).parent / "LICENSE"
            if (pkg_license and license_file.exists()):
                packages_requiring_license.append(pkg_ref)
        except ConanException:
            # A ConanException here means the package recipe could not be fetched
            # (e.g. network error, package not found on any remote). We skip it
            # rather than aborting the whole check: the install step itself will
            # fail with a proper error if the package truly cannot be resolved.
            pass

    return packages_requiring_license

def install_packages(pkg_refs_to_install: Sequence[str], no_remote: bool = False):
    """
    Installs one or multiple packages at once.

    Args:
        pkg_refs_to_install: Sequence of package references in "name/version" format

    Returns:
        A list of package references that were newly installed
    """

    # Ensure packages dependencies installed are not inadvertently upgraded or downgraded.
    # The .cfsPackages file maintains a list of explicitly installed packages with their exact versions,
    # allowing us to preserve user-selected versions during subsequent operations.
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
    # Use double quotes to properly escape references for shell execution on all platforms
    requires = " ".join([f'--requires="{ref}"' for ref in current_pkg_refs.values()])

    try:
        cmd = f"conan install {requires} -g CfsInstall -u --envs-generation=false --output-folder={Path()}"
        if no_remote:
            cmd += " --no-remote"
        check_output_runner(cmd)
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    # Determine which packages were newly installed
    pkgs_after_install = {x["full_ref"].split("#")[0] for x in PackagesJson().values()}
    installed_packages = pkgs_after_install - pkgs_before_install

    return list(installed_packages)


def has_prerelease_token(version_expr: str) -> bool:
    """
    Detects if a version expression contains a prerelease segment.

    Conan and SemVer treat versions with a '-' suffix as prerelease
    (e.g., "1.0.0-beta.1", ">=1.0.0-rc <2.0.0").

    Args:
        version_expr: A version string or version range expression

    Returns:
        True if the expression contains prerelease tokens, False otherwise
    """
    return "-" in version_expr


def to_conan_reference(pkg_name: str, pkg_version: str) -> str:
    """
    Convert package name/version to Conan reference format.

    For version ranges, use bracket syntax. If the range includes pre-release
    constraints and doesn't already specify include_prerelease, append
    include_prerelease so Conan can resolve pre-release versions.
    """
    if has_version_range(pkg_version):
        if has_prerelease_token(pkg_version) and "include_prerelease" not in pkg_version:
            pkg_version += ", include_prerelease"
        return f"{pkg_name}/[{pkg_version}]"
    else:
        return f"{pkg_name}/{pkg_version}"


def normalize_reference(reference: str) -> str:
    """
    Normalize a package reference so range syntax is converted into the
    Conan bracket form in exactly one place.
    """
    pkg_name, pkg_version = reference.split("/", 1)
    if pkg_version.startswith('"') and pkg_version.endswith('"'):
        pkg_version = pkg_version[1:-1]
    return to_conan_reference(pkg_name, pkg_version)

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
def cfs_list_cache(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns a list of package references that have cached binaries.

    Recipe-only metadata cache entries are intentionally excluded.
    """

    subparser.add_argument(
        "pattern",
        nargs="?",
        default="*",
        help="Optional pattern to be matched with package names",
    )

    args = parser.parse_args(*args)

    try:
        # Convert name-only patterns (e.g., "test_pkg2") to "name/*" so they
        # match all versions consistently with existing fnmatch behavior.
        filter_pattern = args.pattern
        if "/" not in filter_pattern and "*" not in filter_pattern:
            filter_pattern = f"{filter_pattern}/*"

        cached_packages = get_conan_cached_packages(filter_pattern)
        package_list = sorted(cached_packages)
        if package_list:
            cli_out_write("\n".join(package_list))

    except ConanException as e:
        handle_and_raise_conan_exception(e)


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
    pkg_list = {pkg for remote in pkg_dict.values() for pkg in remote if "error" not in pkg}

    cli_out_write("\n".join(sorted(pkg_list)))


def get_package_license_info(conan_api: ConanAPI, pkg_ref: str) -> dict | None:
    """
    Returns license info for a package if it requires acceptance.
    Returns None if package doesn't require license acceptance.

    Args:
        conan_api: The ConanAPI instance to use for inspecting packages
        pkg_ref: Package reference in "name/version" format

    Returns:
        A dict with 'license' and 'licenseText' keys, or None if no license required

    Raises:
        ConanException: If the recipe cannot be fetched or inspected (e.g. network error,
            unknown reference). This allows callers to detect and handle real failures;
            the actual install step will surface detailed errors if truly unresolvable.
    """
    remotes = conan_api.remotes.list()
    app = ConanApp(conan_api)
    layout, _, _ = app.proxy.get_recipe(
        RecipeReference.loads(pkg_ref), remotes, True, True
    )
    conanfile = conan_api.local.inspect(
        layout.conanfile(), remotes=remotes, lockfile=None
    )

    pkg_license = getattr(conanfile, "license", None)
    license_file = Path(layout.conanfile()).parent / "LICENSE"

    if pkg_license and license_file.exists():
        try:
            license_text = license_file.read_text(encoding='utf-8')
        except OSError:
            # The LICENSE file exists but cannot be read (e.g. permissions).
            # We still return the license identifier so the caller can prompt
            # the user; the full text is optional for acceptance.
            return {
                "license": pkg_license,
                "licenseText": None
            }
        return {
            "license": pkg_license,
            "licenseText": license_text
        }
    return None


def resolve_recipe_reference(pkg_ref: str) -> str:
    """
    Resolve a package reference to a concrete Conan recipe reference.

    Exact versions are returned in normalized form. Version ranges are resolved
    through `conan graph info`, matching the same mechanism used elsewhere in
    this file for dependency graph queries.
    """
    normalized_ref = normalize_reference(pkg_ref)
    name, version = split_recipe_ref(pkg_ref)
    if not name or not version or not has_version_range(version):
        return normalized_ref

    try:
        graph_output = check_output_runner(
            f'conan graph info --requires="{normalized_ref}" --format=json'
        )
    except ConanException as err:
        # Best-effort fallback: graph resolution can fail for transient remote issues
        # or unavailable metadata. In those cases, callers should continue with the
        # normalized range reference instead of failing install-plan/license checks.
        err_msg = str(err).lower()
        if "not found" in err_msg or "graph info" in err_msg or "error" in err_msg:
            return normalized_ref
        raise

    try:
        graph_info = json.loads(graph_output)
    except json.JSONDecodeError:
        # Non-JSON output means graph resolution could not be interpreted safely.
        # Keep behavior resilient by falling back to the normalized reference.
        return normalized_ref

    for info in graph_info.get("graph", {}).get("nodes", {}).values():
        resolved_ref = info.get("ref")
        if not resolved_ref or resolved_ref == "conanfile":
            continue
        resolved_name, resolved_version = split_recipe_ref(resolved_ref)
        if resolved_name == name and resolved_version and version_satisfies(
            resolved_version, version
        ):
            return resolved_ref

    return normalized_ref


def get_conan_cached_packages(pattern: str = "*") -> set:
    """
    Returns set of recipe references that have at least one cached binary
    package in Conan cache.

    This intentionally ignores recipe-only metadata cache entries. License
    acceptance is tied to installable binaries, not recipe metadata.

    Args:
        pattern: Optional recipe pattern in name/version glob form.

    Raises:
        ConanException: If the Conan cache cannot be queried (e.g. Conan CLI
            error) or if the output cannot be parsed.
    """
    # Query Conan with package scope (:*) so results only include recipes that
    # contain binary package nodes. Use the caller pattern to avoid full-cache
    # scans when users provide narrow list-cache filters.
    query_pattern = pattern if pattern == "*" or "/" in pattern else f"{pattern}/*"
    try:
        raw = check_output_runner(f'conan list "{query_pattern}:*" --format=json')
    except ConanException as e:
        raise ConanException(
            f"Failed to query the Conan cache: {e}"
        ) from e

    try:
        cached_result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ConanException(
            f"Unexpected output from 'conan list': could not parse JSON: {e}"
        ) from e

    local_cache = cached_result.get("Local Cache", {})
    cached_binary_recipes = set()

    for recipe_ref, recipe_data in local_cache.items():
        if "/" not in recipe_ref:
            continue

        normalized_ref = recipe_ref.split("#", 1)[0]
        revisions = recipe_data.get("revisions", {}) if isinstance(recipe_data, dict) else {}

        has_cached_binary = False
        for revision_data in revisions.values():
            packages = revision_data.get("packages", {}) if isinstance(revision_data, dict) else {}
            if isinstance(packages, dict) and packages:
                has_cached_binary = True
                break

        if has_cached_binary:
            cached_binary_recipes.add(normalized_ref)

    return cached_binary_recipes


def split_recipe_ref(pkg_ref: str) -> tuple[str, str] | tuple[None, None]:
    """
    Extract name/version from a recipe reference-like string.

    Handles refs that may include revision/user-channel suffixes.
    """
    try:
        clean_ref = pkg_ref.split("#", 1)[0]
        name, version_part = clean_ref.split("/", 1)
        version = version_part.split("@", 1)[0]
        return name, version
    except ValueError:
        # split("/", 1) raises ValueError when the ref contains no "/" separator,
        # meaning it is not a valid name/version reference. Return (None, None) so
        # callers can treat it as an unrecognised reference rather than crashing.
        return None, None


def is_requirement_cached(pkg_ref: str, cached_packages: set) -> bool:
    """
    Return True if the requirement has a cached binary representation.

    - Exact refs: require exact name/version match
    - Range refs: any cached concrete version satisfying the range is considered cached
    """
    req_name, req_version = split_recipe_ref(pkg_ref)
    if not req_name or not req_version:
        return False

    if not has_version_range(req_version):
        return any(
            split_recipe_ref(cached_ref) == (req_name, req_version)
            for cached_ref in cached_packages
        )

    for cached_ref in cached_packages:
        cached_name, cached_version = split_recipe_ref(cached_ref)
        if cached_name != req_name or not cached_version:
            continue
        if version_satisfies(cached_version, req_version):
            return True

    return False


def get_installed_packages() -> set:
    """
    Returns set of package references currently installed (tracked in .cfsPackages).

    Installed packages are actively in use. Only one version per package
    can be installed at a time.
    """
    try:
        packages = PackagesJson()
        return {x["full_ref"].split("#")[0] for x in packages.values()}
    except (OSError, json.JSONDecodeError):
        # .cfsPackages may be absent (fresh workspace) or unreadable/corrupt.
        # Returning an empty set causes every package to be treated as not
        # installed, which is safe: the install step will either install them
        # fresh or detect the real problem with a proper error.
        return set()


@conan_subcommand()
def cfs_install_plan(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns an installation plan for the provided package references without
    performing installation.

    This function only analyzes the explicitly requested (top-level) package
    references, checks their cache/installed status, and identifies potential
    license requirements for those references. It does not expand or return
    the full transitive dependency graph that Conan may install.

    Accepts either:
    - Package references as positional arguments (e.g., "msdk/1.0.0 zephyr/3.5.0")
    - A manifest file path with --manifest flag

    Output format (JSON):
    {
        "toInstall": [{"name": "pkg", "version": "1.0.0"}, ...],
        "alreadyInstalled": [{"name": "pkg", "version": "2.0.0"}, ...],
        "requiresLicenseAcceptance": [
            {
                "reference": {"name": "pkg", "version": "1.0.0"},
                "license": "Apache-2.0",
                "licenseText": "Full license text..."
            }
        ]
    }
    """
    subparser.add_argument(
        "references",
        nargs="*",
        help="Package references in name/version format"
    )
    subparser.add_argument(
        "-m", "--manifest",
        help="Path to manifest file (alternative to references)"
    )
    args = parser.parse_args(*args)

    # Determine input packages
    if args.manifest:
        manifest = parse_manifest_file(args.manifest)
        pkg_refs = [f"{p['name']}/{p['version']}" for p in manifest["packages"]]
    elif args.references:
        pkg_refs = args.references
        # Validate reference format (name/version)
        for ref in pkg_refs:
            if "/" not in ref:
                raise ConanException(
                    f"Invalid package reference format: '{ref}'. "
                    "Expected format: name/version (e.g., 'msdk/1.0.0')"
                )
    else:
        raise ConanException("Either package references or --manifest required")

    if not pkg_refs:
        # No packages to analyze
        cli_out_write(json.dumps({
            "toInstall": [],
            "alreadyInstalled": [],
            "requiresLicenseAcceptance": []
        }))
        return

    # Get installed packages (.cfsPackages) - determines what's already installed
    installed_packages = get_installed_packages()

    # Get cached packages that have binaries available in Conan cache.
    cached_packages = get_conan_cached_packages()

    # Separate installed vs to-install.
    # Keep this logic aligned with get_required_packages_from_manifest() so
    # check-manifest and install-plan classify packages consistently.
    installed_package_versions = {}
    for installed_ref in installed_packages:
        if "/" not in installed_ref:
            continue
        name, version = installed_ref.split("/", 1)
        installed_package_versions[name] = version

    already_installed = []
    to_install = []
    for pkg_ref in pkg_refs:
        name, requested_version = pkg_ref.split("/", 1)
        pkg_obj = {"name": name, "version": requested_version}

        installed_version = installed_package_versions.get(name)
        if installed_version is None:
            to_install.append(pkg_obj)
            continue

        is_version_range = has_version_range(requested_version)
        version_matches = (
            version_satisfies(installed_version, requested_version)
            if is_version_range
            else installed_version == requested_version
        )

        if version_matches:
            # For ranges, report the concrete installed version in alreadyInstalled.
            already_installed.append({
                "name": name,
                "version": installed_version if is_version_range else requested_version
            })
        else:
            to_install.append(pkg_obj)

    # Get license info for packages that need to be installed AND are not in cache
    # (if in cache, license was already accepted previously)
    # Track packages we download so we can clean them up afterwards
    packages_downloaded_for_license_check = set()
    requires_license = []
    for pkg in to_install:
        pkg_ref = f"{pkg['name']}/{pkg['version']}"
        # Only require license acceptance if not already in Conan cache
        if not is_requirement_cached(pkg_ref, cached_packages):
            resolved_ref = (
                resolve_recipe_reference(pkg_ref)
                if has_version_range(pkg["version"])
                else normalize_reference(pkg_ref)
            )
            license_info = get_package_license_info(conan_api, resolved_ref)

            # Always schedule cleanup of the concrete ref that was actually downloaded.
            # get_package_license_info downloads the recipe into the Conan cache as
            # a side effect (via app.proxy.get_recipe), even when it returns None.
            # Without this the recipe leaks into cache and subsequent install-plan
            # calls will skip the license prompt (cached == previously accepted).
            packages_downloaded_for_license_check.add(resolved_ref)

            if license_info:
                requires_license.append({
                    "reference": pkg,
                    "license": license_info["license"],
                    "licenseText": license_info.get("licenseText")
                })

    # Clean up any recipes we downloaded during license checking
    # This prevents polluting the cache with packages the user hasn't accepted yet
    for pkg_ref in packages_downloaded_for_license_check:
        try:
            check_output_runner(f'conan remove "{pkg_ref}" -c')
        except ConanException as e:
            # Best-effort cleanup: install-plan should not fail after computing a
            # valid result just because cache cleanup could not be completed.
            # This can happen for non-fatal reasons (ref already gone, lock
            # contention, transient cache issues, non-concrete refs, or
            # already-removed cache entries.
            continue

    result = {
        "toInstall": to_install,
        "alreadyInstalled": already_installed,
        "requiresLicenseAcceptance": requires_license
    }

    cli_out_write(json.dumps(result))


@conan_subcommand()
def cfs_search_info(conan_api: ConanAPI, parser, subparser, *args):
    """
    Retrieve CFS packages available for install and their metadata
    """

    subparser.add_argument(
        "pattern",
        help="Pattern to be matched with package names",
    )
    subparser.add_argument(
        "-nr",
        "--no-remote",
        action="store_true",
        required=False,
        help="Do not use remote, resolve exclusively in the cache",
    )
    args = parser.parse_args(*args)
    remotes = conan_api.remotes.list(only_enabled=True) if not args.no_remote else []

    try:
        # Setting rrev=None so we don't try to retrieve latest revision at this point.
        # This potential search will be handled in _get_recipe_info
        ref_pattern = ListPattern(args.pattern, only_recipe=True, rrev=None)

        if conan_version < "2.21":
            raise ConanException("cfs_search_info command requires Conan version 2.21 or higher")

        references = set()
        for remote in [None] + remotes:
            try:
                # Using .serialize() here because .items() only traverses resolved recipe revisions,
                # but here we are not resolving those to save some server queries.
                references.update(conan_api.list.select(ref_pattern, remote=remote).serialize())
            except ConanException as e:
                # If we query for an exact recipe and that recipe is not found on the server
                # We get this error. Let's ignore it and continue, since it just means that
                # recipe doesn't exist on that remote, but it could exist on another remote
                # or locally
                missing_recipe_error_pattern = re.compile(r"Recipe '([^']+)' not found", re.DOTALL)
                missing_recipe_errors = missing_recipe_error_pattern.findall(str(e))
                if missing_recipe_errors:
                    continue
                # Re-raise any other error for the inner loop
                raise

        # Pass remotes so they are not fetched on every iteration
        # Note that check_update is set to False to avoid checking all the remotes for all the packages.
        # This is important because the typical use case for this command is to be used with pattern "*"
        # since we cannot assume any package name, so if we search for updates we will end up checking for
        # updates on every package every single time.
        # Alternatively, we are now assuming there is only one revision per recipe/package reference (i.e.
        # recipes are never updated for a given version) and therefore we can only query remotes for package
        # versions that are not already in the local cache. In other words, we assume that if a version is on
        # the local cache, that version is valid and there is no a newer one.
        pkg_dict = {
            f"{ref}": _get_recipe_info(conan_api, str(ref), remotes, check_update=False)
            for ref in references
        }

    except Exception as e:
        handle_and_raise_conan_exception(e)

    cli_out_write(json.dumps(pkg_dict, indent=2))


@conan_subcommand()
def cfs_install(conan_api: ConanAPI, parser, subparser, *args):
    """
    Installs one or more CFS packages and all their dependencies.

    When used with getInstallPlan(), license checking is handled by the caller.
    Pass --accept-license to skip license checks (used after user accepts via CLI prompt).
    """

    subparser.add_argument(
        "references",
        nargs="+",
        help="One or more CFS package references in name/version format"
    )
    subparser.add_argument(
        "-nr",
        "--no-remote",
        action="store_true",
        required=False,
        help="Do not use remote, resolve exclusively in the cache",
    )
    subparser.add_argument(
        "-al",
        "--accept-license",
        action="store_true",
        required=False,
        help="Accept the license of packages during installation. By default, if a package requires a license acceptance, the installation will fail.",
    )
    args = parser.parse_args(*args)

    if not args.references:
        cli_out_write("")
        return

    # Process each reference to handle version ranges
    pkg_to_installs = []
    for reference in args.references:
        pkg_to_installs.append(normalize_reference(reference))

    # Check if any packages require license acceptance (only if flag not set)
    if not args.accept_license:
        pkg_requiring_licenses = get_packages_requiring_license_acceptance(conan_api, args.references)
        if pkg_requiring_licenses:
            raise ConanException(
                f"The following packages require license acceptance: {', '.join(pkg_requiring_licenses)}. "
                "Accept the licenses to proceed with installation."
            )

    # Install all packages
    installed_packages = install_packages(pkg_to_installs, args.no_remote)

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


def _get_recipe_info(conan_api: ConanAPI, reference: str, remotes=None, check_update=True) -> dict:

    if remotes is None:
        remotes = conan_api.remotes.list()

    def ensureList(x):
        return x if isinstance(x, (list, tuple)) else [x] if x is not None else []

    # This uses a non-public (as in, not documented) conan method, so it may change in the future, but there is no
    # public API for downloading just the recipe of a package from any remote
    try:
        app = ConanApp(conan_api)
        layout, recipe_status, remote = app.proxy.get_recipe(
            RecipeReference.loads(reference), remotes, False, check_update
        )
        conanfile = conan_api.local.inspect(layout.conanfile(), remotes=remotes, lockfile=None)
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    # Derive the name and version from the package reference, because inspect()
    # is not necessarily able to obtain the correct ones from the recipe, as any
    # --version option or environment variables used during package creation are
    # not available to it.
    name, version = split_recipe_ref(reference)

    pkg_info = {
        "reference": { "name": name, "version": version },
        "description": conanfile.description,
        "license": conanfile.license,
        "cfsVersion": getattr(conanfile, "cfs_version", ""),
    }

    # Attempt to read LICENSE file from the recipe export folder
    # The LICENSE file should be exported using the 'exports' field in conanfile.py
    license_text = None

    try:
        # The conanfile.py path points to the export folder
        # layout.conanfile() returns the path to conanfile.py in the export folder
        conanfile_path = Path(layout.conanfile())
        export_folder = conanfile_path.parent

        # Check for LICENSE file in the export folder
        license_file_path = export_folder / "LICENSE"
        if license_file_path.exists():
            license_text = license_file_path.read_text(encoding='utf-8')
    except OSError:
        # The export folder path or LICENSE file could not be read (e.g. layout
        # returned an unexpected path, or a permissions error). The license text
        # is supplementary metadata; omitting it does not block installation or
        # license acceptance, so we continue without it.
        pass

    if license_text:
        pkg_info["licenseText"] = license_text

    if hasattr(conanfile, "cfs_soc"):
        pkg_info["soc"] = ensureList(conanfile.cfs_soc)

    if hasattr(conanfile, "cfs_pkg_type"):
        pkg_info["type"] = conanfile.cfs_pkg_type

    if hasattr(conanfile, "cfs_components"):
        pkg_info["components"] = ensureList(conanfile.cfs_components)

    return pkg_info


@conan_subcommand()
def cfs_get_pkg_info(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns metadata of a given CFS package.
    This method doesn't require the package to be installed.
    """

    subparser.add_argument("reference", help="CFS package reference")
    args = parser.parse_args(*args)

    pkg_info = _get_recipe_info(conan_api, normalize_reference(args.reference))

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
    normalized_reference = normalize_reference(args.reference)

    try:
        pkg_dict = json.loads(
            check_output_runner(
                f'conan graph info --requires="{normalized_reference}" --format=json'
            )
        )
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    for info in pkg_dict["graph"]["nodes"].values():
        if info["ref"] == "conanfile":
            # The first node is the conanfile, which should be the same that the requested package,
            # since we only requested one package, but just in case lets skip it
            continue

        if info["label"] in {args.reference, normalized_reference}:
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
            {"name": "package2", "version": "^2.0.0"},
            {"name": "package3", "version": "~2.0"},
            {"name": "package4", "version": ">=1.0.0 <1.3.0"}
        ]
    }
    """
    subparser.add_argument("manifest_path", help="Path to the manifest file containing packages to install")
    subparser.add_argument(
        "-nr",
        "--no-remote",
        action="store_true",
        required=False,
        help="Do not use remote, resolve exclusively in the cache",
    )
    subparser.add_argument(
        "-al",
        "--accept-license",
        action="store_true",
        required=False,
        help="Accept the license of the package during installation. By default, if a package requires a license acceptance, the installation will fail.",
    )
    args = parser.parse_args(*args)

    try:
        # Read and validate manifest file
        manifest = parse_manifest_file(args.manifest_path)
        manifest_packages = manifest["packages"]

        if not manifest_packages:
            # No packages to install
            return cli_out_write(json.dumps({"installed": [], "skipped": []}))

        # Get packages that need to be installed (returns a list of dicts with 'name' and 'version')
        packages_to_install = get_required_packages_from_manifest(manifest_packages)

        # Convert list to package references for license check
        pkg_refs_to_check = [f"{pkg['name']}/{pkg['version']}" for pkg in packages_to_install]

        # Get the packages that require license acceptance
        pkg_requiring_licenses = get_packages_requiring_license_acceptance(conan_api, pkg_refs_to_check)

        # Skipping packages that require license acceptance if the flag is not set
        skipped_packages = []
        if not args.accept_license and pkg_requiring_licenses:
            for pkg_ref in pkg_requiring_licenses:
                skipped_packages.append(pkg_ref)
            # Filter out skipped packages from packages_to_install
            packages_to_install = [
                pkg for pkg in packages_to_install
                if f"{pkg['name']}/{pkg['version']}" not in skipped_packages
            ]

        if not packages_to_install:
            # No packages need to be installed
            return cli_out_write(json.dumps({"installed": [], "skipped": skipped_packages}))

        # Convert packages to install to reference format with brackets for version ranges
        # If the version contains any of the version range characters, we need to use the bracket syntax for conan to recognize it as a version range instead of a literal version
        package_references = [
            to_conan_reference(pkg["name"], pkg["version"])
            for pkg in packages_to_install
        ]

        # Install all packages at once and get the installed packages
        installed_packages = install_packages(package_references, no_remote=args.no_remote)

        # Return the list of installed and skipped packages
        result = {
            "installed": installed_packages if installed_packages else [],
            "skipped": skipped_packages
        }

        cli_out_write(json.dumps(result))

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

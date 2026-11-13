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

import contextlib
import io
import json
import os
import shutil
import stat
import subprocess
from pathlib import Path
import fnmatch
from collections.abc import MutableMapping, Sequence
import re

from conan.api.conan_api import ConanAPI
from conan.api.output import cli_out_write
from conan.api.model import ListPattern
from conan.cli.command import conan_command, conan_subcommand
from conan import conan_version, Version

# TODO: We can replace these internal APIs by public conan_api.command.run
# whenever we decide to drop support for old versions
if conan_version < "2.17":
    from conans.util.runners import conan_run, check_output_runner
else:
    from conan.internal.util.runners import conan_run, check_output_runner

from conan.errors import ConanException
from conan.api.model import ListPattern, RecipeReference
from conan.api.model.list import VersionRange

from conan.internal.errors import (
    ConanReferenceDoesNotExistInDB,
    NotFoundException,
    RecipeNotFoundException,
)

# Import error handling utilities
# Use absolute import to avoid issues when Conan loads this as a custom command
import sys
from pathlib import Path

_commands_dir = Path(__file__).parent
if str(_commands_dir) not in sys.path:
    sys.path.insert(0, str(_commands_dir))
from error_handling import handle_and_raise_conan_exception

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

        # Build metadata does not affect SemVer precedence. Conan VersionRange
        # matching can reject versions containing '+' for some expressions, so
        # evaluate using the precedence portion only.
        normalized_installed_version = installed_version.split("+", 1)[0]
        version = Version(normalized_installed_version)
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
    except json.JSONDecodeError as e:
        raise ConanException(f"Invalid JSON format in manifest file: {e}") from e
    except (OSError, UnicodeDecodeError) as e:
        raise ConanException(f"Error reading manifest file: {e}") from e

    # Validate manifest structure
    if "version" not in manifest or "packages" not in manifest or not isinstance(manifest["packages"], list):
        raise ConanException("Invalid manifest format. Must contain 'version' and 'packages' fields.")

    # Validate each package entry has required fields
    for i, pkg in enumerate(manifest["packages"]):
        if not isinstance(pkg, dict):
            raise ConanException(f"Invalid package entry at index {i}: must be an object")
        if "name" not in pkg:
            raise ConanException(f"Invalid package entry at index {i}: missing required 'name' field")
        if "version" not in pkg:
            raise ConanException(f"Invalid package entry at index {i}: missing required 'version' field")

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


def get_packages_requiring_license_acceptance(
    conan_api: ConanAPI, pkg_refs: Sequence[str], local_only: bool = False
):
    """
    Determines which packages from the provided list require license acceptance.
    Only checks packages that are NOT already present in the local cache.
    If a package is already cached, it means the license was previously accepted.

    Args:
        conan_api: The ConanAPI instance to use for inspecting packages
        pkg_refs: List of package references in "name/version" format
        local_only: If True, remote connection will not be attempted,
                    which will lead to return either no package, or
                    a not-found error being raised

    Returns:
        A list of package reference strings that require license acceptance.
    """
    if not pkg_refs:
        return []

    # Use cached binaries (not recipe metadata) to infer accepted licenses.
    # Recipes can be cached after metadata inspection without user acceptance.
    packages_in_cache = get_conan_cached_packages(conan_api)

    # Only check license for packages NOT in cache.
    # For version ranges, check whether any cached concrete version satisfies the range.
    packages_to_check = [
        pkg_ref for pkg_ref in pkg_refs
        if not is_requirement_cached(pkg_ref, packages_in_cache)
    ]

    if not packages_to_check:
        # All packages are already cached, no license acceptance needed
        return []

    packages_requiring_license = []

    for pkg_ref in packages_to_check:
        resolved_ref = resolve_recipe_reference(pkg_ref, local_only)
        # Passing an empty list of remotes will only check local cache while
        # passing None will check all remotes
        conanfile = _get_recipe_info(
            conan_api, resolved_ref, [] if local_only else None
        )

        pkg_license = conanfile["license"]
        pkg_license_text = conanfile.get("licenseText", None)
        if pkg_license and pkg_license_text:
            packages_requiring_license.append(pkg_ref)

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
    # Strip existing brackets to prevent double-bracketing on re-normalization
    if pkg_version.startswith("[") and pkg_version.endswith("]"):
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

        cached_packages = get_conan_cached_packages(conan_api, filter_pattern)
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


def resolve_recipe_reference(pkg_ref: str, local_only: bool = False) -> str:
    """
    Resolve a package reference to a concrete Conan recipe reference.

    Exact versions are returned in normalized form. Version ranges are resolved
    through `conan graph info`, matching the same mechanism used elsewhere in
    this file for dependency graph queries. If `local_only` is True, the resolution
    will be attempted using only the local cache, avoiding remote queries.

    """
    normalized_ref = normalize_reference(pkg_ref)
    name, version = split_recipe_ref(pkg_ref)
    if not has_version_range(version):
        return normalized_ref

    try:
        graph_output = check_output_runner(
            f'conan graph info --requires="{normalized_ref}" --format=json{" --no-remote" if local_only else ""}'
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
            return f"{resolved_name}/{resolved_version}"

    return normalized_ref


def get_conan_cached_packages(conan_api: ConanAPI, pattern: str = "*") -> set:
    """
    Returns set of recipe references that have at least one cached binary
    package in Conan cache.

    This intentionally ignores recipe-only metadata cache entries. License
    acceptance is tied to installable binaries, not recipe metadata.

    Args:
        conan_api: The ConanAPI instance of the running command
        pattern: Optional recipe pattern in name/version glob form.

    Raises:
        ConanException: If the pattern is invalid.
    """
    # Query Conan with package scope (:*) so results only include recipes that
    # contain binary package nodes. Use the caller pattern to avoid full-cache
    # scans when users provide narrow list-cache filters.
    query_pattern = pattern if pattern == "*" or "/" in pattern else f"{pattern}/*"
    # Same selection as `conan list "<pattern>:*"`, but in this process: a
    # nested conan process costs about a second to start on Windows.
    try:
        local_cache = conan_api.list.select(
            ListPattern(f"{query_pattern}:*", rrev=None, prev=None)
        ).serialize()
    except (RecipeNotFoundException, ConanReferenceDoesNotExistInDB, NotFoundException):
        # Recipe not found in cache is expected for uncached exact references;
        # return empty rather than failing. Wildcard patterns that match nothing
        # return empty without raising.
        return set()
    except Exception as e:
        raise ConanException(
            f"Failed to query the Conan cache: {e}"
        ) from e

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


def split_recipe_ref(pkg_ref: str) -> tuple[str, str]:
    """
    Extract name/version from a recipe reference-like string.

    Handles refs that may include revision/user-channel suffixes.

    Args:
        pkg_ref: Package reference in "name/version" format, optionally with
                 @user/channel or #revision suffixes.

    Returns:
        Tuple of (name, version)

    Raises:
        ValueError: If pkg_ref is not in valid "name/version" format.
                   All inputs should be valid refs from Conan or .cfsPackages;
                   if not, this is a data integrity error that should fail loudly.
    """
    if "/" not in pkg_ref:
        raise ValueError(
            f"Invalid package reference '{pkg_ref}'. "
            f"Expected format: 'name/version' (e.g., 'pkg/1.0.0')"
        )

    clean_ref = pkg_ref.split("#", 1)[0]
    name, version_part = clean_ref.split("/", 1)
    version = version_part.split("@", 1)[0]
    return name, version


def _normalize_dependency_ref(ref: str | None) -> str | None:
    """
    Normalize a dependency reference to a stable name/version output string.
    """
    if not ref:
        return None

    name, version = split_recipe_ref(ref)

    # Convert Conan bracket range syntax to plain constraint text
    # used by the CFS API and CLI output.
    if version.startswith("[") and version.endswith("]"):
        version = version[1:-1]

    # Conan may append include_prerelease to range expressions.
    # Keep output focused on the original version requirement.
    version = version.replace(", include_prerelease", "")

    return f"{name}/{version}"


def _dependency_output_ref(
    dep: dict,
    resolved_node_ref: str | None,
    installed_versions: dict[str, str],
    unresolved: bool,
    no_remote: bool,
) -> str | None:
    """
    Select the dependency reference representation for command output.

    Default behavior is concrete resolution (installed version if compatible),
    otherwise the concrete version already resolved in the current dependency
    graph. With unresolved=True, output keeps the declared requirement
    expression when available.
    """
    requirement_ref = dep.get("require")
    resolved_ref = resolved_node_ref or dep.get("ref")

    if unresolved:
        # "Unresolved" mode preserves declared constraints when available
        # (e.g. ^1.2.0), rather than forcing a concrete resolved version.
        return _normalize_dependency_ref(requirement_ref) or _normalize_dependency_ref(
            resolved_ref
        )

    # Normalize once so downstream logic always compares canonical requirement
    # text (strip [..] wrappers and include_prerelease marker).
    normalized_requirement_ref = _normalize_dependency_ref(requirement_ref)
    req_name, req_version = (
        split_recipe_ref(normalized_requirement_ref)
        if normalized_requirement_ref
        else (None, None)
    )
    if req_name and req_version:
        installed_version = installed_versions.get(req_name)

        if installed_version:
            if has_version_range(req_version):
                # Prefer local installed version when it already satisfies the
                # requested range. This avoids unnecessary remote/cache lookup
                # and keeps output aligned with active local state.
                if version_satisfies(installed_version, req_version):
                    return f"{req_name}/{installed_version}"
            elif installed_version == req_version:
                return f"{req_name}/{installed_version}"

        if has_version_range(req_version):
            # Requirement is still non-concrete. Reuse the concrete ref already
            # resolved in the current graph instead of spawning a fresh
            # `conan graph info` process per dependency.
            normalized_requirement = normalize_reference(f"{req_name}/{req_version}")
            resolved_requirement = resolved_ref
            if no_remote and resolved_requirement == normalized_requirement:
                # In offline mode, unresolved ranges mean cache-only resolution
                # could not determine a concrete dependency version.
                raise ConanException(
                    f"Dependency '{req_name}/{req_version}' could not be resolved from local cache"
                )

            return _normalize_dependency_ref(resolved_requirement)

        return normalized_requirement_ref

    return _normalize_dependency_ref(resolved_ref)


def _run_graph_info(graph_cmd: str) -> dict:
    """
    Run `conan graph info` and return its JSON even when the graph fails.

    A failed graph is still printed in full, with `error` describing what went
    wrong, so reacting to the exit code alone would discard the one answer that
    explains the failure.
    """
    completed = subprocess.run(
        graph_cmd, shell=True, capture_output=True, text=True
    )

    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError:
        # Conan died before producing a graph, so there is nothing structured
        # to report and the raw message is all we have.
        raise ConanException(
            completed.stderr.strip() or completed.stdout.strip()
        )


def is_requirement_cached(pkg_ref: str, cached_packages: set) -> bool:
    """
    Return True if the requirement has a cached binary representation.

    - Exact refs: require exact name/version match
    - Range refs: any cached concrete version satisfying the range is considered cached
    """
    req_name, req_version = split_recipe_ref(pkg_ref)

    if not has_version_range(req_version):
        return any(
            split_recipe_ref(cached_ref) == (req_name, req_version)
            for cached_ref in cached_packages
        )

    for cached_ref in cached_packages:
        cached_name, cached_version = split_recipe_ref(cached_ref)
        if cached_name != req_name:
            continue
        if version_satisfies(cached_version, req_version):
            return True

    return False


def _has_binary_packages_in_list_output(node) -> bool:
    """
    Return True when a Conan `list --format=json` result contains at least one
    binary package entry.
    """
    if isinstance(node, dict):
        packages = node.get("packages")
        if isinstance(packages, dict) and packages:
            return True
        return any(_has_binary_packages_in_list_output(value) for value in node.values())

    if isinstance(node, list):
        return any(_has_binary_packages_in_list_output(value) for value in node)

    return False


def _has_recipe_in_list_output(node) -> bool:
    """
    Return True when a Conan `list --format=json` result contains at least one
    recipe entry, even if there are no matching binary packages for the current
    host profile.
    """
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(key, str) and "/" in key and isinstance(value, dict):
                return True
            if _has_recipe_in_list_output(value):
                return True

    if isinstance(node, list):
        return any(_has_recipe_in_list_output(value) for value in node)

    return False


def has_supported_binary_for_reference(pkg_ref: str, remote_names: Sequence[str]) -> bool | None:
    """
    Check whether the given package has at least one binary matching the current
    platform on any enabled remote.

    The remote query uses `conan list <ref>:* -fp default --format=json` so Conan
    filters binary results using the current host profile rather than returning
    binaries for every platform.

    ``pkg_ref`` must already be in normalized Conan form (e.g. ``name/1.2.3`` or
    ``name/[^1.0]``); callers are responsible for normalization so this function
    never re-normalizes and cannot accidentally double-wrap bracket ranges.

    Returns:
    - True when a matching binary is found.
    - False when a recipe is visible on at least one remote but no compatible
      binary exists for the current platform.
    - None when no remote returned any matching recipe entry.

    """
    query_pattern = f"{pkg_ref}:*"
    saw_recipe = False

    for remote_name in remote_names:
        raw = check_output_runner(
            f'conan list -r "{remote_name}" "{query_pattern}" -fp default --format=json'
        )
        list_result = json.loads(raw)

        if _has_binary_packages_in_list_output(list_result):
            return True

        if _has_recipe_in_list_output(list_result):
            saw_recipe = True

    return False if saw_recipe else None


def get_installed_packages() -> set:
    """
    Returns set of package references currently installed (tracked in .cfsPackages).

    Installed packages are actively in use. Only one version per package
    can be installed at a time.

    Raises:
        json.JSONDecodeError: If .cfsPackages is corrupted (invalid JSON)
    """
    # PackagesJson constructor handles missing file by returning empty dict.
    # If file exists but is corrupted, let the error propagate so user knows
    # their installation state is broken.
    packages = PackagesJson()
    return {x["full_ref"].split("#")[0] for x in packages.values()}


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
        "skipped": [
            {
                "reference": {"name": "pkg", "version": "1.0.0"},
                "reasonCode": "UNSUPPORTED_BINARY_FOR_PLATFORM"
            }
        ],
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
            "skipped": [],
            "requiresLicenseAcceptance": []
        }))
        return

    # Get installed packages (.cfsPackages) - determines what's already installed
    installed_packages = get_installed_packages()

    # Get cached packages that have binaries available in Conan cache.
    cached_packages = get_conan_cached_packages(conan_api)
    enabled_remote_names = [
        remote.name for remote in conan_api.remotes.list(only_enabled=True)
    ]

    # Separate installed vs to-install.
    # Keep this logic aligned with get_required_packages_from_manifest() so
    # check-manifest and install-plan classify packages consistently.
    installed_package_versions = {}
    for installed_ref in installed_packages:
        if "/" not in installed_ref:
            continue
        name, version = installed_ref.split("/", 1)
        installed_package_versions[name] = version

    # Packages skipped for genuine exclusion reasons (e.g. no compatible binary
    # for the current platform). Already-installed packages are NOT skipped; they
    # are reported separately in `alreadyInstalled`.
    skipped_packages = []
    already_installed = []
    to_install = []
    for pkg_ref in pkg_refs:
        name, requested_version = pkg_ref.split("/", 1)

        # toInstall uses the requested version to maintain manifest-to-action mapping
        pkg_obj = {"name": name, "version": requested_version}

        installed_version = installed_package_versions.get(name)
        if installed_version is None:
            to_install.append(pkg_obj)
            continue

        version_matches = (
            version_satisfies(installed_version, requested_version)
            if has_version_range(requested_version)
            else installed_version == requested_version
        )

        if version_matches:
            # Report the concrete installed version in alreadyInstalled.
            already_installed.append({
                "name": name,
                "version": installed_version
            })
        else:
            to_install.append(pkg_obj)

    # Resolve version ranges to concrete versions for packages that actually need installation.
    # This defers expensive remote graph resolution until after the installed-package check,
    # avoiding unnecessary network calls and recipe cache pollution.
    # resolved_versions maps package names to concrete versions for license checking.
    resolved_versions = {}
    for pkg in to_install:
        name = pkg['name']
        requested_version = pkg['version']

        if has_version_range(requested_version):
            pkg_ref = f"{name}/{requested_version}"
            concrete_ref = resolve_recipe_reference(pkg_ref)
            _, concrete_version = split_recipe_ref(concrete_ref)
            resolved_version = concrete_version or requested_version

            # Strip surrounding brackets if present. resolve_recipe_reference() can return
            # normalized range refs like "name/[^1.0]" when resolution fails. We need the
            # unbracketed form for VersionRange() in cache checks.
            if resolved_version and resolved_version.startswith("[") and resolved_version.endswith("]"):
                resolved_version = resolved_version[1:-1]
        else:
            resolved_version = requested_version

        resolved_versions[name] = resolved_version

    # Get license info for packages that need to be installed AND are not in cache
    # (if in cache, license was already accepted previously)

    requires_license = []
    for pkg in to_install:
        pkg_name = pkg['name']
        # Use the concrete resolved version for license checking, not the requested range
        concrete_version = resolved_versions.get(pkg_name, pkg['version'])
        concrete_ref = f"{pkg_name}/{concrete_version}"

        # Cached packages can always be reused locally.
        if is_requirement_cached(concrete_ref, cached_packages):
            continue

        # Normalize the concrete reference for license checking
        resolved_ref = normalize_reference(concrete_ref)

        try:
            binary_support = has_supported_binary_for_reference(
                resolved_ref,
                enabled_remote_names,
            )
        except Exception as e:
            handle_and_raise_conan_exception(e)

        if binary_support is False:
            skipped_packages.append({
                "reference": pkg,
                "reasonCode": "UNSUPPORTED_BINARY_FOR_PLATFORM"
            })
            continue

        pkg_info = _get_recipe_info(conan_api, resolved_ref)

        license = pkg_info.get("license")
        license_text = pkg_info.get("licenseText", None)

        if license and license_text:

            requires_license.append(
                {
                    "reference": pkg_info["reference"],
                    "license": license,
                    "licenseText": license_text,
                }
            )

    skipped_ref_set = {
        f"{x['reference']['name']}/{x['reference']['version']}"
        for x in skipped_packages
    }

    result = {
        "toInstall": [
            pkg for pkg in to_install
            if f"{pkg['name']}/{pkg['version']}" not in skipped_ref_set
        ],
        "alreadyInstalled": already_installed,
        "skipped": skipped_packages,
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
        # Note that _get_recipe_info doesn't check all the remotes for all the packages.
        # This is important because the typical use case for this command is to be used with pattern "*"
        # since we cannot assume any package name, so if we search for updates we will end up checking for
        # updates on every package every single time.
        # Alternatively, we are now assuming there is only one revision per recipe/package reference (i.e.
        # recipes are never updated for a given version) and therefore we can only query remotes for package
        # versions that are not already in the local cache. In other words, we assume that if a version is on
        # the local cache, that version is valid and there is no a newer one.
        pkg_dict = {
            f"{ref}": _get_recipe_info(conan_api, str(ref), remotes)
            for ref in references
        }

    except Exception as e:
        handle_and_raise_conan_exception(e)

    cli_out_write(json.dumps(pkg_dict, indent=2))

@conan_subcommand()
def cfs_local_install(conan_api: ConanAPI, parser, subparser, *args):
    """
    Installs CFS packages from a local tarball by restoring them into the Conan
    cache and then installing them locally without contacting any remote.
    """
    subparser.add_argument("pkg_location", help="CFS tarball package location")
    args = parser.parse_args(*args)

    try:
        pkg_out = json.loads(
            # this can bomb out badly on win due with linux files that have "::"
            # and the extract fails halfway thru, with no revert mechanism

            check_output_runner(f'conan cache restore "{args.pkg_location}" --format=json')
        )
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    restored_refs = sorted(pkg_out["Local Cache"])
    if not restored_refs:
        raise ConanException(f"Tarball '{args.pkg_location}' contains no packages")

    try:
        installed = install_packages(restored_refs, no_remote=True)
    except ConanException as e:
        # install_packages routes its failures through
        # handle_and_raise_conan_exception, so the diagnosis is already in `e`.
        # Add only what it cannot know about: which tarball was being installed
        # and what the restore left behind, so the user can clean up.
        raise ConanException(
            f"{e}\n\n"
            f"Failed to install from tarball '{args.pkg_location}'\n"
            f"References cached by the restore: {', '.join(restored_refs)}\n"
            "You may want to delete these references from the cache."
        ) from e

    if installed:
        cli_out_write("\n".join(installed))


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
        pkg_requiring_licenses = get_packages_requiring_license_acceptance(
            conan_api, args.references, args.no_remote
        )
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


def _get_recipe_info(conan_api: ConanAPI, reference: str, remotes=None) -> dict:

    if remotes is None:
        remotes = conan_api.remotes.list()

    def ensureList(x):
        return x if isinstance(x, (list, tuple)) else [x] if x is not None else []

    conanfile = None

    parsed_reference = RecipeReference.loads(reference)

    try:
        # Searching the first appearance between local cache and remotes
        # Note that this assumes that all the recipes on all remotes are the same
        # for a given reference, with no revisions
        for remote in [None] + remotes:
            try:
                recipe_ref = conan_api.list.latest_recipe_revision(
                    parsed_reference, remote
                )
                if recipe_ref is None:
                    # According to the documentation of latest_recipe_revision,
                    # return should be returned but that implementation changed a while ago.
                    # Adding this code in case the behavior is reverted back to previous one
                    # but as of conan 2.33, this will never be executed
                    # More info on: https://github.com/conan-io/conan/issues/20391
                    continue

            except (
                ConanReferenceDoesNotExistInDB,
                RecipeNotFoundException,
                NotFoundException,
            ) as e:
                # The recipe was not found on this remote (or local cache),
                # Let's try on the next one
                continue

            # Ensure the recipe is downloaded to the local cache
            # This will skip the download if the recipe is already in the local cache
            conan_api.download.recipe(recipe_ref, remote=remote)

            # Load recipe content
            export_path = conan_api.cache.export_path(recipe_ref)
            conanfile_path = conan_api.local.get_conanfile_path(".", export_path, False)

            # Not passing remotes nor lockfile because we are not using python_requires
            # on our recipes, which is the only use for it inside inspect
            conanfile = conan_api.local.inspect(conanfile_path, None, None)
            # break on first success (hopefully local cache)
            break
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    if conanfile is None:
        raise ConanException(f"Couldn't find the following packages: {reference}")

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

    # Check for LICENSE file in the export folder
    license_file_path = Path(export_path) / "LICENSE"
    if license_file_path.exists():
        # If the LICENSE file exists, we expect to be able to read it.
        # OSError here (permissions, I/O error) indicates an unexpected system state
        # that should be surfaced rather than silently ignored, as users rely on
        # this metadata for compliance and package selection decisions.
        license_text = license_file_path.read_text(encoding='utf-8')
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
    Returns metadata for one or more CFS packages in a single call.

    Accepts one or more package references in name/version format and writes a
    JSON array of package metadata, in the same order as the input references.
    The packages do not need to be installed.
    """
    subparser.add_argument(
        "references",
        nargs="+",
        help="CFS package references in name/version format",
    )
    args = parser.parse_args(*args)

    # Resolve remotes once so they are not re-fetched for every package.
    remotes = conan_api.remotes.list()

    try:
        pkg_infos = [
            _get_recipe_info(conan_api, normalize_reference(ref), remotes)
            for ref in args.references
        ]
    except Exception as e:
        handle_and_raise_conan_exception(e)

    cli_out_write(json.dumps(pkg_infos, indent=2))


@conan_subcommand()
def cfs_remote_refs(conan_api: ConanAPI, parser, subparser, *args):
    """
    Lists every package version in the given remotes, as name/version,
    without downloading recipes. Recipes are immutable (a change is a new
    version), so revisions are not listed: that would take one request per
    version instead of one per remote. A remote that cannot be listed is
    reported as {"error": message, "auth": bool}, where auth tells an
    authentication failure from any other failure.
    """
    subparser.add_argument("remotes", nargs="+", help="Remote names")
    args = parser.parse_args(*args)

    result = {}
    for name in args.remotes:
        try:
            listed = conan_api.list.select(
                ListPattern("*", rrev=None, only_recipe=True),
                remote=conan_api.remotes.get(name),
            ).serialize()
            result[name] = sorted(listed)
        except ConanException as e:
            # The helper words the error; one remote failing must not stop the others.
            try:
                handle_and_raise_conan_exception(e)
            except Exception as formatted:
                message = str(formatted)
                result[name] = {
                    "error": message,
                    "auth": "Authentication error" in message
                    or "Wrong user or password" in message,
                }

    cli_out_write(json.dumps(result))


@conan_subcommand()
def cfs_remote_pkg_info(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns the metadata of the latest recipe revision of each given
    reference from one remote, keyed by the references as given.
    """
    subparser.add_argument("remote", help="Remote name")
    subparser.add_argument(
        "references",
        nargs="+",
        help="References in name/version format (a #revision is ignored)",
    )
    args = parser.parse_args(*args)

    try:
        remotes = [conan_api.remotes.get(args.remote)]
        infos = {
            ref: _get_recipe_info(conan_api, ref.split("#")[0], remotes)
            for ref in args.references
        }
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    cli_out_write(json.dumps(infos))


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
    subparser.add_argument(
        "-nr",
        "--no-remote",
        "--offline",
        action="store_true",
        help="Resolve dependencies only from local cache and installed packages",
    )
    subparser.add_argument(
        "-u",
        "--unresolved",
        "--non-concrete",
        action="store_true",
        help="Show unresolved dependency requirements instead of concrete resolved versions",
    )
    args = parser.parse_args(*args)
    normalized_reference = normalize_reference(args.reference)

    try:
        # Build dependency graph for the requested package.
        # This is the primary source for transitive dependency edges.
        graph_cmd = (
            f'conan graph info --requires="{normalized_reference}" --format=json'
        )
        if args.no_remote:
            graph_cmd += " --no-remote"

        pkg_dict = json.loads(
            check_output_runner(graph_cmd)
        )
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    installed_versions: dict[str, str] = {}
    # Load installed versions once so range dependencies can prefer already
    # installed compatible versions over newly resolved concrete versions.
    for installed_ref in get_installed_packages():
        name, version = split_recipe_ref(installed_ref)
        installed_versions[name] = version

    graph_nodes = pkg_dict["graph"]["nodes"]

    for info in graph_nodes.values():
        if info["ref"] == "conanfile":
            # The first node is the conanfile, which should be the same that the requested package,
            # since we only requested one package, but just in case lets skip it
            continue

        if info["label"] in {args.reference, normalized_reference}:
            dependencies = []
            seen = set()
            for dep_node_id, dep in info["dependencies"].items():
                dep_node = graph_nodes.get(dep_node_id, {})
                # Convert each dependency edge to output form according to
                # unresolved/offline flags and installed-version preference.
                dep_ref = _dependency_output_ref(
                    dep,
                    dep_node.get("ref"),
                    installed_versions,
                    unresolved=args.unresolved,
                    no_remote=args.no_remote,
                )
                if dep_ref and dep_ref not in seen:
                    seen.add(dep_ref)
                    dependencies.append(dep_ref)

            if dependencies:
                cli_out_write("\n".join(dependencies))


@conan_subcommand()
def cfs_dependencies_batch(conan_api: ConanAPI, parser, subparser, *args):
    """
    Returns the dependency closure of each of several packages at once.

    Same result as running `cfs dependencies` per reference, but resolves every
    requested package as a root of a single dependency graph, so the whole batch
    costs one `conan graph info` instead of one per package. Writes a JSON object
    mapping each requested reference to its list of dependencies.

    Note that resolving the roots together also resolves version conflicts
    between them, which per-reference resolution cannot see. For callers that
    install the whole set as a unit this matches what the install will actually
    do, but it means a conflict between two requested packages fails the batch
    rather than yielding two individually-valid answers.
    """
    subparser.add_argument(
        "references",
        nargs="+",
        help="CFS package references in name/version format",
    )
    subparser.add_argument(
        "-nr",
        "--no-remote",
        "--offline",
        action="store_true",
        help="Resolve dependencies only from local cache and installed packages",
    )
    subparser.add_argument(
        "-u",
        "--unresolved",
        "--non-concrete",
        action="store_true",
        help="Show unresolved dependency requirements instead of concrete resolved versions",
    )
    args = parser.parse_args(*args)

    # Preserve the caller's spelling as the output key, so the caller does not
    # have to reproduce our normalization to look results up.
    normalized_by_requested = {
        reference: normalize_reference(reference)
        for reference in args.references
    }

    try:
        requires = " ".join(
            f'--requires="{normalized}"'
            for normalized in normalized_by_requested.values()
        )
        graph_cmd = f"conan graph info {requires} --format=json"
        if args.no_remote:
            graph_cmd += " --no-remote"

        pkg_dict = _run_graph_info(graph_cmd)
    except ConanException as e:
        handle_and_raise_conan_exception(e)

    # A failed graph is reported as data rather than a non-zero exit, because
    # exiting non-zero would make the caller discard this output and see only
    # the message on stderr.
    graph_error = pkg_dict["graph"].get("error")
    if graph_error:
        cli_out_write(
            json.dumps({"dependencies": {}, "error": graph_error}, indent=2)
        )
        return

    installed_versions: dict[str, str] = {}
    # Load installed versions once so range dependencies can prefer already
    # installed compatible versions over newly resolved concrete versions.
    for installed_ref in get_installed_packages():
        name, version = split_recipe_ref(installed_ref)
        installed_versions[name] = version

    graph_nodes = pkg_dict["graph"]["nodes"]

    # Index the graph by label once, rather than rescanning it per requested
    # reference. The synthetic root that aggregates the --requires arguments is
    # not a package and is skipped.
    node_by_label = {}
    for info in graph_nodes.values():
        if info["ref"] == "conanfile":
            continue
        node_by_label.setdefault(info["label"], info)

    result: dict[str, list[str]] = {}

    for requested, normalized in normalized_by_requested.items():
        info = node_by_label.get(requested) or node_by_label.get(normalized)

        dependencies = []
        if info is not None:
            seen = set()
            for dep_node_id, dep in info["dependencies"].items():
                dep_node = graph_nodes.get(dep_node_id, {})
                # Convert each dependency edge to output form according to
                # unresolved/offline flags and installed-version preference.
                dep_ref = _dependency_output_ref(
                    dep,
                    dep_node.get("ref"),
                    installed_versions,
                    unresolved=args.unresolved,
                    no_remote=args.no_remote,
                )
                if dep_ref and dep_ref not in seen:
                    seen.add(dep_ref)
                    dependencies.append(dep_ref)

        # Always emit a key per requested reference, so an absent package is
        # reported as "no dependencies" rather than silently missing from the
        # response.
        result[requested] = dependencies

    cli_out_write(json.dumps({"dependencies": result, "error": None}, indent=2))


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
        pkg_requiring_licenses = get_packages_requiring_license_acceptance(conan_api, pkg_refs_to_check, args.no_remote)

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
        handle_and_raise_conan_exception(e)


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
        handle_and_raise_conan_exception(e)


def _remove_finalize_folders(conan_api: ConanAPI, pkg: str):
    """
    On Windows, delete the finalize() folders of pkg using extended-length paths.
    finalize() may run a git checkout with paths beyond MAX_PATH, which `conan remove` cannot delete.
    """
    if os.name != "nt":
        return
    for _, prefs in conan_api.list.select(ListPattern(f"{pkg}#*:*#*")).items():
        for pref in prefs:
            folder = conan_api.cache.package_path(pref)
            # package_path() returns the finalize folder ("f") when it exists
            if os.path.basename(folder) == "f":
                shutil.rmtree("\\\\?\\" + os.path.abspath(folder),
                              onerror=lambda func, path, _: (os.chmod(path, stat.S_IWRITE), func(path)))


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
        # Command-specific error handling for "not found" patterns
        if isinstance(e, ConanException):
            error_msg = str(e)
            if ("Recipe" in error_msg and "not found" in error_msg) or \
               ("not found" in error_msg) or \
               ("argument" in error_msg.lower() and ("invalid" in error_msg.lower() or "empty" in error_msg.lower())):
                raise ConanException(f"No local packages found matching pattern '{args.pattern}' to delete.")
        # Generic error transformation (or re-raise if not matched)
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
            _remove_finalize_folders(conan_api, pkg)
            # Use conan remove command directly to handle revisions automatically
            check_output_runner(f'conan remove "{pkg}" -c')
            deleted.append(pkg)
        except Exception as e:
            handle_and_raise_conan_exception(e)

    # Output the deleted packages for the caller
    if deleted:
        cli_out_write("\n".join(deleted))

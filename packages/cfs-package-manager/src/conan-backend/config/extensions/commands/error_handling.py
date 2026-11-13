"""

Copyright (c) 2026 Analog Devices, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This module classifies Conan CLI errors and transforms them into user-friendly
messages. Error patterns are defined as data structures to make them easy to
test and maintain.
"""

import re
from dataclasses import dataclass
from typing import Callable, Pattern, List, Dict

from conan.errors import ConanException


# ============================================================================
# Constants
# ============================================================================

# Common error message that Conan prepends to many errors
ERROR_PREFIX_PATTERN = re.compile(r".*ERROR: (.*)", re.DOTALL)


# ============================================================================
# Data Structures
# ============================================================================

@dataclass
class ErrorPattern:
    """
    Defines how to recognize and format a specific type of Conan error.

    Attributes:
        name: Identifier for this error type (for debugging/logging)
        pattern: Compiled regex that matches this error
        extractor: Function that extracts structured data from matches
        formatter: Function that creates user-friendly message from data
    """
    name: str
    pattern: Pattern
    extractor: Callable[[List[str]], Dict]
    formatter: Callable[[Dict], str]


# ============================================================================
# Error Pattern Definitions
# ============================================================================

ERROR_PATTERNS = [
    ErrorPattern(
        name="authentication_error",
        pattern=re.compile(r"Conan interactive mode disabled(?:\. \[Remote: (.+)\])?"),
        extractor=lambda matches: {'remotes': [m for m in matches if m and m != ""]},
        formatter=lambda data: (
            "\n".join(f"Authentication error on remote '{remote}'" for remote in data['remotes'])
            if data['remotes']
            else "Authentication error"
        )
    ),

    # Must precede missing_prebuilt_package: Conan reports a platform mismatch
    # as a generic missing binary, so the more specific case has to match first.
    # Quotes may be backslash-escaped, since Conan embeds a bytes repr of the
    # subprocess output in the message.
    ErrorPattern(
        name="binary_platform_mismatch",
        pattern=re.compile(
            r"Can\\?'t find a \\?'([^'\\]+)\\?' package binary"
            r".*?for the configuration:.*?os=(\w+)",
            re.DOTALL
        ),
        extractor=lambda matches: {
            'packages': list(dict.fromkeys(ref for ref, _ in matches)),
            'os': matches[0][1]
        },
        formatter=lambda data: (
            f"No binaries built for os={data['os']} are available for: "
            f"{', '.join(data['packages'])}\n"
            "These packages were built for a different operating system."
        )
    ),

    # Restore-time counterpart to binary_platform_mismatch: a tarball built
    # on another OS can contain a file name illegal on this one (observed
    # trigger: "::" in a Linux Perl man page name, illegal on Windows).
    # Python's tarfile raises a bare OSError partway through extraction,
    # with no rollback, so the path it failed on is the only diagnostic
    # information available.
    #
    # [Errno 22] Invalid argument is a generic EINVAL, not specific to this
    # failure, and handle_and_raise_conan_exception is called from many
    # unrelated commands - so this requires "tarfile.py" to appear earlier
    # in the same traceback, tying the error to Python's tar extraction
    # code specifically and not to some other EINVAL (e.g. a locked file
    # or a reserved device name hit during an unrelated write).
    ErrorPattern(
        name="illegal_filename_restore",
        pattern=re.compile(
            r"tarfile\.py.*?(?:OSError|ERROR): \[Errno 22\] Invalid argument: '([^']+)'",
            re.DOTALL
        ),
        # Doubled backslashes are a repr() artifact of the bytes
        # the subprocess output was wrapped in, not a real UNC path.
        extractor=lambda matches: {'path': matches[0].replace('\\\\', '\\')},
        formatter=lambda data: (
            "Cannot restore this tarball: it contains a file name that is "
            f"not valid on this operating system:\n  {data['path']}\n"
            "This usually means the tarball was built for a different "
            "operating system. The cache may now hold a partial extraction "
            "of this package; you may want to delete it."
        )
    ),

    ErrorPattern(
        name="missing_prebuilt_package",
        pattern=re.compile(r"Missing prebuilt package for '([^']+)'", re.DOTALL),
        extractor=lambda matches: {'packages': matches},
        formatter=lambda data: (
            f"The following packages are not available and cannot be installed: {', '.join(data['packages'])}"
        )
    ),

    ErrorPattern(
        name="package_not_found",
        pattern=re.compile(
            r"Unable to find '([^']+)' in remotes|"
            r"([^\s:]+): Not found in local cache, looking in remotes|"
            r"Package '([^']+)' not found"
        ),
        extractor=lambda matches: {
            # Flatten tuple matches from alternation, normalize bracket syntax, and deduplicate
            'packages': list(dict.fromkeys(
                re.sub(r'\[([^\]]+)\]', r'\1', m)  # Strip brackets from version ranges
                for match in matches for m in match if m
            ))
        },
        formatter=lambda data: (
            f"Couldn't find the following packages: {', '.join(data['packages'])}"
        )
    ),

    ErrorPattern(
        name="version_range_unresolved",
        pattern=re.compile(r"Package '([^']+)' not resolved: Version range"),
        extractor=lambda matches: {
            # Strip bracket syntax from version ranges for cleaner output
            'packages': [re.sub(r'\[([^\]]+)\]', r'\1', ref) for ref in matches]
        },
        formatter=lambda data: (
            f"No versions found matching the specified range for: {', '.join(data['packages'])}"
        )
    ),

    ErrorPattern(
        name="no_remote_defined",
        pattern=re.compile(r"Package '([^']+)' not resolved.*No remote", re.DOTALL),
        extractor=lambda matches: {
            'package': re.sub(r'\[([^\]]+)\]', r'\1', matches[0]) if matches else None
        },
        formatter=lambda data: (
            f"Package {data['package']} not resolved: No remote defined"
        )
    ),

    ErrorPattern(
        name="version_conflict",
        pattern=re.compile(
            r"Version conflict: Conflict between ([^\s]+)/(\[[^\]]+\]|[^\s]+) and ([^\s]+)/([^\s]+) in the graph(?:.*Conflict originates from ([^\n]+))?",
            re.DOTALL
        ),
        extractor=lambda matches: {
            'package_name': matches[0][0] if matches else None,
            'required_version': matches[0][1].strip('[]') if (matches and matches[0][1]) else None,  # Strip brackets if present
            'conflicting_version': matches[0][3] if matches else None,
            # Strip both actual CR bytes and escaped \r sequences from source package
            'source_package': matches[0][4].rstrip('\r').replace('\\r', '') if (matches and len(matches[0]) > 4 and matches[0][4]) else None
        },
        formatter=lambda data: (
            f"Version conflict detected for package '{data['package_name']}':\n"
            + (f"  - {data['source_package']} requires version: {data['required_version']}\n" if data.get('source_package') else f"  - A package requires version: {data['required_version']}\n")
            + f"  - But version {data['conflicting_version']} is already installed or explicitly requested\n"
            + f"\nTo resolve this conflict:\n"
            f"  1. Update '{data['package_name']}' to version {data['required_version']}, or\n"
            f"  2. Uninstall the conflicting version and let the package manager choose compatible versions\n"
            f"\nFor automatic resolution, try uninstalling '{data['package_name']}' first, "
            f"then reinstall your desired packages."
        )
    ),
]


# ============================================================================
# Helper Functions
# ============================================================================

def _extract_error_message(exception: Exception) -> str:
    """
    Safely extract error message from any exception type.

    Handles edge cases like empty args, non-string messages, or unusual
    exception construction. Always returns a string.

    Args:
        exception: Any exception instance

    Returns:
        The exception's message as a string
    """
    # Try standard string conversion first (works for all exceptions)
    try:
        msg = str(exception)
        if msg:
            return msg
    except Exception:
        pass

    # Fallback to args if available
    try:
        if hasattr(exception, 'args') and len(exception.args) > 0:
            first_arg = exception.args[0]
            if isinstance(first_arg, str):
                return first_arg
            return str(first_arg)
    except Exception:
        pass

    # Last resort - use repr
    return repr(exception)


def _normalize_error_message(message: str) -> str:
    """
    Normalize Conan error message format.

    - Converts escaped newlines to real newlines
    - Removes carriage returns (both actual CR bytes and Python escape sequences)
    - Unescapes quotes

    Conan embeds a repr() of the subprocess output in the message. When that
    output contains both quote characters, repr() delimits with single quotes
    and backslash-escapes every apostrophe, which stops the quote-delimited
    patterns below from matching.

    Args:
        message: Raw error message from Conan

    Returns:
        Normalized message ready for pattern matching
    """
    # Convert escaped newlines to actual newlines, remove actual CR bytes
    message = message.replace("\\n", "\n").replace("\r", "")

    # Remove escaped CR sequences that appear at line boundaries (e.g., "...\\r\\n" or "...\\r$")
    # Use a regex to only remove \\r when followed by \\n or end-of-string
    # This preserves Windows paths like "C:\\repo" while cleaning line endings
    message = re.sub(r'\\r(?=\\n|$)', '', message)

    # Unescape quotes left behind by repr(). Done after the CR handling above
    # so the "C:\\repo" path case is unaffected.
    return message.replace("\\'", "'").replace('\\"', '"')


def _strip_error_prefix(message: str) -> str:
    """
    Reduce a message to the text following its last "ERROR: " marker.

    Args:
        message: Normalized error message from Conan

    Returns:
        The trailing error text, or the message unchanged if no marker is found
    """
    match = ERROR_PREFIX_PATTERN.findall(message)
    if len(match) == 1:
        return match[0]

    return message


# ============================================================================
# Public API
# ============================================================================

def handle_and_raise_conan_exception(exception: Exception) -> None:
    """
    Classify Conan errors and re-raise with user-friendly messages.

    This function analyzes Conan CLI error output, matches it against known
    patterns, extracts relevant information (package names, remotes, etc.),
    and re-raises with a clear, actionable message.

    If no pattern matches, the original exception is re-raised unchanged.
    This allows new error types to surface naturally.

    Args:
        exception: Exception from Conan CLI execution

    Raises:
        ConanException: Always raises, with improved or original message

    Example:
        >>> try:
        ...     check_output_runner("conan install bad/1.0")
        ... except ConanException as e:
        ...     handle_and_raise_conan_exception(e)
        ConanException: Couldn't find the following packages: bad/1.0
    """
    # Extract and normalize the error message
    error_msg = _extract_error_message(exception)
    error_msg = _normalize_error_message(error_msg)

    # Match against the full message first, so patterns can reach detail that
    # precedes the last "ERROR: " marker (such as the host profile settings).
    # Fall back to the trailing error text, which is what earlier revisions
    # matched against, to keep previously recognised errors recognised.
    candidates = [error_msg]
    stripped_msg = _strip_error_prefix(error_msg)
    if stripped_msg != error_msg:
        candidates.append(stripped_msg)

    # Try each known error pattern
    for pattern_def, candidate in (
        (p, c) for c in candidates for p in ERROR_PATTERNS
    ):
        matches = pattern_def.pattern.findall(candidate)

        if matches:
            try:
                # Extract structured data
                data = pattern_def.extractor(matches)

                # Format user-friendly message
                user_message = pattern_def.formatter(data)

                # Re-raise with improved message, preserving original as cause
                raise ConanException(user_message) from exception

            except ConanException:
                # This is the expected re-raise from above
                raise

            except Exception as processing_error:
                # Pattern matched but processing failed - this indicates a bug
                # in our pattern definitions. Log it but don't crash.
                import sys
                print(
                    f"Warning: Error pattern '{pattern_def.name}' matched "
                    f"but failed to process: {processing_error}",
                    file=sys.stderr
                )

    # No pattern matched - re-raise original exception unchanged
    # This is intentional: it surfaces new error types we haven't seen before
    raise

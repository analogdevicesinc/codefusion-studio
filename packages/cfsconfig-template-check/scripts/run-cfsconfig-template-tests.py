#!/usr/bin/env python3

# Copyright (c) 2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
run-cfsconfig-template-tests - creates projects using cfsutil and runs various tests on cfsconfig files

Type --help option for command-line arguments. Run this program from cfsutil terminal.
"""

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
import traceback

import config_validator
from simple_test_utils import subprocess_run, ConsoleLogger, FileLogger


class TestEntry:
    def __init__(self, chip, package, board, plugin_id, plugin_directory):
        self.chip = chip
        self.package = package
        self.board = board
        self.plugin_id = plugin_id
        self.plugin_directory = plugin_directory


# Primary core from data model.
def detect_primary_core(entry, args, logger):
    try:
        model_fname = os.path.join(args.datamodel_path, entry.chip.lower() + "-" + entry.package.lower() + ".json")
        with open(model_fname) as f:
            model = json.load(f)
        primary_cores = [core["Id"] for core in model["Cores"] if core.get("IsPrimary", False)]
        if len(primary_cores) != 1:
            raise Exception('Primary cores.')
        return primary_cores[0]
    except Exception:
        logger.error(f"Failed to detect primary core from the data model {model_fname}. Data model is incorrect or missing. Falling back to CM4.")
        return "CM4"


# Test which creates a project.
def create_test(entry, args, logger):
    cfsutil_prefix = ['cfsutil']
    if args.cfsutil_runner is not None:
        cfsutil_prefix = ['node', args.cfsutil_runner]
    cfsutil_postfix = []
    for path in args.cfsutil_search:
        cfsutil_postfix = cfsutil_postfix + ['-s', path]
    if not entry.plugin_id.startswith("com.analog.project."):
        subprocess_args = cfsutil_prefix + ["workspace", "create", "-o", args.tmp_directory, "--name", entry.entry_name,
          "--soc", entry.chip, "--board", entry.board, "--package", entry.package.upper(),
          "--template-id", entry.plugin_id] + cfsutil_postfix
        return subprocess_run(subprocess_args, args, logger, True) == 0
    else:
        primary_core = detect_primary_core(entry, args, logger)
        configure_fname = os.path.join(args.tmp_directory, entry.entry_name + "_test_cfsworkspace.json")
        configure_args = cfsutil_prefix + ["workspace", "configure", "-w", configure_fname,
          "-o", args.tmp_directory, "--name", entry.entry_name,
          "--soc", entry.chip, "--board", entry.board, "--package", entry.package.upper(),
          "--core", primary_core, "--template-id", entry.plugin_id] + cfsutil_postfix
        if subprocess_run(configure_args, args, logger, True) != 0:
            return False
        create_args = cfsutil_prefix + ["workspace", "create", "-w", configure_fname] + cfsutil_postfix
        if subprocess_run(create_args, args, logger, True) != 0:
            return False
        if not args.keep_directories:
            os.remove(configure_fname)
        return True


# Test which validates cfsconfig.
def config_validation_test(entry, args, logger):
    cfsconfig_path = os.path.join(entry.project_directory, ".cfs")
    cfsconfig = [x for x in os.listdir(cfsconfig_path) if x.endswith("cfsconfig")]
    if len(cfsconfig) != 1:
        raise Exception(f"Exactly one cfsconfig should be in {entry.project_directory}, found {len(cfsconfig)}. "
            + "This typically means that corresponding templates/<chip>/<chip>_<board>.cfsconfig.eta file is missing.")
    cfsconfig_fname = os.path.join(cfsconfig_path, cfsconfig[0])
    config_validator.validate_config(cfsconfig_fname, args.datamodel_path, args.project_fname_map, args.validation_config, logger)
    return logger.empty


tests = {
    "create": create_test,
    "validate_config": config_validation_test,
}


# returns a list of TestEntry objects for all supported combinations
def scan_project_directory_return_combinations(args):
    res = []
    fname_map, directory_map = config_validator.get_plugin_id_to_fname_map(args.plugin_path)
    project_fname_map = dict(fname_map)
    # Plugins listed in base_plugin_path are not checked themselves, but can be referenced from other plugins.
    for base_path in args.base_plugin_path:
        base_map, _ = config_validator.get_plugin_id_to_fname_map(base_path)
        project_fname_map = base_map | project_fname_map
    args.project_fname_map = project_fname_map
    for plugin_id, fname in fname_map.items():
        try:
            with open(fname) as file:
                tree = json.loads(file.read())
            for item in tree.get("supportedSocs", []):
                if "board" in item and "package" in item:
                    res.append(TestEntry(item["name"], item["package"], item["board"], plugin_id, directory_map[plugin_id]))
        except Exception:
            print("Could not read", fname)
            raise
    return sorted(res, key=lambda x: (x.plugin_directory, x.chip, x.board, x.plugin_id))


# Get arguments from command line
def get_arguments():
    parser = argparse.ArgumentParser(
        description="Test for creating projects using cfsutil and testing them",
        epilog="It should be run from cfs terminal, which uses double quotes.\n"
        + "All regexps use fullmatch, so valid example for cfs terminal is:\n"
        + 'python packages\\cfsconfig-template-check\\scripts\\run-cfsconfig-template-tests.py --chips "MAX32650" --datamodel-path packages\\cfs-data-models\\socs '
        + "--plugin-path C:\\my\\v\\cfs-plugins\\plugins --validation-config C:\\my\\v\\cfs-plugins\\tests\\unit-tests\\python\\validation_config.json\n"
        + "--datamodel-path is mandatory.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    filter_group = parser.add_argument_group("Filters")
    filter_group.add_argument("--boards", help="Regexp to filter boards.")
    filter_group.add_argument("--chips", help="Regexp to filter chips.")
    filter_group.add_argument("--plugin-id-filter", help="Regexp to filter plugins in the form of their ids, e.g., com.analog.singlecore.msdk.helloworld")
    filter_group.add_argument("--plugin-filter", help="Regexp to filter plugins in the form of their directories, e.g., msdk-single-core-hello-world")
    filter_group.add_argument("--tests", help="Comma separated tests like: " + ",".join(tests.keys()) + ' By default, all tests are executed.')

    input_group = parser.add_argument_group("Input")
    input_group.add_argument("--base-plugin-path", action='append', default=[],
                             help="Additional path(s) to a plugins directory (e.g. base cfs-plugins/plugins) whose .cfsplugin files "
                             + "are needed only to resolve primary/secondary plugin ids referenced by generated cfsconfigs during "
                             + "validation. These base plugins are not tested themselves. May be given multiple times.")
    input_group.add_argument("--cfsutil-search", action='append', default=[], help="Search paths (may be multiple) to give to cfsutil. "
                            + "Usually path to plugins and path to data models are used in github actions.")
    input_group.add_argument("--cfsutil-runner", help="If this parameter is not given, cfsutil is called as 'cfsutil' (to run from cfs terminal on PC). "
                            +"If it is given, cfsutil is run as 'node RUNNER' (on github actions, for example, codefusion-studio/packages/cli/bin/run).")
    input_group.add_argument("--datamodel-path", help="Path to data models.")
    input_group.add_argument("--plugin-path", help="Path to actual place with plugins")
    input_group.add_argument("--validation-config", help="Path to the validation_config.json")

    output_group = parser.add_argument_group("Output")
    output_group.add_argument("--console", action="store_true", help="Output into terminal, rather than file. Subprocesses output in real time.")
    output_group.add_argument("--keep-directories", action="store_true", help="Do not delete project directories.")
    output_group.add_argument("--verbose", action="store_true", help="Also store output for successful tests (also for subprocesses).")
    output_group.add_argument("--result-directory", help="Directory where output of subprocesses are saved.", default="test_output")

    special_group = parser.add_argument_group("Special")
    special_group.add_argument("--consistency", action="store_true", help="Check consistency between directories and cfsplugins in each project " +
                               "and exit without any testing.")
    special_group.add_argument("--list", action="store_true", help="Output the whole list of tests and exit without any testing.")
    special_group.add_argument("--tmp-directory", help="Obsolete parameter. Has no effect.")

    res = parser.parse_args()
    if res.datamodel_path is None:
        raise Exception('datamodel-path must be given')
    if res.plugin_path is None:
        raise Exception('plugin-path must be given')
    if res.validation_config is None:
        raise Exception('validation-config must be given')
    print("Running tests with settings:", vars(res))
    return res


# Helper of filter_entries()
def filter_regexp(arr, pattern, prop):
    if pattern is None:
        return arr
    prog = re.compile(pattern)
    return [x for x in arr if prog.fullmatch(prop(x))]


# Filter test entries according to the command line.
def filter_entries(entries, args):
    res = entries
    res = filter_regexp(res, args.chips, lambda x: x.chip)
    res = filter_regexp(res, args.boards, lambda x: x.board)
    res = filter_regexp(res, args.plugin_filter, lambda x: x.plugin_directory)
    res = filter_regexp(res, args.plugin_id_filter, lambda x: x.plugin_id)
    return res


# Sidecar functionality which prints unused "hanging" directories. Plenty hacks here, for example startswith("MAX").
def consistency(entries, args):
    normalization_map = {"MAX32675": "MAX32675C", "MAX32665": "MAX32666", "MAX32658": "MAX32657"}
    normalize_name = lambda x: normalization_map.get(x.upper(), x.upper())
    listed_map = {}
    for e in entries:
        listed_map.setdefault(e.plugin_directory, set()).add(normalize_name(e.chip))
    for directory in sorted(list(listed_map.keys())):
        cfsplugin_set = listed_map[directory]
        template_set = set()
        try:
            template_path = os.path.join(args.plugin_path, directory, "templates")
            for x in os.listdir(template_path):
                if os.path.isdir(os.path.join(template_path, x)) and x.upper().startswith("MAX"):
                    template_set.add(normalize_name(x))
        except Exception as e:
            print(f"Directory: {directory}. An error occurred: {e}")
        if cfsplugin_set != template_set:
            print(directory)
            print("Only cfsplugin:", " ".join(sorted(list(cfsplugin_set - template_set))))
            print("Only directories:", " ".join(sorted(list(template_set - cfsplugin_set))))
            print("Common:", " ".join(sorted(list(template_set & cfsplugin_set))))
        else:
            print(directory, "- ok")
        print()


#Helper of utilities()
def statistics(comment, array):
    mp = {}
    for x in array:
        mp[x] = mp.get(x, 0) + 1
    mp = sorted(list(mp.items()), key=lambda x: (-x[1], x[0]))
    print()
    print("Statistics by", comment)
    for x in mp:
        print(x[0], "-", x[1])


# Two sidecar functionalities here: --list and --consistency
def utilities(entries, args):
    if args.list:
        for x in entries:
            print(x.plugin_directory, x.chip, x.board, x.plugin_id)
        statistics("by plugin", [x.plugin_directory for x in entries])
        statistics("by chip", [x.chip for x in entries])
        print()
        print("In total", len(entries))
        sys.exit(0)
    if args.consistency:
        consistency(entries, args)
        sys.exit(0)


# Checks and normalizes list of tests.
def test_list(args):
    test_keys = tests.keys()
    if args.tests is not None:
        test_keys = args.tests.split(",")
        for x in test_keys:
            if x not in tests:
                raise Exception("Unknown test " + x)
    return ["create"] + [x for x in test_keys if x != "create"]


# Helper of perform_tests() - output of summary.
def output_statistics_by_test_type(res, comment, result_directory):
    sm = 0
    for k in sorted(res.keys()):
        print(len(res[k]), k, "tests", comment)
        with open(os.path.join(result_directory, f"1_{comment}_{k}_tests.txt"), "w") as f:
            print("\n".join(res[k]), file=f)
        sm = sm + len(res[k])
    return sm


# Actual test run, entries are prepared and filtered.
def perform_tests(entries, args):
    args.tmp_directory = tempfile.mkdtemp()
    try:
        test_keys = test_list(args)
        succeeded_tests = {}
        failed_tests = {}
        for current_number, entry in enumerate(entries):
            raw_name = entry.plugin_directory + "_" + entry.chip + "_" + entry.board
            # cfsutil only accepts letters, numbers, underscores, periods and hyphens in the
            # workspace name, so replace any other character (e.g. the space in board "FPGA 2.0.x").
            entry.entry_name = ''.join(c if ((c.isascii() and c.isalnum()) or c in "_.-") else "_" for c in raw_name)
            entry.project_directory = os.path.join(args.tmp_directory, entry.entry_name)
            if args.verbose:
                print()
                print(current_number + 1, "of", len(entries), entry.entry_name)
            else:
                print(current_number + 1, "of", len(entries), entry.entry_name, end=' ', flush=True)
            all_passed = True
            for current_test in test_keys:
                test_name = entry.entry_name + "_" + current_test
                if args.verbose:
                    print(test_name)
                if args.console:
                    logger = ConsoleLogger()
                else:
                    logger = FileLogger(os.path.join(args.result_directory, test_name + ".txt"))
                try:
                    res = tests[current_test](entry, args, logger)
                except Exception as e:
                    logger.error(traceback.format_exc())
                    logger.error(str(e))
                    res = False
                if res:
                    succeeded_tests.setdefault(current_test, []).append(test_name)
                else:
                    failed_tests.setdefault(current_test, []).append(test_name)
                    all_passed = False
                    if current_test == "create":
                        break  # The 'create' test failed; skip remaining tests for this entry
            if all_passed:
                print("- PASSED")
            else:
                print("- FAILED")
            if not args.keep_directories:
                shutil.rmtree(entry.project_directory, ignore_errors=True)
        print()
        sum_succeeded = output_statistics_by_test_type(succeeded_tests, "succeeded", args.result_directory)
        sum_failed = output_statistics_by_test_type(failed_tests, "failed", args.result_directory)
        print()
        print(f"In total {sum_succeeded} tests succeeded", end="")
        if sum_failed > 0:
            print(f", {sum_failed} tests failed", end="")
        print(f". See directory {args.result_directory}")
        return sum_failed == 0 and sum_succeeded > 0
    finally:
        if args.keep_directories:
            print(f'Please explore created projects in the directory {args.tmp_directory}')
        else:
            shutil.rmtree(args.tmp_directory, ignore_errors=True)


# Small preparation
def prepare(args):
    # It is assumed that if one wants to keep older results, one copies directories. Re-creating unconditionally.
    if os.path.isdir(args.result_directory):
        for fname in os.listdir(args.result_directory):
            full_name = os.path.join(args.result_directory, fname)
            if os.path.isfile(full_name) and full_name.endswith('.txt'):
                os.remove(full_name)
    os.makedirs(args.result_directory, exist_ok=True)


#Entry point
def main():
    args = get_arguments()
    entries = scan_project_directory_return_combinations(args)
    entries = filter_entries(entries, args)
    utilities(entries, args)
    prepare(args)
    success = perform_tests(entries, args)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()

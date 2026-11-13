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
config_validator - validates cfsconfig file according to the datamodel.

The entry point is validate_config(). See comments there.
The module can also be run as a standalone program. Type --help option for command-line arguments.
"""

import argparse
import json
import os
import re
import sys

import simple_test_utils


# Filters addedControls,modifiedControls etc. by chip and transforms to dict
def parse_control_lists(tree, chip):
    result = {}
    for section_key, section_value in tree.items():  # Over addedControls, modifiedControls, etc.
        cur_res = {}
        for control in section_value:  # Over TX_RX_MODES, CHAR_SIZE, etc.
            if "partRegexp" in control and not re.fullmatch(control["partRegexp"], chip):
                continue
            cur_res[control["Id"]] = control
        result[section_key] = cur_res
    return result


# Extracts information on a peripheral for a given chip from the plugin and converts certain structures to maps
def extract_control_list_from_plugin(plugin, chip, periph_name, category):
    all_peripherals = plugin.get("properties", {}).get(category, {})
    for key, value in all_peripherals.items():  # Over "UART0", "I2C", etc
        if re.fullmatch(key, periph_name):
            return parse_control_lists(value, chip)
    return {}


def extract_peripheral_from_model(model, periph_name):
    model_control_list = model.get("Controls", {}).get(periph_name, [])
    return {x["Id"]: x for x in model_control_list}


def extract_clocknode_dict(model):
    clocknode_list = model.get("ClockNodes", [])
    return {x["Name"]: x for x in clocknode_list}


def extract_peripherals_and_their_signals_from_model(model):
    result = {}
    for peripheral in model.get("Peripherals", []):
        sig_set = set()
        for signal in peripheral.get("Signals", []):
            sig_set.add(signal["Name"])
        result[peripheral["Name"]] = sig_set
    return result


def get_signal_info(model_pin_map, pin_name, peri_name, sig_name):
    for current_signal_info in model_pin_map.get(pin_name, {}).get("Signals", []):
        if current_signal_info.get("Peripheral", "") == peri_name and current_signal_info.get("Name", "") == sig_name:
            return current_signal_info
    return None


def create_config_pin_map(config, model_pin_map, logger):
    pins_used = set()
    pin_keys = set(["Peripheral", "Pin", "Signal"])
    result = {}
    for pin in config.get("Pins", []):
        if set(pin.keys()) != pin_keys:
            logger.error("Cannot read Pins. Pins are not checked")
            return {}
        signal_info = get_signal_info(model_pin_map, pin["Pin"], pin["Peripheral"], pin["Signal"])
        is_input_tap = signal_info is not None and signal_info.get('IsInputTap', False)
        if not is_input_tap: # if signal is marked as IsInputTap, it does not conflict with all other signals
            if pin["Pin"] in pins_used:
                logger.error(pin["Pin"], "- pin conflict.", pin)
            pins_used.add(pin["Pin"])
        peripheral_signal_key = (pin["Peripheral"], pin["Signal"])
        if peripheral_signal_key in result:
            logger.error(pin["Peripheral"], pin["Signal"], "- duplicate peripheral/signal entry.", pin)
            continue
        result[peripheral_signal_key] = pin["Pin"]
    return result


def create_model_pin_map(model, logger):
    try:
        if len(model["Packages"]) != 1:
            raise Exception('Length')
        return {x["Name"]: x for x in model["Packages"][0].get("Pins", [])}
    except Exception:
        logger.error("Model must have exactly one package with pins. Each pin must have name. Pins are not checked. Failed to load pins.")
        return {}


# Check that the control can be present
def validate_existence(periph_name, config_control_key, model_control_dict, plugin_info, logger):
    if config_control_key in plugin_info.get("removedControls", {}):
        logger.error(periph_name, config_control_key, "- the control is in removedControls.")
        return False
    if config_control_key in model_control_dict and config_control_key in plugin_info.get("addedControls", {}):
        logger.error(periph_name, config_control_key, "The control is both in data model and addedControls. This is a problem of cfsplugin, not template.")
        return False
    if config_control_key in plugin_info.get("addedControls", {}):
        return True
    if "supportedControls" in plugin_info and config_control_key not in plugin_info["supportedControls"]:
        logger.error(periph_name, config_control_key, "- supportedControls is present, but the control is not there.")
        return False
    if config_control_key not in model_control_dict:
        logger.error(periph_name, config_control_key, "- the control does not exist for the peripheral. Controls in the model:",
            " ".join(sorted(model_control_dict.keys())), "Added controls:", " ".join(sorted(plugin_info.get("addedControls", {}).keys())))
        return False
    return True


# Combine fields for the control from the data model and plugin project, assuming its existence is validated
def combine_model_and_plugin(model_control_dict, plugin_info, config_control_key):
    if config_control_key in plugin_info.get("addedControls", {}):
        return plugin_info["addedControls"][config_control_key]
    else:
        return model_control_dict[config_control_key] | plugin_info.get("modifiedControls", {}).get(config_control_key, {})


def int_or_hex_string(val):
    if isinstance(val, int):
        return val
    elif isinstance(val, str) and val.lower().startswith('0x'):
        return int(val[2:], 16)
    elif isinstance(val, str):
        return int(val)
    else:
        raise Exception()


# Validate value according to it description (combined_control is a combination of the data model and plugin)
def validate_value(periph_name, config_control_key, combined_control, value, logger):
    typ = combined_control.get("Type", "")
    if typ == "enum":
        enum_values = [x["Id"] for x in combined_control.get("EnumValues", [])]
        if value not in enum_values:
            logger.error(periph_name, config_control_key, value, "- the control does not have the enum value.")
    elif typ == "text":
        if not isinstance(value, str):
            logger.error(periph_name, config_control_key, value, "- the control should be of type text.")
    elif typ == "integer":
        try:
            value = int_or_hex_string(value)
        except Exception:
            logger.error(periph_name, config_control_key, value, "- the control should be of type int.")
            return
        try:
            if "MinimumValue" in combined_control and value < int_or_hex_string(combined_control["MinimumValue"]):
                logger.error(periph_name, config_control_key, value, " - is less than minimum value, which is", combined_control["MinimumValue"])
            if "MaximumValue" in combined_control and value > int_or_hex_string(combined_control["MaximumValue"]):
                logger.error(periph_name, config_control_key, value, " - is greater than maximum value, which is", combined_control["MaximumValue"])
        except Exception:
            logger.error(periph_name, config_control_key, " - an error occurred while converting minimal or maximal value to int. Error in the data model.")
    elif typ == "boolean":
        if value not in ["TRUE", "FALSE"]:
            logger.error(periph_name, config_control_key, value, "- boolean should be TRUE or FALSE")
    else:
        logger.error(periph_name, config_control_key, "- has unexpected type", typ, "Please extend function validate_value() of config_validator.py")


# All controls which are present in the model and plugin and do not have "Condition", must be present in cfsconfig
def validate_peripheral_completeness(periph_name, config_control_keys, model_control_dict, plugin_info, logger):
    control_keys = set(model_control_dict.keys())
    if "supportedControls" in plugin_info:
        control_keys = control_keys & set(plugin_info["supportedControls"].keys())
    if "removedControls" in plugin_info:
        control_keys = control_keys - set(plugin_info["removedControls"].keys())
    if "addedControls" in plugin_info:
        control_keys = control_keys | set(plugin_info["addedControls"].keys())
    control_keys = sorted(list(control_keys))
    for key in control_keys:
        if key not in config_control_keys:
            combined_control = combine_model_and_plugin(model_control_dict, plugin_info, key)
            if combined_control.get("Condition", "").strip() == "":  # No condition, control must be present
                logger.error(periph_name, key, "- control is missing.")


# Checks if ClockNodes section of the datamodel has an initialization sequence (maybe empty) for the value of clocknode.
def validate_clocknode_selection(clocknode, combined_control, model_clocknode_dict, logger):
    if clocknode["Name"] not in model_clocknode_dict:
        logger.error(clocknode["Name"], clocknode["Control"], "- the clocknode is not listed in ClockNodes of the data model.")
        return
    if combined_control.get("Type", "") != "enum":
        return
    current_config = model_clocknode_dict[clocknode["Name"]].get("Config", None)
    if current_config is None:
        logger.error(clocknode["Name"], clocknode["Control"], "- the clocknode does not have Config section in ClockNodes of the data model.")
        return
    current_control = current_config.get(clocknode["Control"], None)
    if current_control is None:
        logger.error(clocknode["Name"], clocknode["Control"], "- the control is not listed in Config section of the clock node in the data model.")
        return
    if clocknode["Value"] not in current_control:
        logger.error(clocknode["Name"], clocknode["Control"], clocknode["Value"],
                     "- there is no configuration sequence for the given value in ClockNodes of the data model.")


def check_intersection(set1, set2, entity_key, comment, logger):
    for control_key in sorted(list(set1 & set2)):
        logger.error(entity_key, control_key, "- this control appears in both", comment, "This is an ambiguity of cfsplugin, not cfsconfig.")


# plugin modifies the peripheral or clocknode, but it must do it in unambiguous way.
# The same control must not be listed as added and removed simultaneously.
def validate_unambiguity(entity_key, plugin_info, model_control_dict, logger):
    datamodel_keys = set(model_control_dict.keys())
    added_keys = set(plugin_info.get("addedControls", {}).keys())
    removed_keys = set(plugin_info.get("removedControls", {}).keys())
    supported_keys = set(plugin_info.get("supportedControls", {}).keys())
    modified_keys = set(plugin_info.get("modifiedControls", {}).keys())

    check_intersection(added_keys, datamodel_keys, entity_key, "added and data model", logger)
    check_intersection(added_keys, removed_keys, entity_key, "added and removed", logger)
    check_intersection(added_keys, supported_keys, entity_key, "added and supported", logger)
    check_intersection(added_keys, modified_keys, entity_key, "added and modified", logger)
    check_intersection(removed_keys, modified_keys, entity_key, "removed and modified", logger)
    check_intersection(removed_keys, supported_keys, entity_key, "removed and supported", logger)


# Unambiguity for peripherals, see validate_unambiguity()
def validate_unambiguity_peripherals(chip, model, plugin, logger):
    for entity_key in model.get("Controls", {}).keys():
        if entity_key in ["PinConfig", "ClockConfig"]:
            continue
        plugin_info = extract_control_list_from_plugin(plugin, chip, entity_key, "peripheral")
        model_control_dict = extract_peripheral_from_model(model, entity_key)
        validate_unambiguity(entity_key, plugin_info, model_control_dict, logger)


# Unambiguity for clocknodes, see validate_unambiguity()
def validate_unambiguity_clocks(chip, model, plugin, logger):
    model_control_dict = extract_peripheral_from_model(model, "ClockConfig")
    for clock_node in model.get("ClockNodes", []):
        plugin_info = extract_control_list_from_plugin(plugin, chip, clock_node["Name"], "clockConfig")
        validate_unambiguity(clock_node["Name"], plugin_info, model_control_dict, logger)


# Shrink section "Controls/PinConfig" taking into account current signal (e.g., excluding controls which are not present and enum values which are not present)
def shrink_general_pin_controls(general_pin_controls, signal_config):
    res = [control.copy() for control in general_pin_controls if control['Id'] in signal_config.keys()]
    for control in res:
        if control.get('Type','') == 'enum':
            allowed_keys = signal_config[control['Id']].keys()
            control['EnumValues'] = [enum_value for enum_value in control['EnumValues'] if enum_value['Id'] in allowed_keys]
    return {control['Id'] : control for control in res}


# Validate specific pin.
# Example: peri_name="UART0", sig_name="RX", general_pin_controls - section "Controls/PinConfig" of data model
# signal - the whole entry on the signal from config,
# config_pin_map = section "Pins" of config in the form of map ("UART0", "RX") => "H10",
# model_pin_map = section "Pins" of data model in the form of "H10" => <description>
# plugin_info = section "pinConfig" of the plugin project (its cfsplugin) as a map,
# logger = logger
def validate_specific_pin(peri_name, general_pin_controls, sig_name, signal, config_pin_map, model_pin_map, plugin_info, logger):
    # The algorithm applies information in the following order:
    # 1. It takes all possible PinConfig UI controls from the section Controls/Pinconfig of the data model (variable general_pin_controls)
    # 2. It filters UI controls and their enum values, taking only those which are applicable to current pin of the data model from Packages[x]/Pins[y]/Signals[z]/Pinconfig
    # 3. Then it applies addedControls and similar stuff from cfsplugin (variable plugin_info)
    # 4. Then it checks correctness and completeness similarly as it does for peripheral controls.
    pin_name = config_pin_map[(peri_name, sig_name)]  # For example H10
    if pin_name not in model_pin_map:
        logger.error(peri_name, sig_name, "- the pin", pin_name, "is not listed in Pins section of the data model, probably no such pin in the chip.")
        return
    signal_info = get_signal_info(model_pin_map, pin_name, peri_name, sig_name)
    if signal_info is None:
        logger.error(peri_name, sig_name, pin_name, "- the pin cannot be assigned to the given peripheral and signal.")
        return
    signal_config = signal_info.get("PinConfig", {})
    model_control_dict = shrink_general_pin_controls(general_pin_controls, signal_config)
    displayed_name_of_pin=f'{peri_name} {sig_name}'
    for electrical_key, electrical_value in signal.get("Config", {}).items():
        if not validate_existence(displayed_name_of_pin, electrical_key, model_control_dict, plugin_info, logger):
            continue
        combined_control = combine_model_and_plugin(model_control_dict, plugin_info, electrical_key)
        validate_value(displayed_name_of_pin, electrical_key, combined_control, electrical_value, logger)
    validate_peripheral_completeness(displayed_name_of_pin, list(signal.get("Config", {}).keys()), model_control_dict, plugin_info, logger)


# All validation of peripherals, except their pins
def validate_peripherals(config, model, plugin_vect, logger):
    chip = config["Soc"]
    for j, project in enumerate(config.get("Projects", [])):
        validate_unambiguity_peripherals(chip, model, plugin_vect[j], logger)
        for config_periph in project.get("Peripherals", []):
            plugin_info = extract_control_list_from_plugin(plugin_vect[j], chip, config_periph["Name"], "peripheral")
            model_control_dict = extract_peripheral_from_model(model, config_periph["Name"])
            for config_control_key, config_control_value in config_periph.get("Config", {}).items():
                if not validate_existence(config_periph["Name"], config_control_key, model_control_dict, plugin_info, logger):
                    continue
                combined_control = combine_model_and_plugin(model_control_dict, plugin_info, config_control_key)
                validate_value(config_periph["Name"], config_control_key, combined_control, config_control_value, logger)
            validate_peripheral_completeness(config_periph["Name"], list(config_periph.get("Config", {}).keys()), model_control_dict, plugin_info, logger)


# All validation of clocknodes
def validate_clocks(config, model, plugin, logger):
    chip = config["Soc"]
    validate_unambiguity_clocks(chip, model, plugin, logger)
    model_control_dict = extract_peripheral_from_model(model, "ClockConfig")
    model_clocknode_dict = extract_clocknode_dict(model)
    for clock_node in config.get("ClockNodes", []):
        plugin_info = extract_control_list_from_plugin(plugin, chip, clock_node["Name"], "clockConfig")
        if not validate_existence(clock_node["Name"], clock_node["Control"], model_control_dict, plugin_info, logger):
            continue
        combined_control = combine_model_and_plugin(model_control_dict, plugin_info, clock_node["Control"])
        validate_value(clock_node["Name"], clock_node["Control"], combined_control, clock_node["Value"], logger)
        validate_clocknode_selection(clock_node, combined_control, model_clocknode_dict, logger)


# Validation of Pins section and pins in peripherals
def validate_pins(config, model, plugin_vect, logger):
    chip = config["Soc"]
    model_pin_map = create_model_pin_map(model, logger)
    config_pin_map = create_config_pin_map(config, model_pin_map, logger)
    requested_pin_set = set()
    peripherals_signals = extract_peripherals_and_their_signals_from_model(model)
    general_pin_controls = model.get('Controls', {}).get('PinConfig', [])
    for j, project in enumerate(config.get("Projects", [])):
        plugin_info = parse_control_lists(plugin_vect[j].get("properties", {}).get("pinConfig", {}), chip)
        for peripheral in project.get("Peripherals", []):
            peri_name = peripheral.get("Name", "")
            if peri_name not in peripherals_signals:
                logger.error(peri_name, '- not in the section "Peripherals" of the data model.')
                continue
            for signal in peripheral.get("Signals", []):
                sig_name = signal.get("Name", "")
                if sig_name not in peripherals_signals[peri_name]:
                    logger.error(peri_name, sig_name, '- this signal is not in the peripheral in the section "Peripherals" of the data model.')
                if (peri_name, sig_name) in requested_pin_set:
                    logger.error(peri_name, sig_name, "- pin requested twice")
                requested_pin_set.add((peri_name, sig_name))
                if (peri_name, sig_name) not in config_pin_map:
                    if len(signal.get("Config", {})) > 0:
                        logger.error(peri_name, sig_name, "- pin is not in Pins section, but has non-empty Config.")
                    continue
                validate_specific_pin(peri_name, general_pin_controls, sig_name, signal, config_pin_map, model_pin_map, plugin_info, logger)
    for unused_pin in sorted(list(set(config_pin_map.keys() - requested_pin_set))):
        logger.error(" ".join(unused_pin),
                     "- pin is mentioned in Pins section but missing from peripheral. (Either peripheral is not assigned, or unnecessary pins added.)")


def parse_version(s):
    return [int(j) for j in s.split('.')]


# Some general checks of common fields of cfsconfig
# cfsconfig - parsed cfsconfig
# validation_config - parsed validated_config.json
# logger - logger class to save errors
def general_validations(cfsconfig, validation_config, logger):
    if not cfsconfig.get("DataModelVersion", "").startswith("^"):
        logger.error("DataModelVersion must start with freestanding circumflex accent ^")
    for project in cfsconfig.get("Projects", []):
        if project.get("ExternallyManaged", False):
            continue
        if not project.get("PluginVersion", "").startswith("^"):
            logger.error("PluginVersion must start with freestanding circumflex accent ^")
        if "ZephyrVersion" in project.get("PlatformConfig", {}):
            try:
                zephyr_version = project["PlatformConfig"]["ZephyrVersion"]
                if parse_version(zephyr_version) < parse_version(validation_config['MinimalZephyrVersion']):
                    raise Exception()
            except Exception:
                logger.error("ZephyrVersion must be a correct version value and must be at least", validation_config['MinimalZephyrVersion'])


# returns map {'plugin_id':'path/to/cfsplugin'}, for example {"com.analog.multicore.msdk.helloworld":"path/to/msdk-multi-core-hello-world/.cfsplugin"}
def get_plugin_id_to_fname_map(plugin_path):
    fname_map, directory_map = {}, {}
    for directory in os.listdir(plugin_path):
        fname = os.path.join(plugin_path, directory, ".cfsplugin")
        if os.path.isfile(fname):
            try:
                with open(fname) as file:
                    tree = json.loads(file.read())
                    fname_map[tree["pluginId"]] = fname
                    directory_map[tree["pluginId"]] = directory
            except Exception:
                print("Could not read", fname, "or pluginId is missing")
                raise
    if len(fname_map) == 0:
        print("Warning! No plugins in", plugin_path)
    return fname_map, directory_map


# Returns primary plugin (for common places like clock nodes) and vector of plugins, one plugin per project
# Plugins are already parsed cfsplugin files (they contain added controls etc.)
def get_all_plugins(config, model, plugin_map, logger):
    if len(config.get("Projects", [])) < 1:
        logger.error("No projects found. Cannot determine primary plugin.")
        return None, None
    try:
        primary_cores = [core["Id"] for core in model["Cores"] if core.get("IsPrimary", False)]
        if len(primary_cores) != 1:
            logger.error("Error in the model: there should be exactly one primary core.", len(primary_cores), "found.")
            raise Exception()
        primary_projects = [project["PluginId"] for project in config["Projects"] if project["CoreId"] == primary_cores[0] and project.get("Secure", True)]
        if len(primary_projects) != 1:
            logger.error("Error in projects: there should be exactly one primary project.", len(primary_projects), "found.")
            raise Exception()
        primary_plugin_id = primary_projects[0]
    except Exception:
        logger.error("Problems with detecting primary project. Assuming first project is primary.")
        primary_plugin_id = config["Projects"][0].get("PluginId", "")
    if primary_plugin_id not in plugin_map:
        logger.error("Cannot find directory for primary plugin. Either wrong plugin directory, or wrong plugin id. Tests are skipped. Plugin id is", primary_plugin_id)
        return None, None
    logger.info(f"cfsplugin for primary project (common places of cfsconfig): {plugin_map[primary_plugin_id]}")
    with open(plugin_map[primary_plugin_id]) as f:
        primary_plugin = json.load(f)
    plugin_vect = []
    for j, project in enumerate(config["Projects"]):
        current_plugin_id = project.get("PluginId", "")
        if project.get("ExternallyManaged", False) and current_plugin_id == "":
            current_plugin_id = primary_plugin_id
        if current_plugin_id not in plugin_map:
            current_plugin_id = primary_plugin_id
            logger.error("Could not find directory for a plugin for the project:", j, " Falling back to the primary one.")
        logger.info(f"cfsplugin for project {j}: {plugin_map[current_plugin_id]}")
        with open(plugin_map[current_plugin_id]) as f:
            plugin_vect.append(json.load(f))
    return primary_plugin, plugin_vect


# Entry point for validation tests
# cfsconfig_fname - path to cfsconfig, created by cfsutil, to be checked
# model_dir - path to directory with models, for example, C:\my\\w2\codefusion-studio\packages\cfs-data-models\socs
# plugin_map - map {'plugin_id':'path/to/.cfsplugin'}, for example {"com.analog.multicore.msdk.helloworld":"path/to/msdk-multi-core-hello-world/.cfsplugin"}
#              typically created by the function get_plugin_id_to_fname_map
# validation_config_fname - path to the file validation_config.json which contains specific parameters for validation
# logger - logger from simple_test_utils
def validate_config(cfsconfig_fname, model_dir, plugin_map, validation_config_fname, logger):
    with open(cfsconfig_fname) as f:
        cfsconfig = json.load(f)
    with open(validation_config_fname) as f:
        validation_config = json.load(f)
    model_fname = os.path.join(model_dir, cfsconfig["Soc"].lower() + "-" + cfsconfig["Package"].lower() + ".json")
    logger.info("Model is read from file:", model_fname)
    with open(model_fname) as f:
        model = json.load(f)
    primary_plugin, plugin_vect = get_all_plugins(cfsconfig, model, plugin_map, logger)
    if primary_plugin is None:
        return
    validate_peripherals(cfsconfig, model, plugin_vect, logger)
    validate_clocks(cfsconfig, model, primary_plugin, logger)
    validate_pins(cfsconfig, model, plugin_vect, logger)
    general_validations(cfsconfig, validation_config, logger)
    if logger.empty:
        logger.info("Test passed.")


# Get arguments from command line
def get_arguments():
    parser = argparse.ArgumentParser(
        description="config_validator - validates cfsconfig file according to the datamodel and settings in base plugins",
        epilog="Example (with my local paths):\n"
            + "python "
            + " packages\\cfsconfig-template-check\\scripts\\config_validator.py "
            + "packages\\cfs-data-models\\socs "
            + "--plugin-path C:\\my\\v\\cfs-plugins\\plugins "
            + "--validation-config C:\\my\\v\\cfs-plugins\\tests\\unit-tests\\python\\validation_config.json "
            + "C:\\my\\workspaces\\TEST_ADCTRIG_690_A\\.cfs\\max32690-wlp.cfsconfig",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("datamodel_directory", help = "Path to the directory containing datamodels. "
         "For MAX and sharc-fx projects, it is inside codefusion-studio repository, codefusion-studio\\packages\\cfs-data-models\\socs")
    parser.add_argument("cfsconfig", help = "Path to cfsconfig to be checked.")
    parser.add_argument("--plugin-path", action='append', default=[], help="Search paths (may be multiple) for plugins, necessary to read augmentations like addedControls. "
        "If not given, resolves to ../../../plugins relatively to this script (assuming this script is inside cfs-plugins repository).")
    parser.add_argument("--validation-config", help="Path to the validation_config.json. If not given, resolves to validation_config.json in the same directory as this script.")

    res = parser.parse_args()
    if len(res.plugin_path)==0:
        res.plugin_path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "plugins")))
    if res.validation_config is None:
        res.validation_config=os.path.abspath(os.path.join(os.path.dirname(__file__), "validation_config.json"))
    return res


# Allows to run validator as a standalone program. This is not the main purpose of the module, though.
def main():
    args = get_arguments()
    plugin_id_to_filename_map = {}
    for plugin_path in args.plugin_path:
        current_plugin_map, dummy = get_plugin_id_to_fname_map(plugin_path)
        plugin_id_to_filename_map = plugin_id_to_filename_map | current_plugin_map
    logger = simple_test_utils.ConsoleLogger()
    logger.verbose = True
    validate_config(args.cfsconfig, args.datamodel_directory, plugin_id_to_filename_map, args.validation_config, logger)
    if not logger.empty:
        print("Test failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()

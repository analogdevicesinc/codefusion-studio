/**
 * Copyright (c) 2024-2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* Functions for getting values from the data model.
 */

// Extract the peripheral with given name from the data model.
function getPeripheral(name) {
  return it.datamodel.Peripherals.find(p => p.Name == name);
}

// Extract the information for the current package from the data model.
function getPackage() {
  return it.datamodel.Packages.find(package => package.Name.toLowerCase() === it.cfsconfig.Package.toLowerCase());
}

// Extract the pin information for the pin with given name from the data model.
function getPin(pin) {
  return getPackage()?.Pins.find(p => p.Name === pin.Pin);
}

// Extract the signal information for the given pin from the data model.
function getSignal(pin) {
  return getPin(pin)?.Signals.find(s => pin.Peripheral === s.Peripheral && pin.Signal === s.Name);
}

// Extract the control information for the given namespace and id from the data model.
function getControl(namespace, ctrlName) {
  return it.datamodel.Controls[namespace].find(c => c.Id === ctrl);
}

// Get the sequence for a setting from the data model.
function getSequence(config, namespace, ctrlName, value) {
  const ctrl = getControl(namespace, ctrlName);
  if (ctrl.Type === "enum") {
    return config[ctrlName][value];
  } else if (ctrl.Type === "boolean") {
    return config[ctrlName][value && value !== "FALSE" ? "TRUE" : "FALSE"];
  }
  return config[ctrlName].VALUE;
}

// Get the Control entry for a control from the data model.
function getControl(namespace, id) {
  return it.datamodel.Controls[namespace]?.find(c => c.Id === id);
}

// Get the description for a control from the data model.
function getControlDesc(namespace, ctrl) {
  const ctrlDm = getControl(namespace, ctrl);
  return ctrlDm?.Description;
}

// Get the setting description for a control's value from the data model.
function getSettingDesc(namespace, ctrl, value) {
  const ctrlDm = getControl(namespace, ctrl);
  if (ctrlDm?.EnumValues) {
    const enumNode = ctrlDm.EnumValues.find(e => e.Id === value);
    if (enumNode) {
      return enumNode.Description;
    }
  } else if (ctrlDm?.Type === "boolean") {
    if (value && value !== "FALSE") {
      return "true";
    } else {
      return "false";
    }
  }
  return value;
}

// Translate the value recorded in the cfsconfig file into a value
// that can be used in a sequence.
function translateValueForSequence(namespace, ctrl, value) {
  const ctrlDm = getControl(namespace, ctrl);
  if (ctrlDm?.Type === 'enum') {
    return ctrlDm.EnumValues.find(e => e.Id === value).Value;
  }
  return value;
}

/* Functions for getting values from the cfsconfig file.
 */

// Get the Project entry from the cfsconfig file.
function getProject() {
  return it.cfsconfig.Projects?.find(p => p.ProjectId == it.projectId);
}

// Is the current project the primary one?
function isPrimaryProject() {
  return (it.datamodel.Cores.find(c => c.Id === it.coreId)?.IsPrimary && getProject().Secure);
}

// Get the setting for a clock control from the cfsconfig file.
function getClockSetting(node, ctrl, defaultValue = undefined) {
  return it.cfsconfig.ClockNodes.find(n => n.Name === node && n.Control === ctrl && n.Enabled)?.Value ?? defaultValue;
}

// Get the block of peripheral data in the project, if any.
function getAssignedPeripheral(instance) {
  const proj = it.cfsconfig.Projects?.find(p => p.ProjectId == it.projectId);
  return proj?.Peripherals?.find(p => p.Name == instance);
}

// Get the signal block for a peripheral and signal in the Projects section, if any
function getAssignedSignal(peripheral, signal, pinname) {
  const pin = it.cfsconfig.Pins.find(p => p.Peripheral === peripheral && p.Signal === signal);
  if (pin?.Pin === pinname) {
    const peri = getAssignedPeripheral(peripheral);
    return peri?.Signals?.find(s => s.Name === signal);
  }
  return undefined;
}

// Get the signal block for a pin in the Projects section, if any
function getAssignedPinSignal(pin) {
  return getAssignedSignal(pin.Peripheral, pin.Signal);
}

// Get any user description associated with the peripheral.
function getPeripheralDescription(instance) {
  const peri = getAssignedPeripheral(instance);
  return peri?.Description?.length > 0 ? peri.Description : undefined;
}

// Return the ID of the project this pin is assigned to, if any.
function getAssignedProjectForPin(pin) {
  return it.cfsconfig.Projects?.find(c => c.Peripherals?.find(p => p.Name === pin.Peripheral)?.Signals.find(s => s.Name === pin.Signal))?.ProjectId;
}

/* Functions for getting pin settings from cfsconfig file.
 */

// Get the description for this signal setting.
function getSignalSettingDesc(signal, ctrl) {
  const value = signal.Config[ctrl];
  const ctrlNode = it.datamodel.Controls.PinConfig.find(c => c.Id === ctrl);
  if (ctrlNode?.EnumValues) {
    const enumNode = ctrlNode.EnumValues.find(e => e.Id === value);
    return enumNode?.Description;
  }
  return undefined;
}

/* Functions for getting clock settings from cfsconfig file.
 */

// Is the clock control set to this value?
function isClockSetTo(node, ctrl, value) {
  const entry = getClockSetting(node, ctrl);
  return entry && entry === value;
}

// Is this clock setting set, to anything?
function isClockSet(node, ctrl) {
  const entries = it.cfsconfig.ClockNodes.filter(n => n.Name === node && n.Control === ctrl && n.Enabled);
  return (entries.length > 0);
}

// Is any setting for this clock node set?
function isClockAnySet(node) {
  return it.cfsconfig.ClockNodes.filter(n => n.Name === node && n.Enabled).length > 0;
}

// Get the description for this clock setting.
function getClockSettingDesc(node, ctrl) {
  const value = getClockSetting(node, ctrl);
  return getSettingDesc('ClockConfig', ctrl, value);
}

// Default value for whether the part supports Clock Configuration or not. May be
// overridden in part-specific file.
function hasClockConfig() {
  return true;
}

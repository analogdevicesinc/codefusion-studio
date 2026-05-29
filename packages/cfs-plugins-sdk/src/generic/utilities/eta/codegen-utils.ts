/**
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type {
  CfsConfig,
  ConfiguredPartition,
  ConfiguredPeripheral,
  ConfiguredPin
} from "cfs-types";
import type {
  CfsSocDataModel,
  SocCoreMemoryRef,
  SocPinConfig
} from "cfs-types";

declare const it: {
  datamodel: CfsSocDataModel;
  cfsconfig: CfsConfig;
  coreId: string;
  projectId: string;
};

// @TODO: CFSIO-6390 Prefix global utilities for better readability in template files.

/* Functions for getting values from the data model.
 */

// Does the core support TrustZone?
export function supportsTrustZone() {
  const core = it.datamodel.Cores.find((c) => c.Id === it.coreId);
  return core?.Memory.find(
    (r: SocCoreMemoryRef) => r.AliasType === "Secure"
  );
}

// Return true if the ClockNode of given name exists on the canvas.
export function clockNodeExists(name: string) {
  return it.datamodel.ClockNodes.find((n) => n.Name === name);
}

// Extract the peripheral with given name from the data model.
export function getPeripheral(name: string) {
  return it.datamodel.Peripherals.find((p) => p.Name == name);
}

// Extract the information for the current package from the data model.
export function getPackage():
  | CfsSocDataModel["Packages"][number]
  | undefined {
  return it.datamodel.Packages.find(
    (pkg) =>
      pkg.Name.toLowerCase() === it.cfsconfig.Package.toLowerCase()
  );
}

// Extract the pin information for the pin with given name from the data model.
export function getPin(pin: CfsConfig["Pins"][number]) {
  return getPackage()?.Pins.find((p) => p.Name === pin.Pin);
}

// Extract the signal information for the given pin from the data model.
export function getSignal(pin: CfsConfig["Pins"][number]) {
  return getPin(pin)?.Signals.find(
    (s) => pin.Peripheral === s.Peripheral && pin.Signal === s.Name
  );
}

// Get the sequence for a setting from the data model.
export function getSequence(
  config: Record<string, Record<string, unknown>>,
  namespace: string,
  ctrlName: string,
  value: string
) {
  const ctrl = getControl(namespace, ctrlName);
  if (ctrl?.Type === "enum") {
    return config[ctrlName][value];
  } else if (ctrl?.Type === "boolean") {
    return config[ctrlName][
      value && value !== "FALSE" ? "TRUE" : "FALSE"
    ];
  }
  return config[ctrlName].VALUE;
}

// Get the Control entry for a control from the data model.
export function getControl(namespace: string, id: string) {
  return it.datamodel.Controls[namespace]?.find((c) => c.Id === id);
}

// Get the description for a control from the data model.
export function getControlDesc(namespace: string, ctrl: string) {
  const ctrlDm = getControl(namespace, ctrl);
  return ctrlDm?.Description;
}

// Get the setting description for a control's value from the data model.
export function getSettingDesc(
  namespace: string,
  ctrl: string,
  value: string
) {
  const ctrlDm = getControl(namespace, ctrl);
  if (ctrlDm?.EnumValues) {
    const enumNode = ctrlDm.EnumValues.find((e) => e.Id === value);
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
export function translateValueForSequence(
  namespace: string,
  ctrl: string,
  value: string
) {
  const ctrlDm = getControl(namespace, ctrl);
  if (ctrlDm?.Type === "enum") {
    return ctrlDm.EnumValues?.find((e) => e.Id === value)?.Value;
  }

  return value;
}

/* Get the core memory region this memory address belongs to.
 */
export function getCoreRegion(address: string, alias?: string) {
  const thisAddress = parseInt(address, 16);
  const targetMemoryConfig =
    it.datamodel.Cores.find((c) => c.Id === it.coreId)?.Memory ?? [];

  for (const region of targetMemoryConfig) {
    if ((region as SocCoreMemoryRef).AliasType == alias) {
      const start = parseInt(
        getRegionProperty(region, "AddressStart") ?? "",
        16
      );
      const end = parseInt(
        getRegionProperty(region, "AddressEnd") ?? "",
        16
      );
      if (thisAddress >= start && thisAddress <= end) return region;
    }
  }
  return undefined;
}

/* Get the property of the region, either from the core memory or the referenced system memory.
 */
export function getRegionProperty(
  region: SocCoreMemoryRef,
  property: keyof SocCoreMemoryRef
) {
  if (typeof region?.[property] === "undefined") {
    // If the property isn't defined on the region, then fall back to the
    // referenced region.
    // See if it's a reference to a system memory.
    const regionName = region?.Name;
    region = it.datamodel.SystemMemory.find(
      (r) => r.Name === regionName
    ) as SocCoreMemoryRef;
    // If the region isn't in the system memory, then maybe it's an alias to a
    // region in the core memory.
    if (!region) {
      region =
        it.datamodel.Cores.find(
          (c) => c.Id == it.coreId
        )?.Memory?.find(
          (r: SocCoreMemoryRef) =>
            r.Name == regionName && !r.AliasType
        ) ?? ({} as SocCoreMemoryRef);
    }
  }
  return region?.[property];
}

/* Return true if the given partition overlaps the system memory region.
 */
export function partitionOverlapsSystemRegion(
  partition: ConfiguredPartition,
  regionName: string
) {
  const region = it.datamodel.SystemMemory?.find(
    (r) => r.Name === regionName
  );

  if (!region) return false;

  const startAddr = parseInt(partition.StartAddress, 16);
  const endAddr = startAddr + partition.Size - 1;
  const regionStartAddr = parseInt(region.AddressStart, 16);
  const regionEndAddr = parseInt(region.AddressEnd, 16);
  return startAddr <= regionEndAddr && endAddr >= regionStartAddr;
}

/* Get the partitions for this project.
 */
export function getProjectPartitions() {
  return getProject()?.Partitions ?? [];
}

/* Get the partitions for this project that start in this core memory region.
 */
export function getProjectPartitionsStartingInRegion(
  region: SocCoreMemoryRef
) {
  const partitions = getProjectPartitions();
  return (
    partitions.filter(
      (p) => getCoreRegion(p.StartAddress) == region
    ) ?? []
  );
}

/* Get the partitions owned by this project.
 */
export function getProjectOwnedPartitions() {
  return getProject()?.Partitions?.filter((p) => p.IsOwner) ?? [];
}

/* Get the partitions owned by this project that start in this core memory region.
 */
export function getProjectOwnedPartitionsStartingInRegion(
  region: SocCoreMemoryRef
) {
  const partitions = getProjectOwnedPartitions();
  return (
    partitions.filter(
      (p) => getCoreRegion(p.StartAddress) == region
    ) ?? []
  );
}

// Find the partition of the given name, regardless of project
export function getPartition(partitionName: string) {
  for (const proj of it.cfsconfig.Projects) {
    const partition = proj.Partitions.find(
      (p) => p.Name === partitionName
    );
    if (partition) return partition;
  }
  return undefined;
}

// Get the name to use for this partition.
// Use the override key if defined to override the standard Name.
export function getPartitionName(
  partition: ConfiguredPartition,
  override: string | undefined = undefined
) {
  return (
    override && (partition.Config?.[override] as string)?.length
      ? (partition.Config?.[override] ?? "")
      : partition.Name
  ) as string;
}

// Get the maximum length of the partition name.
export function maxPartitionNameLength(override = undefined) {
  let maxLen = 0;
  for (const partition of getProject()?.Partitions ?? []) {
    if (getPartitionName(partition, override).length > maxLen) {
      maxLen = getPartitionName(partition, override).length;
    }
  }
  return maxLen;
}

/* Get the peripherals for this project.
 */
export function getProjectPeripherals() {
  return getProject()?.Peripherals ?? [];
}

// Return true if peripheral is allocated to Secure project
export function peripheralIsSecure(peri: string) {
  return it.cfsconfig.Projects?.find(
    (prj) =>
      prj.Peripherals?.find((p) => p.Name === peri) && prj.Secure
  );
}

// Return true if any part of memory block is allocated to Secure project
export function memoryRegionIsSecure(region: string) {
  const secureProject = it.cfsconfig.Projects?.find(
    (p) => p.CoreId === it.coreId && p.Secure
  );
  return secureProject?.Partitions?.find((p) =>
    partitionOverlapsSystemRegion(p, region)
  );
}

/* Functions for getting values from the cfsconfig file.
 */

// Get the Project entry from the cfsconfig file.
export function getProject() {
  return it.cfsconfig.Projects?.find(
    (p) => p.ProjectId == it.projectId
  );
}

// Is the current project the primary one?
export function isPrimaryProject() {
  return (
    it.datamodel.Cores.find((c) => c.Id === it.coreId)?.IsPrimary &&
    (typeof getProject()?.Secure === "undefined" ||
      getProject()?.Secure)
  );
}

// Get the setting for a clock control from the cfsconfig file.
export function getClockSetting(
  node: string,
  ctrl: string,
  defaultValue?: string
) {
  return (
    it.cfsconfig.ClockNodes.find(
      (n) => n.Name === node && n.Control === ctrl && n.Enabled
    )?.Value ?? defaultValue
  );
}

// Get the clock node for a peripheral.
export function getPeripheralClockNode(peripheral: string) {
  return getPeripheral(peripheral)?.ClockNode;
}

// Get the setting for a peripheral's clock control from the cfsconfig file.
export function getPeripheralClockSetting(
  peripheral: string,
  ctrl: string,
  defaultValue?: string
) {
  const node = getPeripheralClockNode(peripheral);
  if (node) {
    return getClockSetting(node, ctrl, defaultValue);
  }
  return defaultValue;
}

// Get the block of peripheral data in the project, if any.
export function getAssignedPeripheral(instance: string) {
  const proj = it.cfsconfig.Projects?.find(
    (p) => p.ProjectId == it.projectId
  );
  return proj?.Peripherals?.find((p) => p.Name == instance);
}

// Return the ID of the project this peripheral is assigned to, if any.
export function getAssignedProjectForPeripheral(instance: string) {
  return it.cfsconfig.Projects?.find((c) =>
    c.Peripherals?.find((p) => p.Name === instance)
  )?.ProjectId;
}

// Get the signal block for a peripheral and signal in the Projects section, if any
export function getAssignedSignal(
  peripheral: string,
  signal: string,
  pinname: string
) {
  const pin = it.cfsconfig.Pins.find(
    (p) => p.Peripheral === peripheral && p.Signal === signal
  );
  if (pin?.Pin === pinname) {
    const assignedPeripheral = getAssignedPeripheral(peripheral);
    return assignedPeripheral?.Signals?.find(
      (s) => s.Name === signal
    );
  }
  return undefined;
}

// Get the signal block for a pin in the Projects section, if any
export function getAssignedPinSignal(pin: ConfiguredPin) {
  return getAssignedSignal(pin.Peripheral, pin.Signal, pin.Pin);
}

// Get any user description associated with the peripheral.
export function getPeripheralDescription(instance: string) {
  const assignedPeripheral = getAssignedPeripheral(instance);
  return (assignedPeripheral?.Description?.length ?? 0) > 0
    ? assignedPeripheral?.Description
    : undefined;
}

// Return the ID of the project this pin is assigned to, if any.
export function getAssignedProjectForPin(pin: ConfiguredPin) {
  return it.cfsconfig.Projects?.find((c) =>
    c.Peripherals?.find(
      (p) => p.Name === pin.Peripheral
    )?.Signals.find((s) => s.Name === pin.Signal)
  )?.ProjectId;
}

/* Functions for getting pin settings from cfsconfig file.
 */

// Get the description for this signal setting.
export function getSignalSettingDesc(
  signal: ConfiguredPeripheral["Signals"][number],
  ctrl: string
) {
  const value = signal.Config?.[ctrl];
  const ctrlNode = it.datamodel.Controls.PinConfig.find(
    (c) => c.Id === ctrl
  );
  if (ctrlNode?.EnumValues) {
    const enumNode = ctrlNode.EnumValues.find((e) => e.Id === value);
    return enumNode?.Description;
  }
  return undefined;
}

/* Functions for getting clock settings from cfsconfig file.
 */

// Is the clock control "ctrl" for clock node "node" set to "value"?
// Only used for non-peripheral clock settings.
export function isSystemClockSetTo(
  node: string,
  ctrl: string,
  value: string
) {
  const entry = getClockSetting(node, ctrl);
  return isPrimaryProject() && entry && entry === value;
}

// Is this clock control "ctrl" for clock node "node" set, to anything?
// Only used for non-peripheral clock settings.
export function isSystemClockSet(node: string, ctrl: string) {
  const entries = it.cfsconfig.ClockNodes.filter(
    (n) => n.Name === node && n.Control === ctrl && n.Enabled
  );
  return isPrimaryProject() && entries.length > 0;
}

// Is any setting for clock node "node" set?
// Only used for non-peripheral clock settings.
export function isSystemClockAnySet(node: string) {
  return (
    isPrimaryProject() &&
    it.cfsconfig.ClockNodes.filter(
      (n) => n.Name === node && n.Enabled
    ).length > 0
  );
}

// Is the clock control "ctrl" for the peripheral's clock node set to "value"?
// Return false if peripheral is not assigned to the current project.
export function isPeripheralClockSetTo(
  peripheral: string,
  ctrl: string,
  value: string
) {
  const clockNode = getPeripheral(peripheral)?.ClockNode;
  if (clockNode) {
    const entry = getClockSetting(clockNode, ctrl);
    return (
      getAssignedPeripheral(peripheral) && entry && entry === value
    );
  }
  return false;
}

// Is the clock control "ctrl" for the peripheral's clock node set to "value"?
// Return false if peripheral is assigned to a project.
export function isUnassignedPeripheralClockSetTo(
  peripheral: string,
  ctrl: string,
  value: string
) {
  const clockNode = getPeripheral(peripheral)?.ClockNode;
  if (clockNode) {
    const entry = getClockSetting(clockNode, ctrl);
    return (
      !getAssignedProjectForPeripheral(peripheral) &&
      entry &&
      entry === value
    );
  }
  return false;
}

// Is this clock control "ctrl" for peripheral's clock node set, to anything?
// Return false if peripheral is not assigned to the current project.
export function isPeripheralClockSet(
  peripheral: string,
  ctrl: string
) {
  const clockNode = getPeripheral(peripheral)?.ClockNode;
  if (clockNode) {
    const entry = getClockSetting(clockNode, ctrl);
    return getAssignedPeripheral(peripheral) && entry;
  }
  return false;
}

// Is any instance of the peripheral block assigned to this project?
export function anyInstanceAssigned(peripheral: string) {
  const max_peripheral_num = 20;
  if (getAssignedPeripheral(peripheral)) return true;
  for (let i = 0; i < max_peripheral_num; i += 1) {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    if (getAssignedPeripheral(peripheral + i)) return true;
  }
  return false;
}

// Has any instance of the peripheral block assigned to this project
// got the ctrl set to value?
export function anyInstanceAssignedSetTo(
  peripheral: string,
  ctrl: string,
  value: string
) {
  const max_peripheral_num = 20;
  let assignedPeripheral = getAssignedPeripheral(peripheral);
  if (assignedPeripheral?.Config?.[ctrl] === value) return true;
  for (let i = 0; i < max_peripheral_num; i += 1) {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    assignedPeripheral = getAssignedPeripheral(peripheral + i);
    if (assignedPeripheral?.Config?.[ctrl] === value) return true;
  }
  return false;
}

// Is the clock control "ctrl" for clock node "node" set to "value"?
// Doesn't worry which project the peripheral is assigned to, if any.
export function isClockSetTo(
  node: string,
  ctrl: string,
  value: string
) {
  const entry = getClockSetting(node, ctrl);
  return entry && entry === value;
}

// Is this clock control "ctrl" for clock node "node" set, to anything?
// Doesn't worry which project the peripheral is assigned to, if any.
export function isClockSet(node: string, ctrl: string) {
  const entries = it.cfsconfig.ClockNodes.filter(
    (n) => n.Name === node && n.Control === ctrl && n.Enabled
  );
  return entries.length > 0;
}

// Get the description for this clock setting.
export function getClockSettingDesc(node: string, ctrl: string) {
  const value = getClockSetting(node, ctrl);
  // @TODO: Value seems to be undefined all the time in the current scope.
  // @ts-expect-error REMOVE AFTER FIXING VALUE IMPLEMENTATION
  return getSettingDesc("ClockConfig", ctrl, value);
}

// Default value for whether the part supports Clock Configuration or not. May be
// overridden in part-specific file.
export function hasClockConfig() {
  return true;
}

// Does the project have a model with the specified backend?
// Doesn't matter what the model is as long as one is configured.
export function usesAIBackend(backend: string) {
  return getProject()?.AIModels?.some(
    (mod) => mod.Backend?.Name == backend
  );
}

// Does the project have any AI models
export function usesAnyAIModels() {
  return !!getProject()?.AIModels?.length;
}

// Does the project have Zephelin Profiling enabled
export function isZephelinEnabled() {
  return getProject()?.Profiling?.Zephelin?.Enabled;
}

// Does the project have Zephelin AI Profiling enabled
export function isZephelinAIEnabled() {
  return getProject()?.Profiling?.Zephelin?.AIEnabled;
}

// Return the name of the UART configured for Zephelin profiling.
// The name corresponds to the entry in the data model.
export function getZephelinPort() {
  return getProject()?.Profiling?.Zephelin?.Port;
}

export function getZephelinTraceInterface() {
  return getProject()?.Profiling?.Zephelin?.Interface;
}

// Does the project have Zephelin RTOS events enabled
export function isZephelinRtosEventsEnabled() {
  return getProject()?.Profiling?.Zephelin?.RtosEventsEnabled;
}

// Does the project have Zephelin profiling memory usage enabled
export function isZephelinProfilingMemoryUsageEnabled() {
  return getProject()?.Profiling?.Zephelin
    ?.ProfilingMemoryUsageEnabled;
}

// Return the profiling memory usage interval for Zephelin
export function getZephelinProfilingMemoryUsageInterval() {
  return getProject()?.Profiling?.Zephelin
    ?.ProfilingMemoryUsageInterval;
}

// Does the project have Zephelin profiling CPU load enabled
export function isZephelinProfilingCpuLoadEnabled() {
  return getProject()?.Profiling?.Zephelin?.ProfilingCpuLoadEnabled;
}

// Return the profiling CPU load interval for Zephelin
export function getZephelinProfilingCpuLoadInterval() {
  return getProject()?.Profiling?.Zephelin?.ProfilingCpuLoadInterval;
}

// Does the project have Zephelin instrumentation subsystem enabled
export function isZephelinInstrumentationSubsystemEnabled() {
  return getProject()?.Profiling?.Zephelin
    ?.InstrumentationSubsystemEnabled;
}

// Functions to support RPN expression evaluation.

// Evaluate a reverse polish expression passed in, using the control value where referenced.
export function evaluateExpression(expr: string, ctrlValue: number) {
  const unaryOperators = {
    "!": (operand1: number) => (operand1 ? 0 : 1),
    "~": (operand1: number) => ~operand1
  };

  const binaryOperators = {
    "+": (operand1: number, operand2: number) => operand1 + operand2,
    "-": (operand1: number, operand2: number) => operand1 - operand2,
    "*": (operand1: number, operand2: number) => operand1 * operand2,
    "/": (operand1: number, operand2: number) =>
      Math.floor(operand1 / operand2),
    "=": (operand1: number, operand2: number) =>
      operand1 === operand2 ? 1 : 0,
    "!=": (operand1: number, operand2: number) =>
      operand1 === operand2 ? 0 : 1,
    "<": (operand1: number, operand2: number) =>
      operand1 < operand2 ? 1 : 0,
    ">": (operand1: number, operand2: number) =>
      operand1 > operand2 ? 1 : 0,
    "<=": (operand1: number, operand2: number) =>
      operand1 <= operand2 ? 1 : 0,
    ">=": (operand1: number, operand2: number) =>
      operand1 >= operand2 ? 1 : 0,
    "&&": (operand1: number, operand2: number) =>
      operand1 && operand2,
    "||": (operand1: number, operand2: number) =>
      operand1 || operand2,
    "<<": (operand1: number, operand2: number) =>
      (operand1 << operand2) >>> 0,
    ">>": (operand1: number, operand2: number) =>
      (operand1 >>> operand2) >>> 0,
    "&": (operand1: number, operand2: number) => operand1 & operand2,
    "|": (operand1: number, operand2: number) => operand1 | operand2,
    "^": (operand1: number, operand2: number) => operand1 ^ operand2
  };

  const stack: number[] = [];
  let depth = 0;
  let curr_expr = expr.slice(0);
  while (curr_expr) {
    // Trim leading whitespace
    curr_expr = curr_expr.trim();

    // Check if empty after trimming
    if (!curr_expr) break;

    // Look for ${Value}, which is the control's value.
    const value_regexp = /^\${Value}(\s|$)(.*)$/;
    const is_value = value_regexp.exec(curr_expr);
    if (is_value) {
      stack[depth] = ctrlValue;
      depth += 1;
      curr_expr = is_value[2];
      continue;
    }

    // Look for a literal in the string, and convert to a number.
    const literal_regexp = /^([0-9]+)(\s|$)(.*)$/;
    const is_literal = literal_regexp.exec(curr_expr);
    if (is_literal) {
      stack[depth] = Number(is_literal[1]);
      depth += 1;
      curr_expr = is_literal[3];
      continue;
    }

    let found = false;
    // Process any unary operators.
    for (const [op, fn] of Object.entries(unaryOperators)) {
      const unary_regex = new RegExp(
        "^" +
          op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "(\\s|$)(.*)$"
      );
      const is_unary_operator = unary_regex.exec(curr_expr);
      if (is_unary_operator) {
        stack[depth - 1] = fn(stack[depth - 1]);
        curr_expr = is_unary_operator[2];
        found = true;
        break;
      }
    }
    if (found) continue;

    // Process any binary operators.
    for (const [op, fn] of Object.entries(binaryOperators)) {
      const binary_regex = new RegExp(
        "^" +
          op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "(\\s|$)(.*)$"
      );
      const is_binary_operator = binary_regex.exec(curr_expr);
      if (is_binary_operator) {
        stack[depth - 2] = fn(stack[depth - 2], stack[depth - 1]);
        depth -= 1;
        curr_expr = is_binary_operator[2];
        found = true;
        break;
      }
    }
    if (found) continue;

    // Process ternary "?" style operators.
    const ternary_regexp = /^\?(\s|$)(.*)$/;
    const is_ternary_operator = ternary_regexp.exec(curr_expr);
    if (is_ternary_operator) {
      if (stack[depth - 3]) {
        stack[depth - 3] = stack[depth - 2];
      } else {
        stack[depth - 3] = stack[depth - 1];
      }
      depth -= 2;
      curr_expr = is_ternary_operator[2];
      continue;
    }

    // If we reach here, we have an unrecognized token - prevent infinite loop
    throw new Error(
      `Unrecognized token in expression: "${curr_expr}"`
    );
  }

  // Return the value that remains on the stack. Assumes the expression was well-formed.
  return stack[0];
}

// Generate a string that contains the register writes for a sequence.
export function genCode(
  indent: string,
  seq: SocPinConfig[],
  ctrlValue = 0
) {
  let code = "";

  if (seq) {
    let register = "unknown";
    let operation;
    let accumValue = 0;
    let accumMask = 0;

    for (let idx = 0; idx < seq.length; idx++) {
      const op = seq[idx];

      if (op.Operation != "WithPrevious") operation = op.Operation;
      if (op.Register) register = op.Register;

      let register_macro = register;
      if (it.cfsconfig.Soc.toLowerCase().includes("adsp"))
        register_macro = "*pREG_" + register_macro;

      if (operation === "Read") {
        // Just read the register but do nothing with it.
        // Cannot be a pending operation.
        if (code) code += "\n";
        code += `${indent}${register_macro};`;
      } else {
        const pending =
          Number(idx) < seq.length - 1 &&
          seq[Number(idx) + 1].Operation === "WithPrevious";
        const reg = it.datamodel.Registers.find(
          (r) => r.Name == register
        );
        const field = reg?.Fields.find((f) => f.Name == op.Field);
        if (!field) {
          throw new Error(
            `Could not find field: "${op.Field}" in register: "${register}"`
          );
        }
        const mask = (1 << field.Length) - 1;
        let valueString;
        let maskString;
        // Work out what the op value is from the step's Value field.
        const opValue = evaluateExpression(op.Value, ctrlValue);

        if (pending || accumMask != 0) {
          accumValue |= opValue << field.Position;
          accumMask |= ((1 << field.Length) - 1) << field.Position;
        }

        if (!pending) {
          let shift;
          if (accumMask != 0) {
            shift = 0;
          } else {
            shift = field.Position;
            accumValue = Number(opValue);
            accumMask = mask;
          }

          if (accumValue < 10) valueString = `${String(accumValue)}U`;
          else valueString = `0x${accumValue.toString(16)}U`;
          if (accumMask < 10) maskString = `${String(accumMask)}U`;
          else maskString = `0x${accumMask.toString(16)}U`;

          if (operation === "Write") {
            if (field.Length == 32) {
              // Replace entire register value
              if (code) code += "\n";
              code += `${indent}${register_macro} = ${valueString};`;
            } else if (accumValue != accumMask && accumValue != 0) {
              // Neither all zeros nor all ones
              if (code) code += "\n";
              if (shift > 0) {
                code += `${indent}${register_macro} = ((${register_macro} & ~(${maskString} << ${String(shift)})) | (${valueString} << ${String(shift)}));`;
              } else {
                code += `${indent}${register_macro} = ((${register_macro} & ~${maskString}) | ${valueString});`;
              }
            } else if (accumValue == 0) {
              // Clear the field to set to all zeros
              if (code) code += "\n";
              if (shift > 0) {
                code += `${indent}${register_macro} &= ~(${maskString} << ${String(shift)});`;
              } else {
                code += `${indent}${register_macro} &= ~${maskString};`;
              }
            } else {
              // Set the field to all ones
              if (code) code += "\n";
              if (shift > 0) {
                code += `${indent}${register_macro} |= (${valueString} << ${String(shift)});`;
              } else {
                code += `${indent}${register_macro} |= ${valueString};`;
              }
            }
          } else if (operation === "Poll") {
            // Loop until field takes desired value
            if (code) code += "\n";
            if (field.Length < 32) {
              if (shift > 0) {
                code += `${indent}while (((${register_macro} >> ${String(shift)}) & ${maskString}) != ${valueString}) {\n`;
              } else {
                code += `${indent}while ((${register_macro} & ${maskString}) != ${valueString}) {\n`;
              }
            } else {
              code += `${indent}while (${register_macro} != ${valueString}) {\n`;
            }
            code += `${indent}}`;
          }

          if (op.Wait) {
            code += "\n";
            code += `${indent}sleep(${String(op.Wait)});`;
          }

          accumValue = 0;
          accumMask = 0;
        }
      }
    }
  }
  return code;
}

/**
 * Get the configuration value from a peripheral instance's config
 * @param peripheral - The peripheral instance
 * @param key - UI Control ID
 * @param defaultValue - The default value to return if the key is not found or is empty
 * @returns The configuration value or the default value
 */
export function getPeriConfigValue(
  peripheral: string,
  key: string,
  defaultValue: string | null
): string | null {
  const configuredPeripheral = getAssignedPeripheral(peripheral);
  const value = configuredPeripheral?.Config?.[key];
  return value && value.trim() !== "" ? value : defaultValue;
}

export function isPinConfigurable(pin: CfsConfig["Pins"][number]): boolean {
  if (!getPin(pin)?.Signals) {
    return false;
  }
  const slot = getSignal(pin)?.PinMuxSlot;
  return slot !== undefined && slot !== null;
}

export function isPinSupported(pin: CfsConfig["Pins"][number]): boolean {
  return !!it.datamodel?.Peripherals?.find((p) => p.Name == pin.Peripheral)?.Signals?.find((p) => p.Name == pin.Signal);
}

// Discard pins which are not supported by the data model and sort pins alphabetically ["P0.0", "P0.1", "P0.2", "P0.10", "P0.11"]
export function sortedConfigurablePins(): CfsConfig["Pins"] {
  const collator = new Intl.Collator("en", {numeric: true, sensitivity: "base"});
  return [...it.cfsconfig.Pins].sort((a, b) =>
        collator.compare(getPin(a)?.Label ?? "", getPin(b)?.Label ?? "")
    ).filter(isPinConfigurable);
}

// List of unconfigurable signals as string, or null if all signals were supported
export function unconfigurableSignals(): string | null {
  const pins = it.cfsconfig.Pins.filter((x) => !isPinConfigurable(x));
  return pins.length > 0 ? pins.map((x) => (x.Peripheral + "_" + x.Signal)).sort().join(", ") : null;
}

// List of unsupported pins as string, or null if all pins are supported
export function unsupportedByDataModelSignals(): string | null {
  const pins = it.cfsconfig.Pins.filter((x) => !isPinSupported(x));
  return pins.length > 0 ? pins.map((x) => (x.Peripheral + "_" + x.Signal)).sort().join(", ") : null;
}

// Compare the current project's Zephyr version against the supplied version.
// Returns a positive number, zero, or a negative number like String.localeCompare.
export function compareZephyrVersion(version: string) {
  const zephyrVersion = getProject()?.PlatformConfig?.ZephyrVersion;

  const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = String(zephyrVersion)
    .split(".").map((part) => Number.parseInt(part, 10) || 0);

  const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = version
    .split(".").map((part) => Number.parseInt(part, 10) || 0);

  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  } else if (leftMinor !== rightMinor) {
    return leftMinor - rightMinor;
  }
  return leftPatch - rightPatch;
}

// Filter an array of peripheral data entries by zephyrVersionMin / zephyrVersionMax.
// Returns an object with `supported` (entries matching the current version)
// and `unsupported` (entries outside the version range).
export function filterByZephyrVersion<T extends { zephyrVersionMin?: string; zephyrVersionMax?: string }>(
  entries: T[]
): { supported: T[]; unsupported: T[] } {
  const supported: T[] = [];
  const unsupported: T[] = [];
  for (const entry of entries) {
    if (
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      (entry.zephyrVersionMin && compareZephyrVersion(entry.zephyrVersionMin) < 0) ||
      (entry.zephyrVersionMax && compareZephyrVersion(entry.zephyrVersionMax) > 0)
    ) {
      unsupported.push(entry);
    } else {
      supported.push(entry);
    }
  }
  return { supported, unsupported };
}

// Build unsupported_in_dts entries for peripherals filtered out by Zephyr version.
// Returns an array of objects with `datamodel`, `diag`, and optionally `ctrl` and `value`.
export function buildUnsupportedVersionEntries(
  filteredOut: { datamodel: string; enable?: string; zephyrVersionMin?: string; zephyrVersionMax?: string }[]
): { datamodel: string; diag: string; ctrl?: string; value?: string }[] {
  return filteredOut.map(peri => {
    let versionDetail = "";
    if (peri.zephyrVersionMin && peri.zephyrVersionMax) {
      versionDetail = ` Supported in Zephyr versions ${peri.zephyrVersionMin} to ${peri.zephyrVersionMax}.`;
    } else if (peri.zephyrVersionMin) {
      versionDetail = ` Supported in Zephyr version ${peri.zephyrVersionMin} or later.`;
    } else if (peri.zephyrVersionMax) {
      versionDetail = ` Supported up to Zephyr version ${peri.zephyrVersionMax}.`;
    }
    const entry: { datamodel: string; diag: string; ctrl?: string; value?: string } = {
      datamodel: peri.datamodel,
      diag: `The ${peri.datamodel} peripheral is not supported in devicetree for this configuration.${versionDetail}`
    };
    if (peri.enable) {
      entry.ctrl = peri.enable;
      entry.value = "TRUE";
    }
    return entry;
  });
}

/**
 * Copyright (c) 2026 Analog Devices, Inc.
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

/**
 * Maps a datamodel peripheral to its Zephyr devicetree node for code
 * generation. Used in the `peripheralData` array for each chip.
 *
 * This interface intentionally models only the fields the SDK reads when
 * building the `unsupported_in_dts` array (see `buildUnsupportedZephyrEntries`).
 * The `peripheralData` entries defined in each chip's codegen script carry many
 * additional fields (pin control, property bindings, subnodes, clock
 * configuration, etc.) that are consumed directly by the untyped devicetree
 * templates. Those fields are deliberately omitted here so this type does not
 * need to change every time Zephyr code generation gains a new field.
 *
 * - `datamodel`: The canonical datamodel peripheral name.
 * - `enable`: Optional datamodel control identifier that gates whether the node is set to `status = "okay"`.
 * - `cores`: Optional list of core IDs this mapping applies to. When present, the
 *   node is only treated as supported for those cores; on other cores it is
 *   reported as unsupported.
 * - `zephyrVersionMin`/`zephyrVersionMax`: Optional Zephyr version range in which the node is supported.
 */
export interface ZephyrPeripheralMapping {
	datamodel: string;
	enable?: string;
	cores?: string[];
	zephyrVersionMin?: string;
	zephyrVersionMax?: string;
}

/**
 * An entry in the unsupported list emitted by `buildUnsupportedZephyrEntries`
 * (assigned to `unsupported_in_dts`). Describes a peripheral or feature that
 * cannot be represented in the generated Zephyr devicetree source (DTS)
 * `.dts`/`.overlay` for a given chip, so codegen emits a warning instead.
 *
 * - `datamodel`: Optional datamodel peripheral name.
 * - `clocknode`: Optional clock node name.
 * - `diag`: Diagnostic message describing why the entry is unsupported (required).
 * - `ctrl`: Optional datamodel control identifier for the unsupported feature (e.g., "ENABLE", "MUX", "DIV").
 * - `value`: Optional control value that triggers the warning.
 * - `default_value`: Optional default value modeled for the control.
 * - `cores`: Optional list of core IDs this entry applies to. When present, the
 *   entry is only emitted for those cores.
 * - `zephyrVersionMin`/`zephyrVersionMax`: Optional Zephyr version range for which this entry applies.
 */
export interface ZephyrDtsUnsupportedEntry {
	datamodel?: string;
	clocknode?: string;
	diag: string;
	ctrl?: string;
	value?: string;
	default_value?: string;
	cores?: string[];
	zephyrVersionMin?: string;
	zephyrVersionMax?: string;
}

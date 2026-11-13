/* eslint-disable no-template-curly-in-string */
/**
 *
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

import type {
	ConfigFields,
	ControlCfg,
	RegisterConfigField,
	RegisterDictionary
} from '@common/types/soc';
import computeRegisterValue, {
	computeDefaultValues,
	computeFieldValue,
	getNamespacedControlIntegerValue
} from './compute-register-value';
import {initializeRegisterDictionary} from './register-dictionary';
import {initializeSocControls} from './soc-controls';

/**
 * Minimal fixture: a single register "TEST_REG" at address 0x40000000
 * with two fields:
 *   - CTRL: bits [7:0] (position=0, length=8, reset=0x12)
 *   - MODE: bits [15:8] (position=8, length=8, reset=0xAB)
 */
const TEST_REGISTERS = [
	{
		Name: 'TEST_REG',
		Description: 'Test register for slice tests',
		Address: '0x40000000',
		Size: 32,
		Fields: [
			{
				Name: 'CTRL',
				Description: 'Control field',
				Documentation: 'Control field.',
				Position: 0,
				Length: 8,
				Access: 'R/W' as const,
				Reset: 0x12
			},
			{
				Name: 'MODE',
				Description: 'Mode field',
				Documentation: 'Mode field.',
				Position: 8,
				Length: 8,
				Access: 'R/W' as const,
				Reset: 0xab
			}
		]
	}
];

/** Controls fixture: one enum and one integer control in "TestPeripheral" */
const TEST_CONTROLS: Record<string, ControlCfg[]> = {
	TestPeripheral: [
		{
			Id: 'SLICE_ENUM',
			Description: 'A control that writes slices',
			Type: 'enum',
			EnumValues: [
				{Id: 'OPT_A', Description: 'Option A', Value: 1},
				{Id: 'OPT_B', Description: 'Option B', Value: 2}
			]
		},
		{
			Id: 'SLICE_INT',
			Description: 'An integer control writing a slice',
			Type: 'integer'
		},
		{
			Id: 'FULL_AND_SLICE',
			Description: 'A control mixing full and slice writes',
			Type: 'enum',
			EnumValues: [
				{Id: 'ALPHA', Description: 'Alpha', Value: 5},
				{Id: 'BETA', Description: 'Beta', Value: 7}
			]
		},
		{
			Id: 'BOOL_CTRL',
			Description: 'A boolean control using the VALUE shorthand',
			Type: 'boolean'
		}
	] as unknown as ControlCfg[]
};

/** Helper to build a RegisterDictionary from our fixture */
function getTestRegister(): RegisterDictionary {
	const reg = TEST_REGISTERS[0];

	return {
		name: reg.Name,
		description: reg.Description,
		address: reg.Address,
		size: reg.Size,
		reset: reg.Fields.reduce(
			(acc, f) => acc + f.Reset * 2 ** f.Position,
			0
		),
		fields: reg.Fields.map((f, i) => ({
			id: `${f.Name}-${i}`,
			name: f.Name,
			description: f.Description,
			documentation: f.Documentation,
			position: f.Position,
			length: f.Length,
			reset: f.Reset,
			access: f.Access
		}))
	};
}

describe('Slice support in compute-register-value', () => {
	before(() => {
		initializeRegisterDictionary(TEST_REGISTERS as any);
		initializeSocControls(TEST_CONTROLS as any);
	});

	describe('computeRegisterValue with slices', () => {
		const testRegister = getTestRegister();

		it('should write only the slice bits, leaving other bits at reset', () => {
			// Write value 0x3 to CTRL[3:2] (SlicePosition=2, SliceWidth=2)
			const configField: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '3',
				Operation: 'Write',
				ControlValue: 3,
				SlicePosition: 2,
				SliceWidth: 2
			};

			const result = computeRegisterValue(
				[{pinConfig: [configField], signalConfig: undefined}],
				[],
				testRegister
			);

			// Reset: CTRL=0x12 (00010010), MODE=0xAB
			// Full reset = 0x0000AB12
			// Slice write: bits [3:2] of CTRL set to 3 (binary 11)
			// CTRL becomes: 00010010 -> clear bits 3:2 (00010000) -> set 1100 -> 00011110 = 0x1E
			// Full register: MODE at reset (0xAB << 8) | CTRL = 0xAB00 | 0x1E = 0xAB1E
			expect(result.value).to.equal('0x0000ab1e');
			expect(result.isResetValue).to.equal(false);
		});

		it('should leave register at reset when slice writes the reset value', () => {
			// CTRL reset = 0x12 = 0b00010010, bits [1:0] = 0b10 = 2
			// Write value 2 to CTRL[1:0] => no change from reset
			const configField: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '2',
				Operation: 'Write',
				ControlValue: 2,
				SlicePosition: 0,
				SliceWidth: 2
			};

			const result = computeRegisterValue(
				[{pinConfig: [configField], signalConfig: undefined}],
				[],
				testRegister
			);

			// Reset = 0x0000AB12, writing bits[1:0] to 2 (same as reset) => still reset
			expect(result.value).to.equal('0x0000ab12');
			expect(result.isResetValue).to.equal(true);
		});

		it('should handle multiple non-overlapping slices on the same field', () => {
			// Write 0x3 to CTRL[1:0] and 0x2 to CTRL[7:4]
			const slice1: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '3',
				Operation: 'Write',
				ControlValue: 3,
				SlicePosition: 0,
				SliceWidth: 2
			};

			const slice2: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '2',
				Operation: 'Write',
				ControlValue: 2,
				SlicePosition: 4,
				SliceWidth: 4
			};

			const result = computeRegisterValue(
				[{pinConfig: [slice1, slice2], signalConfig: undefined}],
				[],
				testRegister
			);

			// Reset CTRL = 0x12 = 0b0001_0010
			// After slice1 (bits[1:0] = 3): 0b0001_0011
			// After slice2 (bits[7:4] = 2): 0b0010_0011 = 0x23
			// Full register: 0xAB00 | 0x23 = 0xAB23
			expect(result.value).to.equal('0x0000ab23');
		});

		it('should allow a full-field write to override earlier slice writes', () => {
			// First a slice write, then a full-field write (applied in order)
			const sliceWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '0',
				Operation: 'Write',
				ControlValue: 0,
				SlicePosition: 0,
				SliceWidth: 2
			};

			const fullWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '255',
				Operation: 'Write',
				ControlValue: 255
			};

			const result = computeRegisterValue(
				[
					{
						pinConfig: [sliceWrite, fullWrite],
						signalConfig: undefined
					}
				],
				[],
				testRegister
			);

			// Full write of 0xFF to CTRL overrides the earlier slice
			// Register: 0xAB00 | 0xFF = 0xABFF
			expect(result.value).to.equal('0x0000abff');
		});

		it('should allow slice writes after a full-field write to overlay', () => {
			// Full-field write to CTRL=0xFF, then slice bits[3:2] to 0
			const fullWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '255',
				Operation: 'Write',
				ControlValue: 255
			};

			const sliceWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '0',
				Operation: 'Write',
				ControlValue: 0,
				SlicePosition: 2,
				SliceWidth: 2
			};

			const result = computeRegisterValue(
				[
					{
						pinConfig: [fullWrite, sliceWrite],
						signalConfig: undefined
					}
				],
				[],
				testRegister
			);

			// CTRL = 0xFF, then clear bits[3:2]: 0xFF & ~0xC = 0xF3
			// Register: 0xAB00 | 0xF3 = 0xABF3
			expect(result.value).to.equal('0x0000abf3');
		});
	});

	describe('computeFieldValue with slices', () => {
		const testRegister = getTestRegister();
		const ctrlField = testRegister.fields[0]; // CTRL: position=0, length=8, reset=0x12

		it('should return slice-modified field value', () => {
			// Write 0x3 to CTRL[7:6]
			const configField: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '3',
				Operation: 'Write',
				ControlValue: 3,
				SlicePosition: 6,
				SliceWidth: 2
			};

			const result = computeFieldValue(
				[{pinConfig: [configField], signalConfig: undefined}],
				[],
				'TEST_REG',
				ctrlField,
				0x12
			);

			// CTRL reset = 0x12 = 0b00010010
			// Write 3 to bits[7:6]: mask=0xC0, clear: 0x12 & ~0xC0 = 0x12, set: 0x12 | (3<<6) = 0x12 | 0xC0 = 0xD2
			expect(result).to.equal('0xd2');
		});

		it('should apply multiple slices', () => {
			const slice1: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '3',
				Operation: 'Write',
				ControlValue: 3,
				SlicePosition: 0,
				SliceWidth: 2
			};

			const slice2: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '15',
				Operation: 'Write',
				ControlValue: 15,
				SlicePosition: 4,
				SliceWidth: 4
			};

			const result = computeFieldValue(
				[{pinConfig: [slice1, slice2], signalConfig: undefined}],
				[],
				'TEST_REG',
				ctrlField,
				0x12
			);

			// Reset = 0x12 = 0b0001_0010
			// slice1: bits[1:0] = 3 → 0b0001_0011
			// slice2: bits[7:4] = 15 → 0b1111_0011 = 0xF3
			expect(result).to.equal('0xf3');
		});

		it('should let full-field write override everything then apply later slices', () => {
			const fullWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '0',
				Operation: 'Write',
				ControlValue: 0
			};

			const sliceWrite: RegisterConfigField = {
				Register: 'TEST_REG',
				Field: 'CTRL',
				Value: '7',
				Operation: 'Write',
				ControlValue: 7,
				SlicePosition: 0,
				SliceWidth: 3
			};

			const result = computeFieldValue(
				[
					{
						pinConfig: [fullWrite, sliceWrite],
						signalConfig: undefined
					}
				],
				[],
				'TEST_REG',
				ctrlField,
				0x12
			);

			// Full write sets CTRL=0, then slice sets bits[2:0]=7 → 0x07
			expect(result).to.equal('0x7');
		});
	});

	describe('computeDefaultValues with slices', () => {
		const controls: ControlCfg[] =
			TEST_CONTROLS.TestPeripheral as unknown as ControlCfg[];

		it('should detect default when slice writes match the sliced reset value', () => {
			// CTRL reset = 0x12 = 0b00010010
			// bits[1:0] of reset = 0b10 = 2
			// OPT_A has Value=1 which doesn't match → not default
			// OPT_B has Value=2 which matches → default
			const config: ConfigFields = {
				SLICE_ENUM: {
					OPT_A: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					],
					OPT_B: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.SLICE_ENUM).to.equal('OPT_B');
		});

		it('should detect default for integer control with sliced field', () => {
			// CTRL reset = 0x12, bits[7:4] = 0x1 = 1
			const config: ConfigFields = {
				SLICE_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 4,
							SliceWidth: 4
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.SLICE_INT).to.equal('1');
		});

		it('should handle mixed full-field and slice writes correctly', () => {
			// ALPHA: writes full CTRL=5, then slice bits[7:4]=0
			//   Full write value=5 → uncovered bits [3:0] of reset are 0x2 (from 0x12)
			//   5 & 0x0F = 5, reset & 0x0F = 2 → doesn't match
			// BETA: writes full CTRL=0x12 (matches full reset uncovered), then slice bits[7:4]=0xA
			//   reset bits[7:4] = 1, slice value = 0xA → slice doesn't match reset
			// Neither matches → fallback to first key (ALPHA)
			const config: ConfigFields = {
				FULL_AND_SLICE: {
					ALPHA: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '0',
							Operation: 'Write',
							SlicePosition: 4,
							SliceWidth: 4
						}
					],
					BETA: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '10',
							Operation: 'Write',
							SlicePosition: 4,
							SliceWidth: 4
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			// Neither matches reset → falls back to first enum option
			expect(result.FULL_AND_SLICE).to.equal('ALPHA');
		});

		it('should detect default when full-field matches uncovered bits and slice matches its portion', () => {
			// Use OPT_A (Value=1) and OPT_B (Value=2)
			// CTRL reset = 0x12, bits[3:0] = 0x2, bits[7:4] = 0x1
			// If we full-write value=0x92 (matching bits[3:0]) and slice bits[7:4]=1 (matching reset)
			// OPT_B (Value=2): full write uncovered[3:0]=2 matches reset[3:0]=2 ✓, slice[7:4]=1 matches reset ✓
			const config: ConfigFields = {
				SLICE_ENUM: {
					OPT_A: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '1',
							Operation: 'Write',
							SlicePosition: 4,
							SliceWidth: 4
						}
					],
					OPT_B: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '0x92',
							Operation: 'Write'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '1',
							Operation: 'Write',
							SlicePosition: 4,
							SliceWidth: 4
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			// Match = OPT_B
			expect(result.SLICE_ENUM).to.equal('OPT_B');
		});
	});

	describe('getIntegerControlResetValue via computeDefaultValues (multi-step VALUE)', () => {
		it('should handle a single non-sliced VALUE step', () => {
			// CTRL reset = 0x12 = 18
			const controls: ControlCfg[] = [
				{
					Id: 'FULL_INT',
					Description: 'Integer with full write',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				FULL_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.FULL_INT).to.equal('18');
		});

		it('should skip non-write and non-Value steps when combining', () => {
			// Only the write step with ${Value} should contribute
			const controls: ControlCfg[] = [
				{
					Id: 'MIXED_OPS_INT',
					Description: 'Integer with mixed operations',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				MIXED_OPS_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '0xFF',
							Operation: 'Write'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Operation: 'Read'
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 4
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			// Only the last step contributes (write with ${Value}, bits[3:0] of reset 0x12 = 0x2)
			expect(result.MIXED_OPS_INT).to.equal('2');
		});

		it('should apply InverseValue when recovering the control reset value', () => {
			// CTRL reset = 0x12 = 18
			// InverseValue "${Value} 0xFF ^" inverts: 18 XOR 0xFF = 0xED = 237
			const controls: ControlCfg[] = [
				{
					Id: 'INVERSE_INT',
					Description: 'Integer with inverse expression',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				INVERSE_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							InverseValue: '${Value} 0xFF ^'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.INVERSE_INT).to.equal('237');
		});
	});

	describe('computeDefaultValues with VALUE-based enum (new-style)', () => {
		it('should find the enum option whose Value matches the register reset', () => {
			// CTRL reset = 0x12 = 18
			// Enum options: OPT_10 (Value=10), OPT_18 (Value=18), OPT_20 (Value=20)
			// Should select OPT_18
			const controls: ControlCfg[] = [
				{
					Id: 'VALUE_ENUM',
					Description: 'Enum using VALUE key',
					Type: 'enum',
					EnumValues: [
						{Id: 'OPT_10', Description: 'Option 10', Value: 10},
						{Id: 'OPT_18', Description: 'Option 18', Value: 18},
						{Id: 'OPT_20', Description: 'Option 20', Value: 20}
					]
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				VALUE_ENUM: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.VALUE_ENUM).to.equal('OPT_18');
		});

		it('should fall back to first enum option when no Value matches reset', () => {
			// CTRL reset = 0x12 = 18, no enum has Value=18
			const controls: ControlCfg[] = [
				{
					Id: 'VALUE_ENUM_NOMATCH',
					Description: 'Enum with no matching reset',
					Type: 'enum',
					EnumValues: [
						{Id: 'FIRST', Description: 'First', Value: 1},
						{Id: 'SECOND', Description: 'Second', Value: 2}
					]
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				VALUE_ENUM_NOMATCH: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.VALUE_ENUM_NOMATCH).to.equal('FIRST');
		});
	});

	describe('computeDefaultValues with plugin-disabled (Inactive) enum options', () => {
		it('should default to the active option over a reset-matching disabled option', () => {
			// CTRL reset = 0x12 = 0b00010010, bits[1:0] = 0b10 = 2.
			// A plugin has narrowed the MUX down to a single active option
			// (NA_MODE). PCLK (Value=2) matches the reset of CTRL[1:0] and so
			// would be chosen by the register-reset heuristic, but the plugin
			// has disabled it. The active NA_MODE option must win instead of
			// seeding the control with a now-disabled value.
			const controls: ControlCfg[] = [
				{
					Id: 'MUX_CTRL',
					Description: 'Clock Source',
					Type: 'enum',
					EnumValues: [
						{
							Id: 'NA_MODE',
							Description: 'N/A - 32-bit Mode',
							Value: 4
						},
						{
							Id: 'PCLK',
							Description: 'PCLK',
							Value: 2,
							Inactive: true
						},
						{Id: 'ISO', Description: 'ISO', Value: 1, Inactive: true}
					]
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				MUX_CTRL: {
					NA_MODE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					],
					PCLK: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					],
					ISO: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.MUX_CTRL).to.equal('NA_MODE');
		});

		it('should default to the active option even when it has no register config', () => {
			// CTRL reset bits[1:0] = 2. The single active option (NA_MODE) is
			// plugin-added and has no config entry of its own, so the only
			// config key belongs to the disabled PCLK option, whose Value=2
			// matches reset. The default must still resolve to NA_MODE.
			const controls: ControlCfg[] = [
				{
					Id: 'MUX_CTRL',
					Description: 'Clock Source',
					Type: 'enum',
					EnumValues: [
						{
							Id: 'NA_MODE',
							Description: 'N/A - 32-bit Mode',
							Value: 4
						},
						{
							Id: 'PCLK',
							Description: 'PCLK',
							Value: 2,
							Inactive: true
						}
					]
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				MUX_CTRL: {
					PCLK: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 2
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.MUX_CTRL).to.equal('NA_MODE');
		});
	});

	describe('getIntegerControlResetValue with expression-based Value (shift extraction)', () => {
		it('should apply InverseValue shift to recover original value from a single step', () => {
			// CTRL reset = 0x12
			// Value expression "${Value} 4 >>" means: write controlValue >> 4 to the field
			// The field stores 0x12 so the write was 0x12, meaning controlValue >> 4 = 0x12
			// InverseValue "${Value} 4 <<" recovers: 0x12 << 4 = 0x120 = 288
			const controls: ControlCfg[] = [
				{
					Id: 'SHIFT_INT',
					Description: 'Integer extracted via shift',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				SHIFT_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value} 4 >>',
							Operation: 'Write',
							InverseValue: '${Value} 4 <<'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.SHIFT_INT).to.equal('288');
		});

		it('should reconstruct full value by ORing multiple expression-extracted portions', () => {
			// CTRL reset = 0x12 = 0b0001_0010
			// Control value = 0x21 is split into two nibbles written to separate slices:
			//   Step 1: extracts lower nibble via "${Value} 0x0F &", writes to CTRL[7:4]
			//     Field slice reset: (0x21 >> 0) & 0xF = 0x1, write to CTRL[7:4]
			//     InverseValue "${Value}": contribution = CTRL[7:4] = 0x1
			//   Step 2: extracts upper nibble via "${Value} 4 >>", writes to CTRL[3:0]
			//     Field slice reset: (0x21 >> 4) & 0xF = 0x2, write to CTRL[3:0]
			//     InverseValue "${Value} 4 <<": contribution = CTRL[3:0] << 4 = 0x2 << 4 = 0x20
			// OR: 0x1 | 0x20 = 0x21 = 33
			const controls: ControlCfg[] = [
				{
					Id: 'SPLIT_INT',
					Description: 'Integer split across slices via expressions',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				SPLIT_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value} 0x0F &',
							Operation: 'Write',
							InverseValue: '${Value}',
							SlicePosition: 4,
							SliceWidth: 4
						},
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value} 4 >>',
							Operation: 'Write',
							InverseValue: '${Value} 4 <<',
							SlicePosition: 0,
							SliceWidth: 4
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.SPLIT_INT).to.equal('33');
		});

		it('should reconstruct value split across different fields', () => {
			// CTRL reset = 0x12, MODE reset = 0xAB
			// Control value = 0xAB12 is split:
			//   Step 1: lower byte via "${Value} 0xFF &" → writes to CTRL (reset=0x12)
			//     getSlicedResetValue → 0x12
			//     InverseValue "${Value}": contribution = 0x12
			//   Step 2: upper byte via "${Value} 8 >>" → writes to MODE (reset=0xAB)
			//     getSlicedResetValue → 0xAB
			//     InverseValue "${Value} 8 <<": contribution = 0xAB << 8 = 0xAB00
			// OR: 0x12 | 0xAB00 = 0xAB12 = 43794
			const controls: ControlCfg[] = [
				{
					Id: 'CROSS_FIELD_INT',
					Description: 'Integer split across two fields',
					Type: 'integer'
				}
			] as unknown as ControlCfg[];

			const config: ConfigFields = {
				CROSS_FIELD_INT: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value} 0xFF &',
							Operation: 'Write',
							InverseValue: '${Value}'
						},
						{
							Register: 'TEST_REG',
							Field: 'MODE',
							Value: '${Value} 8 >>',
							Operation: 'Write',
							InverseValue: '${Value} 8 <<'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.CROSS_FIELD_INT).to.equal('43794');
		});
	});

	describe('getNamespacedControlIntegerValue with boolean controls', () => {
		it('should resolve TRUE to 1', () => {
			expect(
				getNamespacedControlIntegerValue(
					'TestPeripheral',
					'BOOL_CTRL',
					'TRUE'
				)
			).to.equal(1);
		});

		it('should resolve FALSE to 0', () => {
			expect(
				getNamespacedControlIntegerValue(
					'TestPeripheral',
					'BOOL_CTRL',
					'FALSE'
				)
			).to.equal(0);
		});

		it('should be case-insensitive', () => {
			expect(
				getNamespacedControlIntegerValue(
					'TestPeripheral',
					'BOOL_CTRL',
					'true'
				)
			).to.equal(1);
			expect(
				getNamespacedControlIntegerValue(
					'TestPeripheral',
					'BOOL_CTRL',
					'false'
				)
			).to.equal(0);
		});
	});

	describe('computeDefaultValues with boolean VALUE shorthand', () => {
		const controls: ControlCfg[] = [
			{
				Id: 'BOOL_VALUE',
				Description: 'Boolean control using the VALUE shorthand',
				Type: 'boolean'
			}
		] as unknown as ControlCfg[];

		it('should default to TRUE when the register reset is non-zero', () => {
			// CTRL reset = 0x12 = 18 (non-zero) → TRUE
			const config: ConfigFields = {
				BOOL_VALUE: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.BOOL_VALUE).to.equal('TRUE');
		});

		it('should default to FALSE when the register reset bit is zero', () => {
			// CTRL reset = 0x12 = 0b0001_0010, bit[0] = 0 → FALSE
			const config: ConfigFields = {
				BOOL_VALUE: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 0,
							SliceWidth: 1
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.BOOL_VALUE).to.equal('FALSE');
		});

		it('should default to TRUE when the register reset bit is one', () => {
			// CTRL reset = 0x12 = 0b0001_0010, bit[0] = 1 → TRUE
			const config: ConfigFields = {
				BOOL_VALUE: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Value: '${Value}',
							Operation: 'Write',
							SlicePosition: 1,
							SliceWidth: 1
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.BOOL_VALUE).to.equal('TRUE');
		});

		it('should fall back to FALSE when no reset contribution is found', () => {
			// Only a non-write step → getIntegerControlResetValue yields ''
			const config: ConfigFields = {
				BOOL_VALUE: {
					VALUE: [
						{
							Register: 'TEST_REG',
							Field: 'CTRL',
							Operation: 'Read'
						}
					]
				}
			};

			const result = computeDefaultValues(config, controls);

			expect(result.BOOL_VALUE).to.equal('FALSE');
		});
	});
});

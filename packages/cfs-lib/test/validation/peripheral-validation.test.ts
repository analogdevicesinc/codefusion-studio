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

import { expect } from "chai";

import type {
	CfsSocDataModel,
	ConfiguredProject,
	SocControl
} from "cfs-types";

import { validatePeripheralControls } from "../../src/validation/peripheral-validation.js";

/**
 * Build a minimal SoC data model whose `Controls` are keyed by peripheral
 * name, populated only with the fields the check reads.
 * @param controls - Control definitions keyed by peripheral name.
 * @returns A data model shaped just enough for control validation.
 */
function dataModel(
	controls: Record<string, Partial<SocControl>[]>
): CfsSocDataModel {
	return { Controls: controls } as unknown as CfsSocDataModel;
}

/**
 * Build a single-project document with the given peripherals.
 * @param peripherals - The configured peripherals to place on the project.
 * @returns A one-element projects array.
 */
function projects(
	peripherals: Array<{
		Name: string;
		Config?: Record<string, string>;
		Signals?: Array<{
			Name: string;
			Config?: Record<string, string>;
		}>;
	}>
): ConfiguredProject[] {
	return [
		{
			Peripherals: peripherals.map((p) => ({
				Config: {},
				Signals: [],
				...p
			}))
		}
	] as unknown as ConfiguredProject[];
}

describe("validatePeripheralControls", () => {
	it("returns no diagnostics for an in-range value", () => {
		const model = dataModel({
			I2C0: [
				{
					Id: "FREQ",
					Type: "integer",
					MinimumValue: 1,
					MaximumValue: 8
				}
			]
		});

		const diagnostics = validatePeripheralControls(
			projects([{ Name: "I2C0", Config: { FREQ: "4" } }]),
			model
		);

		expect(diagnostics).to.be.empty;
	});

	it("flags a peripheral control value out of range", () => {
		const model = dataModel({
			I2C0: [
				{
					Id: "FREQ",
					Type: "integer",
					MinimumValue: 1,
					MaximumValue: 8
				}
			]
		});

		const diagnostics = validatePeripheralControls(
			projects([{ Name: "I2C0", Config: { FREQ: "99" } }]),
			model
		);

		expect(diagnostics).to.have.lengthOf(1);
		expect(diagnostics[0].ruleId).to.equal("control-invalid-value");
		expect(diagnostics[0].severity).to.equal("critical");
		expect(diagnostics[0].instancePath).to.equal(
			"/Projects/0/Peripherals/0/Config/FREQ"
		);
		expect(diagnostics[0].value).to.equal("99");
	});

	it("ignores Signals[].Config, which holds pin config not peripheral controls", () => {
		const model = dataModel({
			I2C0: [
				{
					Id: "DRIVE",
					Type: "integer",
					MinimumValue: 0,
					MaximumValue: 3
				}
			]
		});

		// DRIVE=9 is out of range, but it lives in a signal's Config, which
		// stores persisted pin configuration (PinCfg) rather than peripheral
		// control values, so it must not be validated against the peripheral's
		// Controls.
		const diagnostics = validatePeripheralControls(
			projects([
				{
					Name: "I2C0",
					Signals: [{ Name: "SCL", Config: { DRIVE: "9" } }]
				}
			]),
			model
		);

		expect(diagnostics).to.be.empty;
	});

	it("skips controls that declare a condition", () => {
		const model = dataModel({
			I2C0: [
				{
					Id: "FREQ",
					Type: "integer",
					MinimumValue: 1,
					MaximumValue: 8,
					// eslint-disable-next-line no-template-curly-in-string
					Condition: "${Control:MODE} 1 ="
				}
			]
		});

		const diagnostics = validatePeripheralControls(
			projects([{ Name: "I2C0", Config: { FREQ: "99" } }]),
			model
		);

		expect(diagnostics).to.be.empty;
	});

	it("skips values with no matching control definition", () => {
		const model = dataModel({
			I2C0: [
				{
					Id: "FREQ",
					Type: "integer",
					MinimumValue: 1,
					MaximumValue: 8
				}
			]
		});

		const diagnostics = validatePeripheralControls(
			projects([{ Name: "I2C0", Config: { UNKNOWN: "99" } }]),
			model
		);

		expect(diagnostics).to.be.empty;
	});

	it("skips peripherals with no controls in the model", () => {
		const model = dataModel({});

		const diagnostics = validatePeripheralControls(
			projects([{ Name: "I2C0", Config: { FREQ: "99" } }]),
			model
		);

		expect(diagnostics).to.be.empty;
	});
});

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

import type { CfsSocDataModel, SocPinSignal } from "cfs-types";

import {
	pinInConflict,
	validatePinConfiguration
} from "../../src/validation/pin-validation.js";

/**
 * Build a data model signal with only the fields the checks read.
 * @param peripheral - The signal's peripheral.
 * @param name - The signal's name.
 * @param extra - Optional `PinMuxSlot` / `IsInputTap` overrides.
 * @returns The minimal signal.
 */
function signal(
	peripheral: string,
	name: string,
	extra: Partial<SocPinSignal> = {}
): SocPinSignal {
	return { Peripheral: peripheral, Name: name, ...extra };
}

/**
 * Build the `${pin}__${peripheral}__${signal}` lookup that
 * {@link pinInConflict} consumes for a single physical pin.
 * @param pin - The physical pin name.
 * @param signals - The signals defined on that pin.
 * @returns The populated lookup.
 */
function lookupFor(
	pin: string,
	signals: SocPinSignal[]
): Map<string, SocPinSignal> {
	const lookup = new Map<string, SocPinSignal>();

	for (const s of signals) {
		lookup.set(`${pin}__${s.Peripheral}__${s.Name}`, s);
	}

	return lookup;
}

/**
 * Build a minimal SoC data model made of the given packages.
 * @param packages - The packages, each with its pins and their signals.
 * @returns A data model shaped just enough for the pin checks.
 */
function dataModel(
	packages: Array<{
		name: string;
		pins: Array<{ name: string; signals: SocPinSignal[] }>;
	}>
): CfsSocDataModel {
	return {
		Packages: packages.map((pkg) => ({
			Name: pkg.name,
			Pins: pkg.pins.map((pin) => ({
				Name: pin.name,
				Signals: pin.signals
			}))
		}))
	} as unknown as CfsSocDataModel;
}

describe("pinInConflict", () => {
	it("does not flag a single function signal", () => {
		const lookup = lookupFor("P0.0", [
			signal("UART0", "TX", { PinMuxSlot: 1 })
		]);

		expect(
			pinInConflict(
				[{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" }],
				lookup
			)
		).to.be.false;
	});

	it("flags two function signals on the same pin", () => {
		const lookup = lookupFor("P0.0", [
			signal("UART0", "TX", { PinMuxSlot: 1 }),
			signal("SPI0", "MOSI", { PinMuxSlot: 2 })
		]);

		expect(
			pinInConflict(
				[
					{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" },
					{ Pin: "P0.0", Peripheral: "SPI0", Signal: "MOSI" }
				],
				lookup
			)
		).to.be.true;
	});

	it("does not flag a function signal alongside an input tap", () => {
		const lookup = lookupFor("P0.0", [
			signal("UART0", "TX", { PinMuxSlot: 1 }),
			signal("ADC0", "TAP", { IsInputTap: true })
		]);

		expect(
			pinInConflict(
				[
					{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" },
					{ Pin: "P0.0", Peripheral: "ADC0", Signal: "TAP" }
				],
				lookup
			)
		).to.be.false;
	});

	it("flags an auto GPIO signal alongside an input tap", () => {
		const lookup = lookupFor("P0.0", [
			signal("GPIO", "G0"),
			signal("ADC0", "TAP", { IsInputTap: true })
		]);

		expect(
			pinInConflict(
				[
					{ Pin: "P0.0", Peripheral: "GPIO", Signal: "G0" },
					{ Pin: "P0.0", Peripheral: "ADC0", Signal: "TAP" }
				],
				lookup
			)
		).to.be.true;
	});

	it("treats an unknown signal as an auto GPIO", () => {
		const lookup = lookupFor("P0.0", []);

		// One unknown signal on its own is not a conflict.
		expect(
			pinInConflict(
				[{ Pin: "P0.0", Peripheral: "X", Signal: "A" }],
				lookup
			)
		).to.be.false;

		// Two unknown signals count as two auto GPIOs, which conflict.
		expect(
			pinInConflict(
				[
					{ Pin: "P0.0", Peripheral: "X", Signal: "A" },
					{ Pin: "P0.0", Peripheral: "Y", Signal: "B" }
				],
				lookup
			)
		).to.be.true;
	});
});

describe("validatePinConfiguration", () => {
	it("tolerates pins that declare no signals", () => {
		// Power and ground pins omit `Signals` entirely. 578 such pins appear
		// across 25 of the 44 shipped SoC data models, and indexing them used
		// to throw before any document pin was examined.
		const model = {
			Packages: [
				{
					Name: "BGA",
					Pins: [
						{ Name: "VDD" },
						{
							Name: "P0.0",
							Signals: [signal("UART0", "TX", { PinMuxSlot: 1 })]
						}
					]
				}
			]
		} as unknown as CfsSocDataModel;

		expect(() => validatePinConfiguration([], model)).to.not.throw();
		expect(
			validatePinConfiguration(
				[{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" }],
				model
			)
		).to.be.empty;
	});

	it("returns no diagnostics for a non-conflicting configuration", () => {
		const model = dataModel([
			{
				name: "WLP",
				pins: [
					{
						name: "P0.0",
						signals: [signal("UART0", "TX", { PinMuxSlot: 1 })]
					}
				]
			}
		]);

		const diagnostics = validatePinConfiguration(
			[{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" }],
			model
		);

		expect(diagnostics).to.be.empty;
	});

	it("reports a pin-conflict for each contributing signal", () => {
		const model = dataModel([
			{
				name: "WLP",
				pins: [
					{
						name: "P0.0",
						signals: [
							signal("UART0", "TX", { PinMuxSlot: 1 }),
							signal("SPI0", "MOSI", { PinMuxSlot: 2 })
						]
					}
				]
			}
		]);

		const diagnostics = validatePinConfiguration(
			[
				{ Pin: "P0.0", Peripheral: "UART0", Signal: "TX" },
				{ Pin: "P0.0", Peripheral: "SPI0", Signal: "MOSI" }
			],
			model
		);

		const conflicts = diagnostics.filter(
			(d) => d.ruleId === "pin-conflict"
		);
		expect(conflicts).to.have.lengthOf(2);
		expect(conflicts.map((d) => d.instancePath)).to.deep.equal([
			"/Pins/0/Signal",
			"/Pins/1/Signal"
		]);
		expect(conflicts.every((d) => d.severity === "critical")).to.be
			.true;
	});

	it("surfaces a control error persisted on a pin", () => {
		const model = dataModel([
			{
				name: "WLP",
				pins: [
					{
						name: "P0.0",
						signals: [signal("UART0", "TX", { PinMuxSlot: 1 })]
					}
				]
			}
		]);

		const diagnostics = validatePinConfiguration(
			[
				{
					Pin: "P0.0",
					Peripheral: "UART0",
					Signal: "TX",
					Errors: { PWR: "INVALID_INTEGER" }
				}
			],
			model
		);

		const controlErrors = diagnostics.filter(
			(d) => d.ruleId === "control-invalid"
		);
		expect(controlErrors).to.have.lengthOf(1);
		expect(controlErrors[0].instancePath).to.equal(
			"/Pins/0/Errors/PWR"
		);
		expect(controlErrors[0].value).to.equal("INVALID_INTEGER");
	});
});

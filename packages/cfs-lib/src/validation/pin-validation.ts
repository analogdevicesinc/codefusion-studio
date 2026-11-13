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
	CfsSocDataModel,
	ConfiguredPin,
	ConfiguredProject,
	SocPinSignal
} from "cfs-types";

import type { CheckDiagnostic } from "../config/check-types.js";
import { escapeJsonPointerToken } from "../utils/string-utils.js";

/**
 * A single signal assignment as it appears in a `.cfsconfig` `Pins` entry.
 * `Signal` here corresponds to the SoC data model signal's `Name`.
 */
type AssignedSignal = Pick<
	ConfiguredPin,
	"Pin" | "Peripheral" | "Signal"
>;

/**
 * Build a lookup from a `${pin}__${peripheral}__${signal}` key to the SoC
 * data model signal definition.
 *
 * Every package in the model is indexed. In practice a resolved data model is
 * package-specific (each shipped model file contains only the one package the
 * document targets), so this is equivalent to indexing that package without
 * having to match it by name.
 * @param dataModel - The SoC data model to index.
 * @returns The signal lookup keyed by pin, peripheral and signal name.
 */
function buildPinSignalLookup(
	dataModel: CfsSocDataModel
): Map<string, SocPinSignal> {
	const lookup = new Map<string, SocPinSignal>();

	for (const pkg of dataModel.Packages ?? []) {
		for (const pin of pkg.Pins ?? []) {
			// Power and ground pins carry no `Signals` at all. 578 such pins
			// appear across 25 of the 44 shipped SoC data models.
			for (const signal of pin.Signals ?? []) {
				lookup.set(
					`${pin.Name}__${signal.Peripheral}__${signal.Name}`,
					signal
				);
			}
		}
	}

	return lookup;
}

/**
 * Determine whether the signals assigned to a single physical pin conflict.
 *
 * Signal metadata is read from a pre-built data model lookup, so this depends
 * only on its arguments and not on any ambient pin state.
 *
 * Input Tap signals do not conflict with function signals on automotive
 * parts. On automotive parts GPIO signals do not use the FER register, so
 * they conflict with input tap signals (and function signals). On MAX parts
 * there are no input taps and every signal, including GPIOs, is counted as a
 * function signal.
 * @param assignedSignals - The signals assigned to one physical pin.
 * @param pinSignalLookup - The data model signal lookup from
 * {@link buildPinSignalLookup}.
 * @returns True when the assignment over-subscribes the pin.
 */
export function pinInConflict(
	assignedSignals: AssignedSignal[],
	pinSignalLookup: Map<string, SocPinSignal>
): boolean {
	const signals = assignedSignals.map((s) =>
		pinSignalLookup.get(`${s.Pin}__${s.Peripheral}__${s.Signal}`)
	);

	const numFunctionSignals = signals.filter(
		(s) => typeof s?.PinMuxSlot !== "undefined"
	).length;
	const numAutoGpioSignals = signals.filter(
		(s) => typeof s?.PinMuxSlot === "undefined" && !s?.IsInputTap
	).length;
	const numInputTapSignals = signals.filter(
		(s) => s?.IsInputTap
	).length;

	return (
		numFunctionSignals + numAutoGpioSignals > 1 ||
		numAutoGpioSignals + numInputTapSignals > 1
	);
}

/**
 * Validate the pin configuration of a `.cfsconfig` document against its SoC
 * data model.
 *
 * Phase 1 covers the checks that need no expression evaluation:
 * - `pin-conflict`: two or more incompatible signals assigned to one pin.
 * - `control-invalid`: a control value error already persisted on a pin.
 *
 * Conditional checks (for example signals that are only required when another
 * control is set) are deferred until the RPN expression evaluator is shared
 * into cfs-lib.
 * @param pins - The configured pins from the document's `Pins` array.
 * @param socDataModel - The SoC data model the document targets.
 * @param projects - The document's projects, reserved for signal-ownership
 * checks, which we can do in a later phase.
 * @returns The diagnostics found, in document order.
 */
export function validatePinConfiguration(
	pins: ConfiguredPin[],
	socDataModel: CfsSocDataModel,
	projects?: ConfiguredProject[]
): CheckDiagnostic[] {
	// Reserved for signal-ownership checks in a later phase.
	void projects;

	const diagnostics: CheckDiagnostic[] = [];
	const lookup = buildPinSignalLookup(socDataModel);

	// Group the configured pins by physical pin, remembering each entry's
	// index so diagnostics can point back at the exact `Pins` element.
	const groups = new Map<
		string,
		{ pin: ConfiguredPin; index: number }[]
	>();

	pins.forEach((pin, index) => {
		const group = groups.get(pin.Pin) ?? [];
		group.push({ pin, index });
		groups.set(pin.Pin, group);
	});

	for (const [pinName, group] of groups) {
		const assigned = group.map(({ pin }) => pin);

		if (pinInConflict(assigned, lookup)) {
			for (const { pin, index } of group) {
				diagnostics.push({
					severity: "critical",
					ruleId: "pin-conflict",
					message: `Pin '${pinName}' has conflicting signals assigned.`,
					instancePath: `/Pins/${String(index)}/Signal`,
					value: pin.Signal
				});
			}
		}
	}

	// Return control-value errors already recorded on individual pins.
	pins.forEach((pin, index) => {
		for (const [controlId, errorType] of Object.entries(
			pin.Errors ?? {}
		)) {
			if (errorType) {
				diagnostics.push({
					severity: "critical",
					ruleId: "control-invalid",
					message: `Pin '${pin.Pin}' signal '${pin.Signal}' has an invalid '${controlId}' value (${errorType}).`,
					instancePath: `/Pins/${String(index)}/Errors/${escapeJsonPointerToken(controlId)}`,
					value: errorType
				});
			}
		}
	});

	return diagnostics;
}

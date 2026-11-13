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
	ConfiguredProject,
	SocControl
} from "cfs-types";

import type { CheckDiagnostic } from "../config/check-types.js";
import { escapeJsonPointerToken } from "../utils/string-utils.js";
import { getFormErrors } from "./control-validation.js";

/**
 * Validate a map of `controlId -> value` against a set of control definitions,
 * appending a `control-invalid-value` diagnostic for each value that fails.
 *
 * Only controls that exist in `controlsById` are checked; a value with no
 * matching definition is skipped rather than flagged, since there is nothing
 * to validate it against.
 * @param config - The persisted `controlId -> value` map to validate.
 * @param controlsById - The unconditional control definitions, keyed by id.
 * @param basePath - JSON Pointer to the `config` object being validated.
 * @param diagnostics - The list to append findings to.
 */
function collectControlDiagnostics(
	config: Record<string, string> | undefined,
	controlsById: Map<string, SocControl>,
	basePath: string,
	diagnostics: CheckDiagnostic[]
): void {
	for (const [controlId, value] of Object.entries(config ?? {})) {
		const control = controlsById.get(controlId);

		if (!control) continue;

		const message = getFormErrors({}, control, value)[controlId];

		if (message) {
			diagnostics.push({
				severity: "critical",
				ruleId: "control-invalid-value",
				message: `Control '${controlId}' has an invalid value: ${message}`,
				instancePath: `${basePath}/${escapeJsonPointerToken(controlId)}`,
				value
			});
		}
	}
}

/**
 * Validate the peripheral control values of a `.cfsconfig` document against
 * its SoC data model, recomputing each value's validity rather than trusting
 * any persisted error.
 *
 * This is the unconditional slice: controls that declare a `Condition` are
 * skipped, because deciding whether they apply needs the RPN expression
 * evaluator (not yet shared into cfs-lib). Controls with no condition always
 * apply, so their persisted values can be checked directly.
 *
 * Only the peripheral-level `Config` is checked. A peripheral's
 * `Signals[].Config` holds persisted pin configuration (the signal's
 * `PinCfg`), not peripheral control values, so validating it against
 * `Controls[peripheral.Name]` would use the wrong definitions; pin control
 * validation is a separate concern (against `Controls.PinConfig`) and is not
 * covered here.
 * @param projects - The document's projects, whose peripherals carry the
 * persisted control values.
 * @param socDataModel - The SoC data model the document targets. Its
 * `Controls` are keyed by peripheral name.
 * @returns The diagnostics found, in document order.
 */
export function validatePeripheralControls(
	projects: ConfiguredProject[],
	socDataModel: CfsSocDataModel
): CheckDiagnostic[] {
	const diagnostics: CheckDiagnostic[] = [];
	const controlsByPeripheral = socDataModel.Controls;

	projects.forEach((project, projectIndex) => {
		project.Peripherals.forEach((peripheral, peripheralIndex) => {
			const controls = controlsByPeripheral[peripheral.Name] ?? [];

			// Index only the controls that always apply (no condition).
			const unconditional = new Map<string, SocControl>();

			for (const control of controls) {
				if (!control.Condition) {
					unconditional.set(control.Id, control);
				}
			}

			if (unconditional.size === 0) return;

			collectControlDiagnostics(
				peripheral.Config,
				unconditional,
				`/Projects/${String(projectIndex)}/Peripherals/${String(
					peripheralIndex
				)}/Config`,
				diagnostics
			);
		});
	});

	return diagnostics;
}

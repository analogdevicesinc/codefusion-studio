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
import {
	addToRegisterConfigs,
	computeDefaultValues,
	type RegisterConfigs
} from './compute-register-value';
import {getSocControlsDictionary} from './soc-controls';
import {invalidateSruSignalGroupsCache} from './sru-navigation';
import type {
	ControlDictionary,
	Peripheral
} from '../../../common/types/soc';
import type {
	SocConfigFields,
	SruInputSignal,
	SruOutputSignal,
	SruSignal
} from 'cfs-types';
import type {SruConnectionEntry} from '../state/slices/sru/sru.selector';
import type {SruReroute} from '../types/sru';

/** Control id carrying the signal inversion flag rather than a routing target. */
const SRU_INVERT_CONTROL = 'INVERT';

const SRU_CONTROLS_NAMESPACE = 'SruConfig';

const sruDefaultConnections: Record<string, string> = {};
const sruInputSignals: Record<string, SruInputSignal> = {};
const sruOutputSignals: Record<string, SruOutputSignal> = {};
const sruSelectableOutputs: Record<string, string[]> = {};
const sruOutputToInputs: Record<string, string[]> = {};
/**
 * Peripheral names declaring each SRU signal name, in declaration order.
 * Usually a single entry, but names like `LOW`/`HIGH` are declared as SRU
 * outputs on both `DAI0` and `DAI1`, so a name can have more than one owner -
 * see {@link canRevealSruSignal}.
 */
const sruSignalOwners: Record<string, string[]> = {};
const sruPinBufferSubGroups = new Set<string>();

/** Records `owner` as a declarer of the SRU signal `name`. */
function assignSruSignalPeripheral(name: string, owner: string) {
	if (!sruSignalOwners[name]) {
		sruSignalOwners[name] = [];
	}

	sruSignalOwners[name].push(owner);
}

function clearCache(cache: Record<string, unknown>) {
	for (const key of Object.keys(cache)) {
		// Emptied in place rather than reassigned: consumers memoize on the
		// identity of the objects returned by the getters below.
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete cache[key];
	}
}

function resolveSelectableOutputs(
	config: SocConfigFields,
	sruControls: ControlDictionary
): string[] {
	const outputs = new Set<string>();

	for (const [controlId, enumIds] of Object.entries(config)) {
		if (controlId === SRU_INVERT_CONTROL) continue;

		const control = sruControls[controlId];

		if (!control) continue;

		if (typeof enumIds !== 'object' || enumIds === null) continue;

		const isWildcard = 'VALUE' in enumIds;

		for (const value of control.EnumValues ?? []) {
			if (isWildcard || value.Id in enumIds) {
				outputs.add(value.Id);
			}
		}
	}

	return [...outputs];
}

function getRoutingControlKey(
	config: SocConfigFields
): string | undefined {
	return Object.keys(config).find(key => key !== SRU_INVERT_CONTROL);
}

/**
 * Initializes SRU data caches from the SoC peripheral list.
 * Called during sysPlannerDataInit. Re-entrant: every cache is rebuilt from
 * scratch so a second init cannot accumulate duplicate entries.
 */
export function initializeSruData(peripherals: Peripheral[]) {
	clearCache(sruDefaultConnections);
	clearCache(sruInputSignals);
	clearCache(sruOutputSignals);
	clearCache(sruSelectableOutputs);
	clearCache(sruOutputToInputs);
	clearCache(sruSignalOwners);
	sruPinBufferSubGroups.clear();
	invalidateSruSignalGroupsCache();

	const sruControls = getSocControlsDictionary(
		SRU_CONTROLS_NAMESPACE
	);
	const sruControlValues = Object.values(sruControls);

	for (const peripheral of peripherals) {
		const sru = peripheral.SRU;

		if (!sru) continue;

		for (const input of sru.Inputs ?? []) {
			sruInputSignals[input.Name] = input;
			assignSruSignalPeripheral(input.Name, peripheral.Name);

			if (
				input.IsPinBufferEnable === true &&
				input.PeripheralSubGroup
			) {
				sruPinBufferSubGroups.add(input.PeripheralSubGroup);
			}

			const selectableOutputs = resolveSelectableOutputs(
				input.Config,
				sruControls
			);

			sruSelectableOutputs[input.Name] = selectableOutputs;

			for (const outputName of selectableOutputs) {
				if (!sruOutputToInputs[outputName]) {
					sruOutputToInputs[outputName] = [];
				}

				sruOutputToInputs[outputName].push(input.Name);
			}

			const routingControlKey = getRoutingControlKey(input.Config);

			if (!routingControlKey) continue;

			const defaults = computeDefaultValues(
				input.Config,
				sruControlValues
			);
			const source = defaults[routingControlKey];

			if (source) {
				sruDefaultConnections[input.Name] = source;
			}
		}

		for (const output of sru.Outputs ?? []) {
			sruOutputSignals[output.Name] = output;
			assignSruSignalPeripheral(output.Name, peripheral.Name);
		}
	}
}

/** Returns the SRU input or output signal with the given name. */
export function getSruSignal(
	signalName: string
): SruSignal | undefined {
	return sruInputSignals[signalName] ?? sruOutputSignals[signalName];
}

export function getSruInputSignals(): Record<string, SruInputSignal> {
	return sruInputSignals;
}

export function getSruOutputSignals(): Record<
	string,
	SruOutputSignal
> {
	return sruOutputSignals;
}

/** Returns a map of input signal name → output signal name representing the SoC default connections. */
export function getSruDefaultConnections(): Record<string, string> {
	return sruDefaultConnections;
}

/** Returns the legally routable output signal names for a given input. */
export function getSruSelectableOutputs(inputName: string): string[] {
	return sruSelectableOutputs[inputName] ?? [];
}

/** Returns the input signal names that can accept a given output. */
export function getSruSelectableInputs(outputName: string): string[] {
	return sruOutputToInputs[outputName] ?? [];
}

/**
 * Returns the owning peripheral name for an SRU signal. Arbitrary (the first
 * declared owner) when the signal is declared by more than one peripheral -
 * see {@link canRevealSruSignal}.
 */
export function getSruSignalPeripheral(
	signalName: string
): string | undefined {
	return sruSignalOwners[signalName]?.[0];
}

/**
 * Whether an SRU signal can be resolved to exactly one owning peripheral.
 * False both for names absent from the SoC's SRU signals and for names
 * declared by more than one peripheral (e.g. `LOW`/`HIGH`) - the latter have
 * no single card a jump could land on. Used to decide whether a connection
 * row's counterpart signal name can link to it.
 */
export function canRevealSruSignal(signalName: string): boolean {
	return sruSignalOwners[signalName]?.length === 1;
}

/**
 * Whether `subGroup` is the peripheral subgroup of a pin-buffer signal group.
 * Populated during {@link initializeSruData} from every `IsPinBufferEnable`
 * input's `PeripheralSubGroup`.
 */
export function isPinBufferSubGroup(
	subGroup: string | undefined
): boolean {
	return (
		subGroup !== undefined && sruPinBufferSubGroups.has(subGroup)
	);
}

/**
 * Whether an SRU input signal declares hardware polarity inversion support
 * (a `Config.INVERT` block), i.e. whether the "Invert signal polarity"
 * checkbox should render for it.
 */
export function supportsSruInversion(inputName: string): boolean {
	const config = sruInputSignals[inputName]?.Config;

	return config !== undefined && SRU_INVERT_CONTROL in config;
}

export function getSruRegisterConfigs(
	connections: Record<string, string>,
	inversions: Record<string, boolean>
): RegisterConfigs {
	const configs: RegisterConfigs = {};

	for (const [input, output] of Object.entries(connections)) {
		const inputSignal = sruInputSignals[input];

		if (!inputSignal) continue;

		if (!sruSelectableOutputs[input]?.includes(output)) continue;

		const routingControlKey = getRoutingControlKey(
			inputSignal.Config
		);

		if (!routingControlKey) continue;

		addToRegisterConfigs(
			configs,
			`${input} ${SRU_CONTROLS_NAMESPACE}`,
			SRU_CONTROLS_NAMESPACE,
			inputSignal.Config,
			routingControlKey,
			output
		);
	}

	for (const [input, inverted] of Object.entries(inversions)) {
		if (!inverted) continue;

		const inputSignal = sruInputSignals[input];

		if (!inputSignal?.Config[SRU_INVERT_CONTROL]) continue;

		addToRegisterConfigs(
			configs,
			`${input} ${SRU_CONTROLS_NAMESPACE}`,
			SRU_CONTROLS_NAMESPACE,
			inputSignal.Config,
			SRU_INVERT_CONTROL,
			'TRUE'
		);
	}

	return configs;
}

/**
 * Returns inputs that would be silently re-routed away from another
 * user-modified output when staged onto `newOutput`.
 */
export function getSruReroutes({
	selectableInputNames,
	stagedInputs,
	connectedInputs,
	connectionByInput,
	newOutput
}: {
	selectableInputNames: string[];
	stagedInputs: Set<string>;
	connectedInputs: string[];
	connectionByInput: Record<string, SruConnectionEntry>;
	newOutput: string;
}): SruReroute[] {
	const connectedSet = new Set(connectedInputs);
	const reroutes: SruReroute[] = [];

	for (const input of selectableInputNames) {
		if (!stagedInputs.has(input) || connectedSet.has(input)) {
			continue;
		}

		const connection = connectionByInput[input];

		if (
			connection?.status === 'modified' &&
			connection.output !== newOutput
		) {
			reroutes.push({
				input,
				previousOutput: connection.output
			});
		}
	}

	return reroutes;
}

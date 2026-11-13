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
	type CfsConfig,
	type ConfiguredProject,
	type PluginConfig,
	type SocControl
} from 'cfs-types';
import {
	type ScopeValueUsage,
	type ScopesDictionary
} from '../state/slices/scopes/scopes.reducer';
import {resolveTemplateString} from './rpn-expression-resolver';

type ScopedSocControl = SocControl & {
	Value?: string;
};

type ControlsByGroup = Record<string, ScopedSocControl[]>;

export type ControlsByProjectScope = Array<{
	controlScope: string;
	projectId: string;
	coreId: string;
	controlsByGroup: ControlsByGroup;
}>;

export type ScopesConfig = Pick<
	CfsConfig,
	'Projects' | 'Pins' | 'ClockNodes' | 'DFG'
>;

type PersistedControlValue = {
	value: string | undefined;
	groupId: string;
	itemId?: string;
	configPath?: string;

	/**
	 * Config for the concrete item that produced this value.
	 * Used when scope templates reference sibling controls.
	 * Example: "${ProjectId} ${String: zephyr dtnames } + ${Control:MODE}".
	 */
	config?: PluginConfig;
};

function getControlFallbackValue(
	control: ScopedSocControl
): string | undefined {
	if ('Value' in control && typeof control.Value === 'string') {
		return control.Value;
	}

	return undefined;
}

function normalizeScopeValue(value: string): string {
	return value.trim();
}

function normalizeScopedBooleanValue(
	value: string
): string | undefined {
	return value.trim().toLowerCase() === 'true' ? 'TRUE' : undefined;
}

function getConfigValue(
	config: PluginConfig | undefined,
	controlId: string
): string | undefined {
	const value = config?.[controlId];

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'boolean') {
		return value ? 'TRUE' : 'FALSE';
	}

	return undefined;
}

function getProject(
	configOptions: ScopesConfig | undefined,
	projectId: string
): ConfiguredProject | undefined {
	return configOptions?.Projects.find(
		project => project.ProjectId === projectId
	);
}

/**
 * Finds persisted values for a scoped control.
 *
 * A single control definition can map to multiple configured items.
 * Example: the memory controls under group "memory" apply to every partition.
 */
function getPersistedControlValues({
	configOptions,
	project,
	controlScope,
	groupId,
	control
}: {
	configOptions?: ScopesConfig;
	project?: ConfiguredProject;
	controlScope: string;
	groupId: string;
	control: ScopedSocControl;
}): PersistedControlValue[] {
	if (!configOptions) return [];

	if (controlScope === 'memory') {
		return (
			project?.Partitions?.flatMap(partition => {
				const value =
					getConfigValue(partition.Config, control.Id) ??
					getControlFallbackValue(control);

				if (value === undefined || value === null || value === '') {
					return [];
				}

				return [
					{
						value,
						groupId,
						itemId: partition.Name,
						configPath: `Projects.${project.ProjectId}.Partitions.${partition.Name}.Config.${control.Id}`,
						config: partition.Config
					}
				];
			}) ?? []
		);
	}

	if (controlScope === 'peripheral') {
		const peripheral = project?.Peripherals.find(
			item => item.Name === groupId
		);

		const value = getConfigValue(peripheral?.Config, control.Id);

		if (value === undefined) return [];

		return [
			{
				value,
				groupId,
				itemId: peripheral?.Name,
				configPath: `Projects.${project?.ProjectId}.Peripherals.${groupId}.Config.${control.Id}`,
				config: peripheral?.Config
			}
		];
	}

	if (controlScope === 'pinConfig') {
		return (
			project?.Peripherals?.flatMap(peripheral =>
				peripheral.Signals.flatMap(signal => {
					const value = getConfigValue(signal.Config, control.Id);

					if (value === undefined) return [];

					return [
						{
							value,
							groupId,
							itemId: signal.Name,
							configPath: `Projects.${project.ProjectId}.Peripherals.${peripheral.Name}.Signals.${signal.Name}.Config.${control.Id}`,
							config: signal.Config
						}
					];
				})
			) ?? []
		);
	}

	if (controlScope === 'clockConfig') {
		return configOptions.ClockNodes.flatMap(clockNode => {
			const isMatchingGroup = clockNode.Name === groupId;
			const isMatchingControl = clockNode.Control === control.Id;

			if (!isMatchingGroup || !isMatchingControl) return [];

			return [
				{
					value: clockNode.Value,
					groupId,
					itemId: clockNode.Name,
					configPath: `ClockNodes.${clockNode.Name}.${clockNode.Control}`
				}
			];
		});
	}

	if (controlScope === 'dfg') {
		const gasketValues =
			configOptions.DFG?.Gaskets.flatMap(gasket => {
				const value = getConfigValue(gasket.Config, control.Id);

				if (value === undefined) return [];

				return [
					{
						value,
						groupId: gasket.Name,
						itemId: gasket.Name,
						configPath: `DFG.Gaskets.${gasket.Name}.Config.${control.Id}`,
						config: gasket.Config
					}
				];
			}) ?? [];

		const endpointValues =
			configOptions.DFG?.Streams.flatMap(stream =>
				[stream.Source, ...stream.Destinations].flatMap(endpoint => {
					const value = getConfigValue(endpoint.Config, control.Id);

					if (value === undefined) return [];

					return [
						{
							value,
							groupId: endpoint.Gasket,
							itemId: `${endpoint.Gasket}[${endpoint.Index}]`,
							configPath: `DFG.Streams.${stream.StreamId}.Endpoints.${endpoint.Gasket}.${endpoint.Index}.Config.${control.Id}`,
							config: endpoint.Config
						}
					];
				})
			) ?? [];

		return [...gasketValues, ...endpointValues];
	}

	return [];
}

function addScopeValueUsage({
	scopes,
	scopeKey,
	normalizedValue,
	usage
}: {
	scopes: ScopesDictionary;
	scopeKey: string;
	normalizedValue: string;
	usage: ScopeValueUsage;
}) {
	scopes[scopeKey] ??= {};
	scopes[scopeKey][normalizedValue] ??= [];
	scopes[scopeKey][normalizedValue].push(usage);
}

/**
 * Builds the scope dictionary used by uniqueness validation.
 *
 * Shape:
 * scopeKey -> value -> usages[]
 *
 * Rules:
 * - Scopes containing ${ProjectId} are unique per project.
 * - Scopes containing ${CoreId} are unique per core.
 * - Scopes without a project/core token are globally unique.
 * - Boolean scoped controls only register checked values as "TRUE".
 */
export function buildScopesDictionary(
	controlsByProjectScope: ControlsByProjectScope,
	configOptions?: ScopesConfig
): ScopesDictionary {
	const scopes: ScopesDictionary = {};

	for (const {
		controlScope,
		projectId,
		coreId,
		controlsByGroup
	} of controlsByProjectScope) {
		const project = getProject(configOptions, projectId);

		for (const [groupId, controls] of Object.entries(
			controlsByGroup
		)) {
			for (const control of controls) {
				const scope = control.Scope;

				if (typeof scope !== 'string' || !scope) continue;

				const persistedValues = getPersistedControlValues({
					configOptions,
					project,
					controlScope,
					groupId,
					control
				});

				const values: PersistedControlValue[] =
					persistedValues.length > 0
						? persistedValues
						: [
								{
									value: getControlFallbackValue(control),
									groupId
								}
							];

				for (const scopedValue of values) {
					const {value} = scopedValue;

					// eslint-disable-next-line max-depth
					if (value === undefined || value === null || value === '') {
						continue;
					}

					const normalizedValue =
						control.Type === 'boolean'
							? normalizeScopedBooleanValue(value)
							: normalizeScopeValue(value);

					// eslint-disable-next-line max-depth
					if (!normalizedValue) continue;

					const scopeKey = String(
						resolveTemplateString(scope, {
							...Object.fromEntries(
								Object.entries(scopedValue.config ?? {}).map(
									([key, value]) => [key, String(value)]
								)
							),
							projectId,
							coreId
						})
					);

					// If scope templates reference unset values, avoid bucketing under sentinel markers.
					// eslint-disable-next-line max-depth
					if (
						scopeKey.includes('UNCONFIGURED') ||
						scopeKey.includes('Undef')
					) {
						continue;
					}

					addScopeValueUsage({
						scopes,
						scopeKey,
						normalizedValue,
						usage: {
							groupId: scopedValue.groupId,
							controlId: control.Id,
							value: normalizedValue,
							controlScope,
							projectId,
							coreId,
							scope,
							scopeKey,
							configPath: scopedValue.configPath,
							itemId: scopedValue.itemId
						}
					});
				}
			}
		}
	}

	return scopes;
}

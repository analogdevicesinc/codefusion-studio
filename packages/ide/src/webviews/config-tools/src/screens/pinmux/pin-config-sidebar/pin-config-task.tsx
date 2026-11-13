/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import ConfigPanel from '../../../components/config-panel/ConfigPanel';
import {useSignalProjectId} from '../../../state/slices/peripherals/peripherals.selector';
import PinconfigDisplay from './pinconfig-display/PinconfigDisplay';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';
import {useMemo} from 'react';
import {getControlsForProjectIds} from '../../../utils/api';
import {CfsSuspense, use} from 'cfs-react-library';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {
	getIsExternallyManagedProject,
	getPrimaryProjectId
} from '../../../utils/config';
import type {ControlCfg} from '@common/types/soc';
import {
	useAppliedSignalCfg,
	useAssignedPin
} from '../../../state/slices/pins/pins.selector';
import {getApplicablePinConfigControls} from './pinconfig-display/pin-config-controls';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {getSocPinDetails} from '../../../utils/soc-pins';
import {
	getConfigurablePeripherals,
	getSocPeripheralDictionary
} from '../../../utils/soc-peripherals';
import {isPinReserved} from '../../../utils/is-pin-reserved';
import {useCanConfigureReservedPin} from '../../../hooks/use-can-configure-reserved-pin';
import PinDetails from './pin-details/pin-details';

export const PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID =
	'pin-config-plugin-options-form';

type PinConfigTaskProps = Readonly<{
	peripheral: string;
	signal: string;
	pinId?: string;
}>;

type ConfiguredPinConfigPanelProps = PinConfigTaskProps &
	Readonly<{
		controlsPromise: Promise<Record<string, ControlCfg[]>>;
		projectId: string;
	}>;

function ConfiguredPinConfigPanel({
	controlsPromise,
	peripheral,
	pinId,
	projectId,
	signal
}: ConfiguredPinConfigPanelProps) {
	const controls = use(controlsPromise);
	const activePin = useAssignedPin({peripheral, signal});
	const resolvedPinId = activePin?.pinId ?? pinId;
	const {assignable} = getSocPeripheralDictionary()[peripheral];

	const userSelections = useAppliedSignalCfg(
		resolvedPinId,
		peripheral,
		signal
	)?.PinCfg;

	const signalPinConfig =
		activePin?.Signals?.find(
			pinSignal =>
				pinSignal.Name === signal &&
				pinSignal.Peripheral === peripheral
		)?.PinConfig ??
		(resolvedPinId
			? getSocPinDetails(resolvedPinId)?.Signals?.find(
					pinSignal =>
						pinSignal.Name === signal &&
						pinSignal.Peripheral === peripheral
				)?.PinConfig
			: undefined);

	const applicableControls = useMemo(
		() =>
			getApplicablePinConfigControls(
				controls.PinConfig ?? [],
				signalPinConfig,
				userSelections,
				signal
			),
		[controls.PinConfig, signalPinConfig, signal, userSelections]
	);

	const hasConfiguration = applicableControls.some(
		({control}) => !control.PluginOption
	);

	const hasPluginConfiguration = applicableControls.some(
		({control}) => control.PluginOption
	);

	const pinconfigDisplay = (
		<PinconfigDisplay
			controlsPromise={controlsPromise}
			pinId={resolvedPinId}
			projectId={projectId}
		/>
	);

	const pinDetails = (
		<PinDetails
			pinId={pinId ?? ''}
			peripheral={peripheral}
			signal={signal}
		/>
	);

	return (
		<>
			{!hasConfiguration && <div hidden>{pinconfigDisplay}</div>}
			<ConfigPanel
				variant='default'
				configuration={
					hasConfiguration ? pinconfigDisplay : undefined
				}
				pluginConfiguration={
					<div
						data-test='config-sidebar:plugin-options'
						id={PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID}
					/>
				}
				unavailableSections={{
					pinAssignment: true,
					configuration: !hasConfiguration,
					plugin: !hasPluginConfiguration
				}}
				showConfigurationWithPlugin={false}
				// we only show pin details if the peripheral is not assignable (ex. GPIO pins)
				details={assignable ? undefined : pinDetails}
			/>
		</>
	);
}

function PinConfigTask({
	peripheral,
	pinId,
	signal
}: PinConfigTaskProps) {
	const signalProjectId = useSignalProjectId(peripheral, signal);

	const l10n = useLocaleContext()?.pinConfig as
		| Record<string, string>
		| undefined;

	const isPeripheralAllocable = useMemo(
		() =>
			getConfigurablePeripherals().some(
				configurablePeripheral =>
					configurablePeripheral.name === peripheral
			),
		[peripheral]
	);

	const reservedPin = Boolean(pinId && isPinReserved(pinId));

	const canConfigureReservedPin = useCanConfigureReservedPin({
		pinId,
		peripheral,
		signal
	});

	const effectiveProjectId =
		signalProjectId ??
		(reservedPin && !isPeripheralAllocable
			? getPrimaryProjectId()
			: undefined);

	const isExternallyManagedProject = getIsExternallyManagedProject(
		effectiveProjectId
	);

	const canRenderConfiguredPanel =
		Boolean(effectiveProjectId) &&
		!isExternallyManagedProject &&
		(!reservedPin || canConfigureReservedPin);

	const controlsPromise = useMemo(
		async () =>
			canRenderConfiguredPanel && effectiveProjectId
				? getControlsForProjectIds(
						[effectiveProjectId],
						CONTROL_SCOPES.PIN_CONFIG
					)
				: Promise.resolve({}),
		[canRenderConfiguredPanel, effectiveProjectId]
	);

	const configUnavailableMessage = useMemo(() => {
		if (isExternallyManagedProject) {
			return (
				l10n?.externallyManaged ??
				'This signal is allocated to a project that is externally managed'
			);
		}

		if (isPeripheralAllocable) {
			return (
				l10n?.peripheralConfigUnavailable?.replace(
					'{peripheral}',
					peripheral
				) ??
				`Configuration unavailable until ${peripheral} is allocated to a project.`
			);
		}

		return (
			l10n?.configUnavailable?.replace('{signal}', signal) ??
			`Configuration unavailable until ${signal} is allocated to a project.`
		);
	}, [
		isExternallyManagedProject,
		isPeripheralAllocable,
		l10n,
		peripheral,
		signal
	]);

	return (
		<div data-test='config-sidebar:signal-config'>
			{canRenderConfiguredPanel && effectiveProjectId ? (
				<CfsSuspense>
					<ConfiguredPinConfigPanel
						controlsPromise={controlsPromise}
						peripheral={peripheral}
						pinId={pinId}
						projectId={effectiveProjectId}
						signal={signal}
					/>
				</CfsSuspense>
			) : (
				<ConfigPanel
					variant={effectiveProjectId ? 'default' : 'noChevron'}
					configuration={
						<ConfigUnavailable message={configUnavailableMessage} />
					}
					isExternallyManaged={isExternallyManagedProject}
				/>
			)}
		</div>
	);
}

export default PinConfigTask;

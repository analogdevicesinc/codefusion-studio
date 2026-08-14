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

import styles from './zephelin-configuration-body.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {useAppDispatch} from '../../state/store';
import {
	setCpuLoadInterval,
	setInterface,
	setMemoryUsageInterval,
	setUARTPort,
	toggleAIProfilingEnabled,
	toggleCpuLoadEnabled,
	toggleInstrumentationSubsystemEnabled,
	toggleMemoryUsageEnabled,
	type ZephelinConfigErrors
} from '../../state/slices/profiling/profiling.reducer';
import {
	getDefaultProfilingInterval,
	getInterfaces,
	getMaxCpuLoadInterval,
	getMaxProfilingMemoryInterval,
	getMinCpuLoadInterval,
	getMinProfilingMemoryInterval,
	getUARTPorts
} from '../../state/slices/profiling/profilingPeripherals';
import {
	ZephelinConfigCheckbox,
	ZephelinConfigDropdown,
	ZephelinConfigTextInput
} from './zephelin-config-controls';
import {type Zephelin, type ZephelinInterface} from 'cfs-types';
import {type NavigationItem} from '@common/types/navigation';
import {navigationItems} from '@common/constants/navigation';
import {useAIModels} from '../../state/slices/ai-tools/aiModel.selector';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';

type Props = {
	readonly projectId: string;
	readonly coreId: string;
	readonly zephelin: Partial<Zephelin>;
	readonly errors: ZephelinConfigErrors;
	readonly baudRate?: number;
};

export default function ZephelinConfigurationBody({
	projectId,
	coreId,
	zephelin,
	errors,
	baudRate
}: Props) {
	const dispatch = useAppDispatch();
	const aiModels = useAIModels();
	const l10n = useLocaleContext()?.profiling;

	if (!zephelin.Enabled) {
		errors = {};
	}

	const baudRateError =
		zephelin.Enabled && baudRate === undefined
			? l10n?.interface['baud-rate-error']
			: undefined;

	const globalDisabled = zephelin.Enabled ? false : 'global';

	const screenLink = (screen: NavigationItem, label: string) => (
		<a
			className={styles.link}
			onClick={() => dispatch(setActiveScreen(screen))}
		>
			{label}
		</a>
	);

	return (
		<div
			className={`${styles.container} ${globalDisabled ? styles.disabled : ''}`}
		>
			<div className={styles.configSection}>
				<h3 className={styles.title}>{l10n.profiling.title}</h3>

				<div className={styles.controls}>
					{/* Will be added back in the 2.3.0 release
					<ZephelinConfigCheckbox
						label={l10n.profiling['rtos-events']}
						dataTest='profiling-rtos-events-checkbox'
						isChecked={Boolean(zephelin.RtosEventsEnabled)}
						isDisabled={globalDisabled}
						onChange={() => {
							dispatch(
								toggleRtosEventsEnabled({
									projectId,
									enabled: !zephelin.RtosEventsEnabled
								})
							);
						}}
					/> */}

					<ZephelinConfigCheckbox
						label={l10n.profiling['application-callgraph']}
						dataTest='profiling-application-callgraph-checkbox'
						isChecked={Boolean(
							zephelin.InstrumentationSubsystemEnabled
						)}
						isDisabled={globalDisabled}
						onChange={() => {
							dispatch(
								toggleInstrumentationSubsystemEnabled({
									projectId,
									enabled: !zephelin.InstrumentationSubsystemEnabled
								})
							);
						}}
					/>

					<ZephelinConfigCheckbox
						label={l10n.profiling['ai-profiling']}
						dataTest='profiling-ai-profiling-checkbox'
						isChecked={
							aiModels.length > 0 && Boolean(zephelin.AIEnabled)
						}
						reference={{
							label: 'Manage AI Models',
							target: navigationItems.aiTools
						}}
						isDisabled={globalDisabled || aiModels.length === 0}
						onChange={() => {
							dispatch(
								toggleAIProfilingEnabled({
									projectId,
									enabled: !zephelin.AIEnabled
								})
							);
						}}
					/>

					<ZephelinConfigCheckbox
						label={l10n.profiling['cpu-load']}
						dataTest='profiling-cpu-load-checkbox'
						isChecked={Boolean(zephelin.ProfilingCpuLoadEnabled)}
						isDisabled={globalDisabled}
						dependantInputProps={{
							label: l10n.profiling['profiling-interval'],
							dataTest: 'profiling-cpu-load-interval-field',
							unit: 'ms',
							numberValue:
								zephelin.ProfilingCpuLoadInterval ??
								getDefaultProfilingInterval(),
							min: getMinCpuLoadInterval(),
							max: getMaxCpuLoadInterval(),
							error: errors.ProfilingCpuLoadInterval,
							isDisabled: globalDisabled,
							onChange(value: number) {
								dispatch(
									setCpuLoadInterval({
										projectId,
										interval: value
									})
								);
							}
						}}
						onChange={() => {
							dispatch(
								toggleCpuLoadEnabled({
									projectId,
									enabled: !zephelin.ProfilingCpuLoadEnabled
								})
							);
						}}
					/>

					<ZephelinConfigCheckbox
						label={l10n.profiling['memory-usage']}
						dataTest='profiling-memory-usage-checkbox'
						isChecked={Boolean(zephelin.ProfilingMemoryUsageEnabled)}
						isDisabled={globalDisabled}
						dependantInputProps={{
							label: l10n.profiling['profiling-interval'],
							dataTest: 'profiling-memory-usage-interval-field',
							unit: 'ms',
							numberValue:
								zephelin.ProfilingMemoryUsageInterval ??
								getDefaultProfilingInterval(),
							min: getMinProfilingMemoryInterval(),
							max: getMaxProfilingMemoryInterval(),
							error: errors.ProfilingMemoryUsageInterval,
							isDisabled: globalDisabled,
							onChange(value: number) {
								dispatch(
									setMemoryUsageInterval({
										projectId,
										interval: value
									})
								);
							}
						}}
						onChange={() => {
							dispatch(
								toggleMemoryUsageEnabled({
									projectId,
									enabled: !zephelin.ProfilingMemoryUsageEnabled
								})
							);
						}}
					/>
				</div>
			</div>

			<div className={styles.configSection}>
				<h3 className={styles.title}>{l10n.interface.title}</h3>

				<div className={styles.controls}>
					<ZephelinConfigDropdown
						label={l10n.interface['interface-type']}
						dataTest='profiling-select-trace-interface-field'
						controlId={`select-trace-interface-${coreId}`}
						options={getInterfaces().map(iface => ({
							label: iface,
							value: iface
						}))}
						noValueOption={{
							label: l10n.interface['interface-type-placeholder'],
							value: ''
						}}
						value={zephelin.Interface?.Type ?? ''}
						isDisabled={globalDisabled}
						onChange={value => {
							dispatch(
								setInterface({
									projectId,
									interface: value as ZephelinInterface
								})
							);
						}}
					/>

					{zephelin.Interface?.Type === 'USB' && (
						<p>
							Assign the USB peripheral to the application&apos;s core
							in {screenLink('peripherals', 'Peripheral Allocation')}{' '}
							and configure its clock in{' '}
							{screenLink('clockconfig', 'Clock Configuration')}
						</p>
					)}

					{zephelin.Interface?.Type === 'UART' && (
						<>
							<ZephelinConfigDropdown
								label={l10n.interface['interface-port']}
								dataTest='profiling-trace-interface-field'
								description={
									l10n.interface['interface-port-description']
								}
								reference={{
									label: `${l10n.interface['peripheral-allocation']}.`,
									target: navigationItems.peripherals
								}}
								controlId={`trace-interface:${coreId}`}
								options={Object.entries(getUARTPorts())
									.filter(([_, peripheral]) =>
										peripheral.Cores.includes(coreId)
									)
									.map(([port, _]) => ({
										label: port,
										value: port
									}))}
								noValueOption={{
									label: l10n.interface['interface-port-placeholder'],
									value: ''
								}}
								value={
									zephelin.Interface?.Type === 'UART'
										? zephelin.Interface.Port
										: ''
								}
								isDisabled={globalDisabled}
								onChange={value => {
									dispatch(
										setUARTPort({
											projectId,
											port: value
										})
									);
								}}
							/>

							<ZephelinConfigTextInput
								isDisabled={globalDisabled || 'locked'}
								label={l10n.interface['baud-rate']}
								reference={{
									label: `${l10n.interface['peripheral-allocation']}.`,
									target: navigationItems.peripherals
								}}
								dataTest='profiling-baud-rate-field'
								description={l10n.interface['baud-rate-description']}
								textValue={
									baudRate ? baudRate.toString(10) : 'Undefined'
								}
								error={baudRateError}
							/>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

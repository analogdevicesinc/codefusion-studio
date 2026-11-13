/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
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

import {CheckBox, IntegerField, TextField} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {type TraceConfiguration} from '@ide-types/trace-types';
import styles from './live-tracing-section.module.scss';

type Props = {
	readonly config: TraceConfiguration;
	readonly isDisabled: boolean;
	readonly onChange: <K extends keyof TraceConfiguration>(
		key: K,
		value: TraceConfiguration[K]
	) => void;
};

const MIN_PORT = 1;
const MAX_PORT = 65535;

const clampPort = (value: number): number =>
	Math.min(MAX_PORT, Math.max(MIN_PORT, value));

export default function LiveTracingSection({
	config,
	isDisabled,
	onChange
}: Props) {
	const l10n = useLocaleContext()?.configurationView?.liveTracing;

	const handleToggle = () => {
		onChange('isLiveTracingEnabled', !config.isLiveTracingEnabled);
	};

	return (
		<section
			data-test='live-tracing-section'
			className={`${styles.configurationSection} ${
				isDisabled ? styles.disabled : ''
			}`}
		>
			<h5 className={styles.title}>{l10n?.title}</h5>

			<div className={styles.inputWrapper}>
				<CheckBox
					checked={Boolean(config.isLiveTracingEnabled)}
					isDisabled={isDisabled}
					onChange={handleToggle}
				>
					<label className={styles.description}>
						{l10n?.enableToggle}
					</label>
				</CheckBox>
			</div>

			{config.isLiveTracingEnabled && (
				<div className={styles.nestedFieldsContainer}>
					<div className={styles.inputWrapper}>
						<label className={styles.label}>{l10n?.tcpHost}</label>
						<TextField
							dataTest='tcp-host-input'
							inputVal={config.tcpServerHost ?? ''}
							isDisabled={isDisabled}
							onInputChange={val => {
								onChange('tcpServerHost', val);
							}}
						/>
					</div>

					<div className={styles.inputWrapper}>
						<label className={styles.label}>{l10n?.tcpPort}</label>
						<IntegerField
							dataTest='tcp-port-input'
							value={config.tcpServerPort ?? 5000}
							min={MIN_PORT}
							max={MAX_PORT}
							isDisabled={isDisabled}
							onValueChange={val => {
								onChange('tcpServerPort', clampPort(val));
							}}
						/>
					</div>

					<div className={styles.inputWrapper}>
						<label className={styles.label}>
							{l10n?.backendHost}
						</label>
						<TextField
							dataTest='backend-host-input'
							inputVal={config.backendHost ?? ''}
							isDisabled={isDisabled}
							onInputChange={val => {
								onChange('backendHost', val);
							}}
						/>
					</div>

					<div className={styles.inputWrapper}>
						<label className={styles.label}>
							{l10n?.backendPort}
						</label>
						<IntegerField
							dataTest='backend-port-input'
							value={config.backendPort ?? 8000}
							min={MIN_PORT}
							max={MAX_PORT}
							isDisabled={isDisabled}
							onValueChange={val => {
								onChange('backendPort', clampPort(val));
							}}
						/>
					</div>
				</div>
			)}
		</section>
	);
}

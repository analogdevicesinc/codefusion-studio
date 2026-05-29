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
	Button,
	DropDown,
	IntegerField,
	RefreshIcon
} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {type TraceConfiguration} from '@ide-types/trace-types';
import styles from './trace-configuration-sections.module.scss';
import {useCallback, useState} from 'react';
import {useMessenger} from '@common/contexts/MessengerContext';
import {traceSerialPortsRequest} from '@constants/messages/trace-messages';

type Props = {
	readonly config: TraceConfiguration;
	readonly isDisabled: boolean;
	readonly onChange: <K extends keyof TraceConfiguration>(
		key: K,
		value: TraceConfiguration[K]
	) => void;
};

const defaultBaudRate = 115200;

export default function SourceOptionsSection({
	config,
	isDisabled,
	onChange
}: Props) {
	const messenger = useMessenger();
	const [availablePorts, setAvailablePorts] = useState<string[]>([]);
	const l10n = useLocaleContext()?.configurationView;

	const isValidPort = availablePorts.includes(config.serialPort);

	const updateAvailablePorts = useCallback(() => {
		void messenger
			.sendRequest(traceSerialPortsRequest, {type: 'extension'})
			.then(receivedPorts => {
				setAvailablePorts(receivedPorts.map(port => port.path));
			})
			.catch(error => {
				console.error('Failed to load serial ports:', error);
			});
	}, [messenger]);

	return (
		<section
			data-test='source-options-section'
			className={`${styles.configurationSection} ${isDisabled ? styles.disabled : ''}`}
		>
			<h5 className={styles.title}>{l10n?.sourceOptions?.title}</h5>

			<div className={styles.inputWrapper}>
				<label
					htmlFor='interface-type-controlDropdown'
					className={styles.label}
				>
					{l10n?.sourceOptions?.interfaceType}
				</label>

				<DropDown
					controlId='interface-type'
					options={[
						{value: 'uart', label: 'UART'},
						{value: 'usb', label: 'USB', disabled: true}
					]}
					placeholder={l10n?.sourceOptions?.interfaceTypePlaceholder}
					currentControlValue={config.interfaceType}
					onHandleDropdown={val => {
						onChange(
							'interfaceType',
							val as TraceConfiguration['interfaceType']
						);
					}}
				/>
			</div>

			<div className={styles.inputWrapper}>
				<label
					htmlFor='serial-port-controlDropdown'
					className={styles.label}
				>
					{l10n?.sourceOptions?.serialPort}
				</label>

				<DropDown
					controlId='serial-port'
					options={availablePorts.map(port => ({
						value: port,
						label: port
					}))}
					placeholder={l10n?.sourceOptions?.serialPortPlaceholder}
					currentControlValue={isValidPort ? config.serialPort : ''}
					onOpenDropdown={updateAvailablePorts}
					onHandleDropdown={val => {
						onChange('serialPort', val);
					}}
				/>
			</div>

			<div className={styles.inputWrapper}>
				<label className={styles.label}>
					{l10n?.sourceOptions?.baudRate}
				</label>

				<IntegerField
					dataTest='baud-rate'
					value={config.baudRate}
					min={0}
					max={1000000}
					step={100}
					endSlot={
						config.baudRate === defaultBaudRate ? undefined : (
							<Button
								appearance='icon'
								onClick={() => {
									onChange('baudRate', defaultBaudRate);
								}}
							>
								<RefreshIcon />
							</Button>
						)
					}
					onValueChange={val => {
						onChange('baudRate', val);
					}}
				/>
			</div>
		</section>
	);
}

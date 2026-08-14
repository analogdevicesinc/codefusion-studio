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
import {
	encodeUsbValue,
	decodeUsbValue
} from '@common/utils/usb-device-value';
import {
	type TraceConfiguration,
	type UsbDevice
} from '@ide-types/trace-types';
import styles from './trace-configuration-sections.module.scss';
import {useCallback, useEffect, useState} from 'react';
import {useMessenger} from '@common/contexts/MessengerContext';
import {
	traceSerialPortsRequest,
	traceUsbDevicesRequest
} from '@constants/messages/trace-messages';

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
	const [availableUsbDevices, setAvailableUsbDevices] = useState<
		UsbDevice[]
	>([]);
	const l10n = useLocaleContext()?.configurationView;

	const isValidPort =
		config.source.type === 'uart' &&
		availablePorts.includes(config.source.serialPort);

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

	const updateAvailableUsbDevices = useCallback(() => {
		void messenger
			.sendRequest(traceUsbDevicesRequest, {type: 'extension'})
			.then(setAvailableUsbDevices)
			.catch(error => {
				console.error('Failed to load USB devices:', error);
			});
	}, [messenger]);

	// Also loaded eagerly on entering USB mode (in addition to
	// onOpenDropdown below), so an already-configured device shows as
	// selected immediately rather than only after the user opens the
	// dropdown once.
	useEffect(() => {
		if (config.source.type !== 'usb') {
			return;
		}

		updateAvailableUsbDevices();
	}, [config.source.type, updateAvailableUsbDevices]);

	const usbDeviceOptions = availableUsbDevices.map(device => ({
		value: encodeUsbValue(device.busNumber, device.deviceAddress),
		label: device.label
	}));

	const configuredUsbValue =
		config.source.type === 'usb' && config.source.usbDevice
			? encodeUsbValue(
					config.source.usbDevice.busNumber,
					config.source.usbDevice.deviceAddress
				)
			: '';

	const isValidUsbDevice = usbDeviceOptions.some(
		option => option.value === configuredUsbValue
	);

	const noUsbDeviceAvailable = usbDeviceOptions.length === 0;

	return (
		<section
			data-test='source-options-section'
			className={`${styles.configurationSection} ${
				isDisabled ? styles.disabled : ''
			}`}
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
						{value: 'usb', label: 'USB'}
					]}
					placeholder={l10n?.sourceOptions?.interfaceTypePlaceholder}
					currentControlValue={config.source.type}
					onHandleDropdown={val => {
						onChange(
							'source',
							val === 'uart'
								? {
										type: 'uart',
										serialPort: '',
										baudRate: defaultBaudRate
									}
								: {type: 'usb'}
						);
					}}
				/>
			</div>

			{config.source.type === 'uart' && (
				<>
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
							currentControlValue={
								isValidPort ? config.source.serialPort : ''
							}
							onOpenDropdown={updateAvailablePorts}
							onHandleDropdown={val => {
								onChange('source', {
									type: 'uart',
									serialPort: val,
									baudRate:
										config.source.type === 'uart'
											? config.source.baudRate
											: defaultBaudRate
								});
							}}
						/>
					</div>

					<div className={styles.inputWrapper}>
						<label className={styles.label}>
							{l10n?.sourceOptions?.baudRate}
						</label>

						<IntegerField
							dataTest='baud-rate'
							value={config.source.baudRate}
							min={0}
							max={1000000}
							step={100}
							endSlot={
								config.source.baudRate ===
								defaultBaudRate ? undefined : (
									<Button
										appearance='icon'
										onClick={() => {
											onChange('source', {
												type: 'uart',
												serialPort:
													config.source.type === 'uart'
														? config.source.serialPort
														: '',
												baudRate: defaultBaudRate
											});
										}}
									>
										<RefreshIcon />
									</Button>
								)
							}
							onValueChange={val => {
								onChange('source', {
									type: 'uart',
									serialPort:
										config.source.type === 'uart'
											? config.source.serialPort
											: '',
									baudRate: val
								});
							}}
						/>
					</div>
				</>
			)}

			{config.source.type === 'usb' && (
				<div className={styles.inputWrapper}>
					<label
						htmlFor='usb-device-controlDropdown'
						className={styles.label}
					>
						{l10n?.sourceOptions?.usbDevice}
					</label>

					<DropDown
						controlId='usb-device'
						options={usbDeviceOptions}
						noValueOption={{
							value: '',
							label: noUsbDeviceAvailable
								? l10n?.sourceOptions?.noUsbDevice
								: l10n?.sourceOptions?.usbDevicePlaceholder
						}}
						currentControlValue={
							isValidUsbDevice ? configuredUsbValue : ''
						}
						onOpenDropdown={updateAvailableUsbDevices}
						onHandleDropdown={val => {
							onChange('source', {
								type: 'usb',
								usbDevice: decodeUsbValue(val)
							});
						}}
					/>
				</div>
			)}
		</section>
	);
}

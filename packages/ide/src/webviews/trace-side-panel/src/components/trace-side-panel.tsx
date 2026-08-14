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

import {useCallback, useEffect, useRef, useState} from 'react';
import RecordControl from './record-control';
import styles from './trace-side-panel.module.scss';
import {
	type TraceRecordingState,
	type TraceConfiguration,
	type TraceSourceConfiguration,
	type UsbDevice
} from '@ide-types/trace-types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	encodeUsbValue,
	findUsbDeviceLabel
} from '@common/utils/usb-device-value';
import {Button, EmptyState} from 'cfs-react-library';
import {useMessenger} from '@common/contexts/MessengerContext';
import {type Disposable} from 'vscode-messenger-common';
import {
	traceConfigRequest,
	traceConfigChangedNotification,
	traceOpenConfigurationViewNotification,
	traceSerialPortsRequest,
	traceUsbDevicesRequest,
	traceRecordingStateRequest,
	traceRecordingStateChangedNotification,
	traceStartRecordingNotification
} from '@constants/messages/trace-messages';

/**
 * Returns a value identifying the configured trace source, in the same
 * encoding used for `availableSources`, so the two can be compared to
 * tell whether the configured source is still available.
 */
function getConfiguredSourceValue(
	configuration: TraceConfiguration
): string {
	if (configuration.source.type === 'usb') {
		return configuration.source.usbDevice
			? encodeUsbValue(
					configuration.source.usbDevice.busNumber,
					configuration.source.usbDevice.deviceAddress
				)
			: '';
	}

	return configuration.source.serialPort;
}

export default function TraceSidePanel() {
	const messenger = useMessenger();
	const messageHandlers = useRef<Set<Disposable>>(new Set());
	const [traceConfiguration, setTraceConfiguration] =
		useState<TraceConfiguration>();
	const [recordingState, setRecordingState] =
		useState<TraceRecordingState>({
			isRecording: false
		});
	const [availableSources, setAvailableSources] = useState<string[]>(
		[]
	);
	// Kept alongside availableSources so the configured device's label
	// (e.g. "0456:aa55, Bus 001, Device 012") can be shown in the
	// recording summary below, matching what the configuration UI's
	// dropdown shows for the same device.
	const [usbDevices, setUsbDevices] = useState<UsbDevice[]>([]);
	const l10n = useLocaleContext()?.sidePanel;

	const loadAvailableSources = useCallback(
		async (
			sourceType: TraceSourceConfiguration['type']
		): Promise<string[]> => {
			try {
				if (sourceType === 'usb') {
					const devices = await messenger.sendRequest(
						traceUsbDevicesRequest,
						{type: 'extension'}
					);

					setUsbDevices(devices);

					return devices.map(device =>
						encodeUsbValue(device.busNumber, device.deviceAddress)
					);
				}

				const ports = await messenger.sendRequest(
					traceSerialPortsRequest,
					{type: 'extension'}
				);

				return ports.map(port => port.path);
			} catch (error) {
				console.error(
					'Failed to load available trace sources:',
					error
				);

				return [];
			}
		},
		[messenger]
	);

	useEffect(() => {
		const handlers = messageHandlers.current;

		handlers.add(
			messenger.onNotification(
				traceConfigChangedNotification,
				async receivedConfiguration => {
					setTraceConfiguration(receivedConfiguration);
					setRecordingState(prevRecordingState => ({
						...prevRecordingState,
						error: undefined
					}));
					setAvailableSources(
						await loadAvailableSources(
							receivedConfiguration.source.type
						)
					);
				}
			)
		);

		handlers.add(
			messenger.onNotification(
				traceRecordingStateChangedNotification,
				receivedRecordingState => {
					setRecordingState(receivedRecordingState);
				}
			)
		);

		void Promise.all([
			messenger.sendRequest(traceConfigRequest, {type: 'extension'}),
			messenger.sendRequest(traceRecordingStateRequest, {
				type: 'extension'
			})
		])
			.then(
				async ([receivedConfiguration, receivedRecordingState]) => {
					setTraceConfiguration(receivedConfiguration ?? undefined);
					setRecordingState(receivedRecordingState);
					setAvailableSources(
						await loadAvailableSources(
							receivedConfiguration.source.type
						)
					);
				}
			)
			.catch(error => {
				console.error('Failed to load initial trace data:', error);
			});

		return () => {
			handlers.forEach(handler => {
				handler.dispose();
			});
			handlers.clear();
		};
	}, [messenger, loadAvailableSources]);

	const hasConfiguration = traceConfiguration !== undefined;
	const hasOutputDirectory = Boolean(
		traceConfiguration?.outputDirectory
	);
	const hasUartConfigured =
		traceConfiguration?.source.type === 'uart' &&
		traceConfiguration.source.serialPort !== '' &&
		traceConfiguration.source.baudRate > 0;
	const hasUsbConfigured =
		traceConfiguration?.source.type === 'usb' &&
		traceConfiguration.source.usbDevice !== undefined;
	const isConfigured =
		hasConfiguration &&
		hasOutputDirectory &&
		(hasUartConfigured || hasUsbConfigured);

	const hasValidSource =
		isConfigured &&
		availableSources.includes(
			getConfiguredSourceValue(traceConfiguration)
		);

	let configuredUsbDeviceLabel: string | undefined;

	if (traceConfiguration?.source.type === 'usb') {
		configuredUsbDeviceLabel = findUsbDeviceLabel(
			usbDevices,
			traceConfiguration.source.usbDevice
		);
	}

	if (!isConfigured) {
		return (
			<div className={styles.container}>
				<EmptyState
					type='info'
					title={l10n?.setupRequired}
					description={l10n?.setupRequiredDescription}
					hasBorder={false}
				>
					<div slot='body' className={styles.actions}>
						<Button
							onClick={() => {
								messenger.sendNotification(
									traceOpenConfigurationViewNotification,
									{type: 'extension'}
								);
							}}
						>
							{l10n?.configureCapture}
						</Button>
					</div>
				</EmptyState>
			</div>
		);
	}

	if (!hasValidSource) {
		return (
			<div className={styles.container}>
				<EmptyState
					type='warning'
					title={l10n?.sourceNotAvailable}
					description={l10n?.sourceNotAvailableDescription}
					hasBorder={false}
				>
					<div slot='body' className={styles.actions}>
						<Button
							onClick={() => {
								messenger.sendNotification(
									traceOpenConfigurationViewNotification,
									{type: 'extension'}
								);
							}}
						>
							{l10n?.configureCapture}
						</Button>
					</div>
				</EmptyState>
			</div>
		);
	}

	if (!recordingState.isRecording && recordingState.error) {
		return (
			<div className={styles.container}>
				<EmptyState
					type='error'
					title={l10n?.captureInterrupted}
					description={l10n?.captureInterruptedDescription}
					hasBorder={false}
				>
					<div slot='body' className={styles.actions}>
						<Button
							onClick={() => {
								messenger.sendNotification(
									traceStartRecordingNotification,
									{type: 'extension'}
								);
							}}
						>
							{l10n?.reconnectAndRetry}
						</Button>
						<Button
							appearance='secondary'
							onClick={() => {
								messenger.sendNotification(
									traceOpenConfigurationViewNotification,
									{type: 'extension'}
								);
							}}
						>
							{l10n?.selectSource}
						</Button>
					</div>
				</EmptyState>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<RecordControl
				configuration={traceConfiguration}
				recordingState={recordingState}
				usbDeviceLabel={configuredUsbDeviceLabel}
			/>
		</div>
	);
}

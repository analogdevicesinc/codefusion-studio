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

import {useEffect, useRef, useState} from 'react';
import RecordControl from './record-control';
import styles from './trace-side-panel.module.scss';
import {
	type TraceRecordingState,
	type TraceConfiguration
} from '@ide-types/trace-types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {Button, EmptyState} from 'cfs-react-library';
import {useMessenger} from '@common/contexts/MessengerContext';
import {type Disposable} from 'vscode-messenger-common';
import {
	traceConfigRequest,
	traceConfigChangedNotification,
	traceOpenConfigurationViewNotification,
	traceSerialPortsRequest,
	traceRecordingStateRequest,
	traceRecordingStateChangedNotification,
	traceStartRecordingNotification
} from '@constants/messages/trace-messages';

export default function TraceSidePanel() {
	const messenger = useMessenger();
	const messageHandlers = useRef<Set<Disposable>>(new Set());
	const [traceConfiguration, setTraceConfiguration] =
		useState<TraceConfiguration>();
	const [recordingState, setRecordingState] =
		useState<TraceRecordingState>({
			isRecording: false
		});
	const [availablePorts, setAvailablePorts] = useState<string[]>([]);
	const l10n = useLocaleContext()?.sidePanel;

	useEffect(() => {
		const handlers = messageHandlers.current;

		void Promise.all([
			messenger.sendRequest(traceConfigRequest, {type: 'extension'}),
			messenger.sendRequest(traceRecordingStateRequest, {
				type: 'extension'
			}),
			messenger.sendRequest(traceSerialPortsRequest, {
				type: 'extension'
			})
		])
			.then(
				([
					receivedConfiguration,
					receivedRecordingState,
					receivedPorts
				]) => {
					setTraceConfiguration(receivedConfiguration ?? undefined);
					setRecordingState(receivedRecordingState);
					setAvailablePorts(receivedPorts.map(port => port.path));

					handlers.add(
						messenger.onNotification(
							traceConfigChangedNotification,
							async receivedConfiguration => {
								const ports = await messenger.sendRequest(
									traceSerialPortsRequest,
									{type: 'extension'}
								);
								setTraceConfiguration(receivedConfiguration);
								setRecordingState(prevRecordingState => ({
									...prevRecordingState,
									error: undefined
								}));
								setAvailablePorts(ports.map(port => port.path));
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
	}, [messenger]);

	const isConfigured =
		traceConfiguration?.serialPort !== undefined &&
		traceConfiguration?.baudRate > 0 &&
		traceConfiguration?.outputDirectory !== '';

	const hasValidPort =
		isConfigured &&
		availablePorts.includes(traceConfiguration.serialPort);

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

	if (!hasValidPort) {
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
			/>
		</div>
	);
}

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
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './trace-configuration.module.scss';
import SourceOptionsSection from './source-options-section';
import GeneralSettingsSection from './general-settings-section';
import {Button, WarningIcon} from 'cfs-react-library';
import {type TraceConfiguration} from '@ide-types/trace-types';
import {useMessenger} from '@common/contexts/MessengerContext';
import {
	traceConfigRequest,
	traceConfigChangedNotification,
	traceRecordingStateChangedNotification,
	traceRecordingStateRequest,
	traceConfigUpdateNotification,
	traceStopRecordingNotification
} from '@constants/messages/trace-messages';
import {type Disposable} from 'vscode-messenger-common';
import debounce from 'lodash.debounce';
import type {Messenger} from 'vscode-messenger-webview';

const updateConfiguration = debounce(
	(messenger: Messenger, config: TraceConfiguration) => {
		messenger.sendNotification(
			traceConfigUpdateNotification,
			{
				type: 'extension'
			},
			config
		);
	},
	400
);

export default function TraceConfigurationForm() {
	const messenger = useMessenger();
	const messageHandlers = useRef<Set<Disposable>>(new Set());
	const [traceConfiguration, setTraceConfiguration] =
		useState<TraceConfiguration>();
	const [recordingActive, setRecordingActive] = useState(false);
	const l10n = useLocaleContext()?.configurationView;

	useEffect(() => {
		const handlers = messageHandlers.current;
		void Promise.all([
			messenger.sendRequest(traceConfigRequest, {type: 'extension'}),
			messenger.sendRequest(traceRecordingStateRequest, {
				type: 'extension'
			})
		])
			.then(([receivedConfiguration, receivedRecordingState]) => {
				setTraceConfiguration(receivedConfiguration);
				setRecordingActive(receivedRecordingState.isRecording);

				handlers.add(
					messenger.onNotification(
						traceConfigChangedNotification,
						receivedConfiguration => {
							setTraceConfiguration(receivedConfiguration);
						}
					)
				);

				handlers.add(
					messenger.onNotification(
						traceRecordingStateChangedNotification,
						receivedRecordingState => {
							setRecordingActive(receivedRecordingState.isRecording);
						}
					)
				);
			})
			.catch(error => {
				console.error(
					'Failed to load initial trace configuration:',
					error
				);
			});

		return () => {
			handlers.forEach(handler => {
				handler.dispose();
			});
			handlers.clear();
		};
	}, [messenger]);

	const handleConfigurationChange = <
		K extends keyof TraceConfiguration
	>(
		key: K,
		value: TraceConfiguration[K]
	) => {
		if (recordingActive || !traceConfiguration) {
			return;
		}

		const newConfig = {...traceConfiguration, [key]: value};

		setTraceConfiguration(newConfig);

		updateConfiguration(messenger, newConfig);
	};

	const sendStopRecordingNotification = () => {
		messenger.sendNotification(traceStopRecordingNotification, {
			type: 'extension'
		});
	};

	return (
		<div className={styles.container}>
			<CfsTopBar>
				<div slot='center'>
					<span>{l10n?.title}</span>
				</div>
			</CfsTopBar>

			<main className={styles.main}>
				<div className={styles.configurationWrapper}>
					{recordingActive && (
						<div
							data-test='active-recording-banner'
							className={styles.activeRecordingBox}
						>
							<div className={styles.warningIcon}>
								<WarningIcon />
							</div>

							<p className={styles.activeRecordingText}>
								{l10n?.activeRecording}
							</p>

							<Button
								appearance='secondary'
								className={styles.stopTraceButton}
								onClick={sendStopRecordingNotification}
							>
								{l10n?.stopCapture}
							</Button>
						</div>
					)}

					{traceConfiguration && (
						<>
							<SourceOptionsSection
								config={traceConfiguration}
								isDisabled={recordingActive}
								onChange={handleConfigurationChange}
							/>

							<GeneralSettingsSection
								config={traceConfiguration}
								isDisabled={recordingActive}
								onChange={handleConfigurationChange}
							/>
						</>
					)}
				</div>
			</main>
		</div>
	);
}

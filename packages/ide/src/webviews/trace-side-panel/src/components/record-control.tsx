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

import {Button} from 'cfs-react-library';
import React, {useCallback, useEffect, useState} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './record-control.module.scss';
import Tooltip from '@common/components/tooltip/Tooltip';
import ConfigIcon16px from '@common/icons/Config16px';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import {useMessenger} from '@common/contexts/MessengerContext';
import {
	type TraceRecordingState,
	type TraceConfiguration
} from '@ide-types/trace-types';
import {
	traceOpenConfigurationViewNotification,
	traceStartRecordingNotification,
	traceStopRecordingNotification
} from '@constants/messages/trace-messages';

type Props = {
	readonly configuration: TraceConfiguration;
	readonly recordingState: TraceRecordingState;
};

export default function RecordControl({
	configuration,
	recordingState
}: Props) {
	const messenger = useMessenger();
	const l10n = useLocaleContext()?.sidePanel;
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		if (!recordingState.isRecording) {
			setSeconds(0);

			return;
		}

		const interval = setInterval(() => {
			setSeconds(
				Math.floor((Date.now() - recordingState.startTime) / 1000)
			);
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, [recordingState]);

	const toggleRecording = useCallback(() => {
		if (recordingState.isRecording) {
			messenger.sendNotification(traceStopRecordingNotification, {
				type: 'extension'
			});
		} else {
			messenger.sendNotification(traceStartRecordingNotification, {
				type: 'extension'
			});
		}
	}, [messenger, recordingState]);

	return (
		<div className={styles.container}>
			<div className={styles.controls}>
				<Button onClick={toggleRecording}>
					{recordingState.isRecording
						? l10n?.stopCapture
						: l10n?.startCapture}
				</Button>

				<span className={styles.timer}>{formatTime(seconds)}</span>
			</div>

			<div className={styles.configuration}>
				<div className={styles.title}>
					<span>
						<LocalizedMessage
							id='sidePanel.configurationFor'
							params={{
								source: configuration.interfaceType.toUpperCase()
							}}
						/>
					</span>
					<Tooltip title={l10n?.configure} type='long'>
						<Button
							dataTest='configure-capture-btn'
							appearance='icon'
							disabled={recordingState.isRecording}
							onClick={() => {
								messenger.sendNotification(
									traceOpenConfigurationViewNotification,
									{type: 'extension'}
								);
							}}
						>
							<ConfigIcon16px />
						</Button>
					</Tooltip>
				</div>

				<div className={styles.entry}>
					<span>{l10n?.serialPort}:</span>
					<span>{configuration?.serialPort.trim()}</span>
				</div>

				<div className={styles.entry}>
					<span>{l10n?.baudRate}:</span>
					<span>{configuration?.baudRate}</span>
				</div>

				<div className={styles.entry}>
					<span className={styles.label}>{l10n?.output}:</span>
					<span className={styles.value}>
						<BreakablePath path={configuration?.outputDirectory} />
					</span>
				</div>
			</div>
		</div>
	);
}

function BreakablePath({path}: {path: string | undefined}) {
	if (!path) return '-';

	return path.split(/([\\/])/).map((part, i) => (
		// Using index here is okay because the elements are static
		// eslint-disable-next-line react/no-array-index-key
		<React.Fragment key={i}>
			{part}
			{(part === '/' || part === '\\') && <wbr />}
		</React.Fragment>
	));
}

function formatTime(seconds: number) {
	const pad = (value: number) => String(value).padStart(2, '0');

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

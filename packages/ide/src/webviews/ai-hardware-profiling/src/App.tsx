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
	type ApplicationStatus,
	type HardwareResources,
	type ProfilingConfiguration
} from "@ide-types/ai-hardware-profiling-types";
import {LocalizationProvider} from '../../common/contexts/LocaleContext';
import styles from './App.module.scss';
import {HeaderBar} from './sections/HeaderBar';
import {ModelInstructions} from './sections/ModelInstructions';
import {useEffect, useState} from 'react';
import {
	applicationStatusUpdate,
	getProfilingViewData
} from "@constants/messages/ai-hardware-profiling-messages";
import {messenger} from '../../common/contexts/MessengerContext';



function App() {
	const [profilingConfig, setProfilingConfig] =
		useState<ProfilingConfiguration>({});

	const [hardwareResources, setHardwareResources] =
		useState<HardwareResources>({
			debuggers: [],
			usbPorts: []
		});

	const [applicationStatus, setApplicationStatus] =
		useState<ApplicationStatus>({
			buildStatus: 'idle',
			deployStatus: 'undeployed'
		});

	useEffect(() => {
		messenger
			.sendRequest(getProfilingViewData, {type: 'extension'})
			.then(response => {
				setHardwareResources(response.hardwareResources);
				setApplicationStatus(response.applicationStatus);
				setProfilingConfig(response.profilingConfig);
			})
			.catch(error => {
				console.error(
					'Error fetching profiling configuration:',
					error
				);
			});

		messenger.onNotification(applicationStatusUpdate, status => {
			setApplicationStatus(status);
		});
	}, []);

	return (
		<LocalizationProvider namespace='model-profiling'>
			<div className={styles.appContainer}>
				<HeaderBar applicationStatus={applicationStatus} />
				<div className={styles.body}>
					<ModelInstructions
						messenger={messenger}
						hardwareResources={hardwareResources}
						profilingConfig={profilingConfig}
						setProfilingConfig={setProfilingConfig}
						applicationStatus={applicationStatus}
					/>
				</div>
			</div>
		</LocalizationProvider>
	);
}

export default App;

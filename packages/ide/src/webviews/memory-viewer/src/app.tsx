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
import {useAppDispatch} from './state/store';

import AppPanel from './components/app-panel/app-panel';

import {LocalizationProvider} from '@common/contexts/LocaleContext';

import styles from './app.module.scss';
import {useEffect} from 'react';
import {
	fetchMemoryData,
	fetchSessions,
	setMemoryData,
	setActiveSessionId
} from './state/slices/memory/memory.reducer';
import {useMemoryMetadata} from './state/slices/memory/memory.selector';

function App() {
	const dispatch = useAppDispatch();
	const {address: startAddress, length: memoryLength} =
		useMemoryMetadata();

	useEffect(() => {
		const debugMessageListener = (event: MessageEvent) => {
			if (event.data?.type === 'debugger-state-change') {
				if (event.data.event === 'halt') {
					void dispatch(fetchSessions());

					if (startAddress !== undefined && memoryLength > 0) {
						void dispatch(
							fetchMemoryData({
								sessionId: event.data.sessionId,
								address: startAddress,
								length: memoryLength
							})
						);
					}
				} else if (
					event.data.event === 'start' ||
					event.data.event === 'continue'
				) {
					void dispatch(fetchSessions());
				} else if (event.data.event === 'stop') {
					void dispatch(fetchSessions());
					dispatch(setMemoryData({address: undefined, data: []}));
				} else if (event.data.event === 'context-switch') {
					dispatch(
						setActiveSessionId(event.data.sessionId as string)
					);
				}
			}
		};

		void dispatch(fetchSessions());

		window.addEventListener('message', debugMessageListener);

		return () => {
			window.removeEventListener('message', debugMessageListener);
		};
	}, [dispatch, startAddress, memoryLength]);

	return (
		<LocalizationProvider namespace='mem-viewer'>
			<div className={styles.appContainer}>
				<AppPanel />
			</div>
		</LocalizationProvider>
	);
}

export default App;

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

import {useEffect} from 'react';
import {useAppDispatch} from '../../state/store';

import {signalReady} from '@common/api';

import InfoCard from '../../components/info-card/info-card';
import EventSourceTree from '../../components/event-source-tree/event-source-tree';
import {startEventTreeService} from '../../common/utils/service';

import styles from './app-content.module.scss';

export const SEV_TREE_TOOLTIP_CONTAINER_ID = 'sev-treeview-container';

function AppContent() {
	const dispatch = useAppDispatch();

	/**
	 * The purpose of this effect is to start the service that will listen for events from the backend and update the state accordingly
	 * also signal to the backend that the frontend is ready to receive events
	 */
	useEffect(() => {
		const stop = startEventTreeService(dispatch);

		signalReady();

		return () => {
			stop?.();
		};
	}, [dispatch]);

	return (
		<div
			className={styles.appContainer}
			id={SEV_TREE_TOOLTIP_CONTAINER_ID}
		>
			<InfoCard />
			<EventSourceTree />
		</div>
	);
}

export default AppContent;

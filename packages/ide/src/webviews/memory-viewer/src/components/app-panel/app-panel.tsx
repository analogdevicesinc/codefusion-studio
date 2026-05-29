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

import {useMemo} from 'react';
import {
	useDebugSessions,
	useMemoryData,
	useMemoryError,
	useMemoryMetadata
} from '../../state/slices/memory/memory.selector';
import EmptyContainer from '../empty-container/empty-container';
import Footer from '../footer/footer';
import MemoryGrid from '../memory-grid/memory-grid';
import Toolbar from '../toolbar/toolbar';
import styles from './app-panel.module.scss';

const emptyStateDataTestIds: Record<string, string> = {
	noSessions: 'no-sessions',
	notHalted: 'not-halted',
	noData: 'no-data',
	readError: 'read-error'
};

export default function AppPanel() {
	const sessions = useDebugSessions();
	const memoryData = useMemoryData();
	const {address: startAddress} = useMemoryMetadata();
	const error = useMemoryError();
	const shouldShowFooter = useMemo(
		() => sessions.length > 0 && memoryData.length > 0,
		[sessions.length, memoryData.length]
	);

	const reasonForEmptyState = useMemo(() => {
		if (sessions.length === 0) {
			return 'noSessions';
		}

		if (
			sessions.every(session => session.isRunning) &&
			memoryData.length === 0
		) {
			return 'notHalted';
		}

		if (error && memoryData.length === 0) {
			return 'readError';
		}

		if (memoryData.length === 0) {
			return 'noData';
		}

		return undefined;
	}, [sessions, memoryData.length, error]);

	return (
		<div className={styles.appPanelContainer}>
			<Toolbar />
			<div
				className={`${styles.scrollingContainer} ${reasonForEmptyState ? styles.empty : ''}`}
			>
				{reasonForEmptyState ? (
					<EmptyContainer
						emptyReason={reasonForEmptyState}
						dataTest={`empty-state:${emptyStateDataTestIds[reasonForEmptyState]}`}
					/>
				) : (
					// Keying the MemoryGrid to startAddress forces it to remount and reset infinite scroll state when the address changes
					<MemoryGrid key={startAddress} />
				)}
			</div>
			{shouldShowFooter && <Footer />}
		</div>
	);
}

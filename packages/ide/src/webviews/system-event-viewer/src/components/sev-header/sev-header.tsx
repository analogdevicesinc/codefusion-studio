/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {useCallback, useEffect, useMemo, useState} from 'react';

import {Badge, MeasurementIcon, Tooltip} from 'cfs-react-library';
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Direction} from '@common/components/tooltip/Tooltip';
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';
import SevHeaderFileButtons from './sev-header-file-buttons';

import {
	useActiveScreen,
	useLastUpdate,
	useToolState
} from '../../state/slices/app-context/app-context.selector';
import {useMeasurePhase} from '../../state/slices/timeline/timeline.selector';
import {setMeasurePhase} from '../../state/slices/timeline/timeline.reducer';
import {useAppDispatch} from '../../state/store';

import {createFile} from '../../common/api';
import {FILE_TYPES} from '../../common/types/files';
import {isMeasureModeActive} from '../../common/utils/measurement-tool';
import {formatElapsedTime} from '../../common/utils/status-time';
import {MEASURE_PHASE} from '../../common/constants/timeline';
import {navigationItems} from '../../common/constants/navigation';

import type {
	NavigationItem,
	TopBarSlots
} from '../../common/types/navigation';
import type {CfsEventState} from '../../common/types/events';

import styles from './sev-header.module.scss';

type Status = {
	label: string;
	tooltip: string;
	dot?: 'active' | 'running' | undefined;
};

const statusDictionary: Record<CfsEventState, Status> = {
	active: {
		label: 'Active',
		tooltip: 'Last updated',
		dot: 'active'
	},
	running: {
		label: 'Code Running',
		tooltip: 'Pause code to update timeline view',
		dot: 'running'
	},
	ended: {
		label: 'Session Ended',
		tooltip: 'Session ended',
		dot: undefined
	},
	file: {
		label: 'Local File',
		tooltip: 'Opened local file',
		dot: undefined
	}
};

const defaultSlots: TopBarSlots = {
	start: null,
	end: null
};

export default function SevHeader() {
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();
	const measurePhase = useMeasurePhase();
	const isMeasureActive = isMeasureModeActive(measurePhase);
	const toolState = useToolState();
	const lastUpdate = useLastUpdate();
	const status = toolState ? statusDictionary[toolState] : null;
	const [now, setNow] = useState(() => Date.now());
	const isStateActiveOrEnded =
		toolState === 'active' || toolState === 'ended';

	const elapsedTime = useMemo(
		() => formatElapsedTime(lastUpdate, new Date(now)),
		[lastUpdate, now]
	);

	const tooltip = useMemo(() => {
		if (!toolState || !status || !elapsedTime) {
			return undefined;
		}

		if (isStateActiveOrEnded) {
			return `${status.tooltip} ${elapsedTime} ago`;
		}

		return status?.tooltip ?? '';
	}, [status, toolState, elapsedTime, isStateActiveOrEnded]);

	const onMeasureToolClick = useCallback(() => {
		const nextPhase = isMeasureActive
			? MEASURE_PHASE.IDLE
			: MEASURE_PHASE.ARMED;

		dispatch(setMeasurePhase(nextPhase));
	}, [dispatch, isMeasureActive]);

	const onSaveAs = useCallback(async () => {
		try {
			await createFile(FILE_TYPES.SAVE);
		} catch (error) {
			console.error('Error creating .cfsevents file', error);
		}
	}, []);

	const onExport = useCallback(async () => {
		try {
			await createFile(FILE_TYPES.EXPORT);
		} catch (error) {
			console.error('Error exporting the session', error);
		}
	}, []);

	// The purpose of this effect is to trigger a re-render of the component every minute when the session is active or ended,
	// so that the elapsed time tooltip is updated accordingly.
	useEffect(() => {
		if (!isStateActiveOrEnded || !lastUpdate) return;

		const intervalId = window.setInterval(() => {
			setNow(Date.now());
		}, 60_000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [isStateActiveOrEnded, lastUpdate]);

	const headerContentDict: Record<NavigationItem, TopBarSlots> = {
		[navigationItems.timeline]: {
			start: (
				<div
					className={
						isMeasureActive ? styles.measureButtonActive : ''
					}
				>
					<TopbarButton
						title='Measure'
						icon={<MeasurementIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Right}
						clickHandler={onMeasureToolClick}
					/>
				</div>
			),
			end: (
				<SevHeaderFileButtons
					onSaveAs={onSaveAs}
					onExport={onExport}
					onHelpClick={() => undefined}
				/>
			)
		},
		[navigationItems.list]: defaultSlots
	};

	const badge = (
		<Badge appearance='secondary'>
			<span className={styles.statusContent}>
				<span
					className={`${styles.dotContent} ${styles[status?.dot ?? ''] ?? ''}`}
				/>
				<span className={styles.label}>{status?.label}</span>
			</span>
		</Badge>
	);

	const showStatus = (
		<div className={styles.statusContainer}>
			{tooltip ? (
				<Tooltip title={tooltip} position='right' type='short'>
					{badge}
				</Tooltip>
			) : (
				badge
			)}
		</div>
	);

	const slots = headerContentDict[activeScreen] ?? defaultSlots;

	return (
		<CfsTopBar>
			<div slot='start'>{slots.start}</div>

			<div slot='center' className={styles.title}>
				<span>
					{t({
						id: `${activeScreen}.title`
					})}
				</span>

				{status &&
					activeScreen === navigationItems.timeline &&
					showStatus}
			</div>

			<div slot='end'>{slots.end}</div>
		</CfsTopBar>
	);
}

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

import {useCallback, useMemo, useState, type MouseEvent} from 'react';

import {Badge, MeasurementIcon, Tooltip} from 'cfs-react-library';
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Direction} from '@common/components/tooltip/Tooltip';
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';
import SevHeaderFileButtons from './sev-header-file-buttons';

import {useEventSources} from '../../state/slices/event-sources/event-sources.selector';
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
import {
	formatElapsedTime,
	formatAbsoluteDate
} from '../../common/utils/status-time';
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
		tooltip: '',
		dot: 'active'
	},
	running: {
		label: 'Code Running',
		tooltip: 'Pause code to update timeline view',
		dot: 'running'
	},
	ended: {
		label: 'Session Ended',
		tooltip: '',
		dot: undefined
	},
	file: {
		label: 'Local File',
		tooltip: '',
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
	const eventSources = useEventSources();
	const isMeasureActive = isMeasureModeActive(measurePhase);
	const toolState = useToolState();
	const lastUpdate = useLastUpdate();
	const status = toolState ? statusDictionary[toolState] : null;
	const [elapsedTimeComputedAt, setElapsedTimeComputedAt] = useState(
		() => Date.now()
	);
	const elapsedTime = useMemo(
		() =>
			formatElapsedTime(lastUpdate, new Date(elapsedTimeComputedAt)),
		[lastUpdate, elapsedTimeComputedAt]
	);

	const absoluteDate = useMemo(
		() => formatAbsoluteDate(lastUpdate),
		[lastUpdate]
	);

	const tooltip = useMemo(() => {
		if (!toolState || !status) {
			return undefined;
		}

		switch (toolState) {
			case 'active':
				if (eventSources.length === 0) {
					return 'No events have been received yet';
				}

				return elapsedTime
					? `Last updated ${elapsedTime}`
					: undefined;
			case 'running':
				return status.tooltip;
			case 'ended':
				return elapsedTime
					? `Last updated ${elapsedTime}`
					: undefined;
			case 'file':
				return absoluteDate
					? `Opened local file. Last updated ${absoluteDate}`
					: status.tooltip;
			default:
				return undefined;
		}
	}, [toolState, status, eventSources, elapsedTime, absoluteDate]);

	const onMeasureToolClick = useCallback(() => {
		const nextPhase = isMeasureActive
			? MEASURE_PHASE.IDLE
			: MEASURE_PHASE.ARMED;

		dispatch(setMeasurePhase(nextPhase));
	}, [dispatch, isMeasureActive]);

	const handleMeasureButtonMouseDown = useCallback(
		(ev: MouseEvent<HTMLDivElement>) => {
			ev.preventDefault();
		},
		[]
	);

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

	const handleStatusMouseEnter = useCallback(() => {
		setElapsedTimeComputedAt(Date.now());
	}, []);

	const headerContentDict: Record<NavigationItem, TopBarSlots> = {
		[navigationItems.timeline]: {
			start: (
				<div
					className={
						isMeasureActive ? styles.measureButtonActive : ''
					}
					onMouseDownCapture={handleMeasureButtonMouseDown}
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
		<div
			className={styles.statusContainer}
			data-test='sev-header:status-badge'
			onMouseEnter={handleStatusMouseEnter}
		>
			{tooltip ? (
				<Tooltip
					title={tooltip}
					position='right'
					type='short'
					dataTest='sev-header:status-tooltip'
				>
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

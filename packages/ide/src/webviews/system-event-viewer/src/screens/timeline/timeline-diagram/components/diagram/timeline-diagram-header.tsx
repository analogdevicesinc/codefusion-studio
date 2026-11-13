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

import {useCallback, type ReactNode} from 'react';
import {useDispatch} from 'react-redux';
import {
	useTimeMode,
	useTimeAvailability
} from '../../../../../state/slices/timeline/timeline.selector';
import {setTimeMode} from '../../../../../state/slices/timeline/timeline.reducer';

import TimeUnitChart from './time-unit-chart';
import TimeReferenceBlock from './time-reference-block';
import TopbarButton from '../../../../../../../common/components/cfs-top-bar/TopbarButton';
import {Direction} from '../../../../../../../common/utils';

import type {TimeMode} from '../../../../../common/utils/time-mode-formatters';
import type {
	HeaderChartHandle,
	Range
} from '../../../../../common/types/timeline';

import styles from './timeline-diagram-header.module.scss';

type TimelineDiagramHeaderProps = Readonly<{
	timestampRange: Range;
	measurementViewport: ReactNode;
	registerHeaderChart: (handle: HeaderChartHandle) => void;
	unregisterHeaderChart: () => void;
}>;

function TimelineDiagramHeader({
	timestampRange,
	measurementViewport,
	registerHeaderChart,
	unregisterHeaderChart
}: TimelineDiagramHeaderProps) {
	const dispatch = useDispatch();
	const timeMode = useTimeMode();
	const timeAvailability = useTimeAvailability();

	const topBarRel = <span className={styles.topBarText}>REL</span>;
	const topBarClockTicks = (
		<span className={styles.topBarText}>TICKS</span>
	);
	const topBarAbs = <span className={styles.topBarText}>ABS</span>;

	const handleTimeModeChange = useCallback(
		(mode: TimeMode) => {
			dispatch(setTimeMode(mode));
		},
		[dispatch]
	);

	return (
		<div
			className={styles.timelineDiagramHeaderContainer}
			data-test='timeline-diagram:header'
		>
			<div
				className={styles.headerTopBar}
				data-test='timeline-diagram:header-top-bar'
			>
				<TimeReferenceBlock />

				<section className={styles.timeModeButtons}>
					<TopbarButton
						title='Relative Time'
						icon={topBarRel}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='startingRadius'
						className={`${styles.timeModeRel} ${timeMode === 'relative' ? styles.active : ''}`}
						clickHandler={() => handleTimeModeChange('relative')}
					/>
					<TopbarButton
						isDisabled={!timeAvailability.abs}
						title='Absolute Time'
						icon={topBarAbs}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='square'
						className={`${styles.timeModeAbs} ${timeMode === 'absolute' ? styles.active : ''}`}
						clickHandler={() => handleTimeModeChange('absolute')}
					/>
					<TopbarButton
						title='Clock Ticks'
						icon={topBarClockTicks}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='endingRadius'
						className={`${styles.timeModeClockTicks} ${timeMode === 'clock' ? styles.active : ''}`}
						clickHandler={() => handleTimeModeChange('clock')}
					/>
				</section>
			</div>

			<div className={styles.chartRegion}>
				<div className={styles.chartSurface}>
					<TimeUnitChart
						timestampRange={timestampRange}
						timeMode={timeMode}
						registerHeaderChart={registerHeaderChart}
						unregisterHeaderChart={unregisterHeaderChart}
					/>
				</div>
				{measurementViewport}
			</div>
		</div>
	);
}

export default TimelineDiagramHeader;

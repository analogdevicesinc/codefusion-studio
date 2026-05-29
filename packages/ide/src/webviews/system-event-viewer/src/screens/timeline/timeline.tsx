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

import {useMemo} from 'react';
import {EmptyState} from 'cfs-react-library';
import TimelineDiagram from './timeline-diagram/timeline-diagram';
import {useEventSources} from '../../state/slices/event-sources/event-sources.selector';
import {TIMELINE_CONTAINER_ID} from '../../common/constants/timeline';
import type {SevEventSource} from '../../common/types/events';

import styles from './timeline.module.scss';

export default function Timeline() {
	const eventSources: SevEventSource[] = useEventSources();

	const timestampRange = useMemo(() => {
		const minTimestamp = eventSources.reduce((min, evSource) => {
			const evSourceMin = evSource.timestamps.reduce(
				(min, timestamp) => Math.min(min, timestamp.value),
				Infinity
			);

			return Math.min(min, evSourceMin);
		}, Infinity);

		const maxTimestamp = eventSources.reduce((max, evSource) => {
			const evSourceMax = evSource.timestamps.reduce(
				(max, timestamp) => Math.max(max, timestamp.value),
				-Infinity
			);

			return Math.max(max, evSourceMax);
		}, -Infinity);

		return {max: maxTimestamp, min: minTimestamp};
	}, [eventSources]);

	const NoDataState = (
		<div className={styles.noDataContainer}>
			<EmptyState>
				<div slot='body'>No event sources to show!</div>
			</EmptyState>
		</div>
	);

	return (
		<div
			id={TIMELINE_CONTAINER_ID}
			className={styles.timelineContainer}
			data-test='timeline:container'
		>
			{eventSources.length > 0 ? (
				<TimelineDiagram
					eventSources={eventSources}
					timestampRange={timestampRange}
				/>
			) : (
				NoDataState
			)}
		</div>
	);
}

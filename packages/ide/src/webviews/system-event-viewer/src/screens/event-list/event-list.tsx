/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import TimestampsTable from './event-table/event-table';
import {useEventSources} from '../../state/slices/event-sources/event-sources.selector';
import {sortAllTimestamps} from '../../common/utils/events';
import type {SevEventSource} from '../../common/types/events';

import styles from './event-list.module.scss';

export default function EventList() {
	const eventSources: SevEventSource[] = useEventSources();

	const sortedTimestamps = useMemo(
		() => sortAllTimestamps(eventSources),
		[eventSources]
	);

	return (
		<div className={styles.eventListContainer}>
			<div className={styles.content}>
				<TimestampsTable list={sortedTimestamps} />
			</div>
		</div>
	);
}

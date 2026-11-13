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

import {signalReady} from '@common/api';
import {isCypressEnvironment} from '@common/utils/env';
import {
	subscribeToEventSources,
	updateEventSourceIndex
} from '../../common/api';
import {
	setEventSourceData,
	setJsonValidationErrors,
	setLoading
} from '../../state/slices/event-sources/event-sources.reducer';
import {
	setLastUpdate,
	setToolState
} from '../../state/slices/app-context/app-context.reducer';
import {
	resetMeasurePhase,
	setTimeAvailability
} from '../../state/slices/timeline/timeline.reducer';
import {TIMESTAMPS} from '../constants/mocked-event-sources';
import {
	mapEventSources,
	normalizeEventSourceIndex,
	serializeEventSourceIndex
} from './events';
import {configureTimeContext} from './time-mode-formatters';

import type {
	CfsEventState,
	EventSourceTreeNode,
	SevEventSource
} from '../types/events';
import type {AppDispatch} from '../../state/store';

/**
 * Starts the SEV event sources subscription exactly once
 * Dispatches Redux updates on init and on each document change
 */
export function startSystemEventsService(dispatch: AppDispatch) {
	dispatch(setLoading(true));

	if (isCypressEnvironment()) {
		const timer = setTimeout(() => {
			const eventSources = mapEventSources(TIMESTAMPS);
			configureTimeContext({
				tickFrequency: TIMESTAMPS.tickFrequency,
				tickEpoch: TIMESTAMPS.tickEpoch
			});
			dispatch(
				setTimeAvailability({abs: Boolean(TIMESTAMPS.tickEpoch)})
			);

			dispatch(resetMeasurePhase());
			dispatch(
				setEventSourceData({
					eventSources,
					eventSourceIndex: normalizeEventSourceIndex(
						TIMESTAMPS.eventSourceIndex,
						eventSources
					)
				})
			);
			dispatch(setLastUpdate(undefined));
			dispatch(setLoading(false));
		}, 1000);

		return () => {
			clearTimeout(timer);
		};
	}

	const unsubscribe = subscribeToEventSources(
		(data: {
			sources: SevEventSource[];
			tickFrequency: number;
			tickEpoch?: string;
			eventSourceIndex?: EventSourceTreeNode[];
			state?: CfsEventState;
			lastUpdate?: string;
			jsonErrors?: string[];
		}) => {
			const {
				sources,
				tickFrequency,
				tickEpoch,
				eventSourceIndex,
				state,
				lastUpdate,
				jsonErrors
			} = data;

			if (jsonErrors?.length) {
				configureTimeContext({tickFrequency: 1});
				dispatch(setTimeAvailability({abs: false}));
				dispatch(resetMeasurePhase());
				dispatch(
					setEventSourceData({
						eventSources: [],
						eventSourceIndex: undefined
					})
				);
				dispatch(setJsonValidationErrors(jsonErrors));
				dispatch(setLoading(false));
				dispatch(setToolState(undefined));
				dispatch(setLastUpdate(undefined));

				return;
			}

			configureTimeContext({tickFrequency, tickEpoch});
			dispatch(setTimeAvailability({abs: Boolean(tickEpoch)}));
			dispatch(resetMeasurePhase());
			dispatch(
				setEventSourceData({
					eventSources: sources,
					eventSourceIndex
				})
			);
			dispatch(setJsonValidationErrors([]));
			dispatch(setLoading(false));
			dispatch(setToolState(state));
			dispatch(setLastUpdate(lastUpdate));
		}
	);

	// Tell the extension that the UI is ready to receive the initial payload
	signalReady();

	return () => {
		unsubscribe();
	};
}

/**
 * Trigger an update of the event source tree in the extension
 * This should be called whenever the event source tree is updated, such as when the user moves a node or renames a group.
 * @param updatedTree
 */
export const updateEventSourceTree = (
	updatedTree: EventSourceTreeNode[]
) => {
	void updateEventSourceIndex(
		serializeEventSourceIndex(updatedTree)
	).catch(error => {
		console.error('Failed to persist event-source layout', error);
	});
};

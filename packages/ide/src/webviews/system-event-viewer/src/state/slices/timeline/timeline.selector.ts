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
import {useAppSelector} from '../../store';

export const useDataZoom = () =>
	useAppSelector(state => state.timelineReducer.dataZoom);

export const useEventSourcesListWidth = () =>
	useAppSelector(
		state => state.timelineReducer.eventSourcesListWidth
	);

export const useReferenceValue = () =>
	useAppSelector(state => state.timelineReducer.referenceValue);

export const useTimeMode = () =>
	useAppSelector(state => state.timelineReducer.timeMode);

export const useTimeAvailability = () =>
	useAppSelector(state => state.timelineReducer.timeAvailability);

export const useMeasurePhase = () =>
	useAppSelector(state => state.timelineReducer.measurePhase);

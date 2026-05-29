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

export const useEventSources = () =>
	useAppSelector(state => state.eventSourcesReducer.eventSources);

export const useEventsLoading = () =>
	useAppSelector(state => state.eventSourcesReducer.loading);

export const useJsonValidationErrors = () =>
	useAppSelector(
		state => state.eventSourcesReducer.jsonValidationErrors
	);

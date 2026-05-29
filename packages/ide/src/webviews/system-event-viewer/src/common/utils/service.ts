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
import {subscribeToEventSources} from '../../common/api';
import {
  setEventSources,
  setJsonValidationErrors,
  setLoading
} from '../../state/slices/event-sources/event-sources.reducer';
import {
  setLastUpdate,
  setToolState
} from '../../state/slices/app-context/app-context.reducer';
import {TIMESTAMPS} from '../constants/mocked-event-sources';
import {mapEventSources} from './events';

import type {
  CfsEventState,
  SevEventSource
} from '../../common/types/events';
import type {AppDispatch} from '../../state/store';

/**
 * Starts the SEV event sources subscription exactly once
 * Dispatches Redux updates on init and on each document change
 */
export function startSystemEventsService(dispatch: AppDispatch) {
  dispatch(setLoading(true));

  if (isCypressEnvironment()) {
    const timer = setTimeout(() => {
      dispatch(setEventSources(mapEventSources(TIMESTAMPS)));
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
      state?: CfsEventState;
      lastUpdate?: string;
      jsonErrors?: string[];
    }) => {
      const {sources, state, lastUpdate, jsonErrors} = data;

      if (jsonErrors?.length) {
        dispatch(setEventSources([]));
        dispatch(setJsonValidationErrors(jsonErrors));
        dispatch(setLoading(false));
        dispatch(setToolState(undefined));
        dispatch(setLastUpdate(undefined));

        return;
      }

      dispatch(setEventSources(sources));
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

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

import {useCallback} from 'react';
import {useAppDispatch} from '../state/store';
import {
	removeSignalAssignment,
	setActiveSignal
} from '../state/slices/peripherals/peripherals.reducer';
import {removeAppliedSignal} from '../state/slices/pins/pins.reducer';

export default function useDeleteSignalAssignment(
	peripheral: string,
	signal: string,
	pin: string
) {
	const dispatch = useAppDispatch();

	return useCallback(() => {
		dispatch(
			// Two Redux actions are dispatched synchronously — removeSignalAssignment and removeAppliedSignal.
			// Each triggers its own async persistence call to the extension, which does a full document replacement.
			// These two writes race: each reads the document, modifies only its subset, then writes the entire document back.
			// So we discard the persistence of this action so that the stale data does not get written back.
			removeSignalAssignment({
				signalName: signal,
				peripheral,
				discardPersistence: true
			})
		);
		dispatch(
			removeAppliedSignal({
				Pin: pin,
				Peripheral: peripheral,
				Name: signal
			})
		);
		dispatch(setActiveSignal(undefined));
	}, [dispatch, peripheral, signal, pin]);
}

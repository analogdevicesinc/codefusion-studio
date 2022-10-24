/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from '../../store';
import {type PinDictionary} from '@common/types/soc';

let dataModelPins: PinDictionary | undefined;

export function usePin(id: string) {
	return useAppSelector(state => state.pinsReducer.pins[id]);
}

export function usePackagePins() {
	return useAppSelector(state => state.pinsReducer.pins);
}

const dataModelPinsSelector = createSelector(
	(state: RootState) => state.pinsReducer.pins,
	pins => {
		if (dataModelPins !== undefined) {
			return dataModelPins;
		}

		dataModelPins = pins;

		return pins;
	}
);

export function useDataModelPins() {
	return useAppSelector(dataModelPinsSelector);
}

export function usePackageCanvas() {
	return useAppSelector(state => state.pinsReducer.canvas);
}

export function usePinDetailsTargetPin() {
	return useAppSelector(
		state => state.pinsReducer.pinDetailsTargetPin
	);
}

export function usePinDetails(id: string | undefined) {
	return useAppSelector(state =>
		id ? state.pinsReducer.pins[id].details : undefined
	);
}

const selectFocusedPins = createSelector(
	(state: RootState) => state.pinsReducer.pins,
	pins =>
		Object.values(pins)
			.filter(pin => pin.isFocused)
			.map(pin => pin.details.Name)
);

export function useFocusedPins() {
	return useAppSelector(selectFocusedPins);
}

export function usePinAppliedSignals(id: string | undefined) {
	return useAppSelector(state =>
		id ? state.pinsReducer.pins[id]?.appliedSignals : undefined
	);
}

// Memoize useAssignedPins to avoid unnecessary re-renders
const selectPins = (state: RootState) => state.pinsReducer.pins;
export const selectAssignedPins = createSelector([selectPins], pins =>
	Object.values(pins).filter(pin => pin.appliedSignals.length)
);

export function useAssignedPins() {
	return useAppSelector(selectAssignedPins);
}

export function useAppliedSignalCfg(
	pinId: string | undefined,
	signalName: string | undefined
) {
	return useAppSelector(state => {
		if (pinId && signalName) {
			return state.pinsReducer.pins[pinId]?.appliedSignals.find(
				appliedSignal => appliedSignal.Name === signalName
			);
		}

		return undefined;
	});
}

export function usePinConfig() {
	return useAppSelector(state => state.pinsReducer.pinConfig);
}

export function usePinConfigError(
	pinId: string,
	signalName: string,
	control: string
) {
	return useAppSelector(state => {
		if (pinId && signalName) {
			return state.pinsReducer.pins[pinId]?.appliedSignals.find(
				appliedSignal => appliedSignal.Name === signalName
			)?.Errors?.[control];
		}
	});
}

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
import {combineReducers, configureStore} from '@reduxjs/toolkit';
import type {Action, ThunkAction} from '@reduxjs/toolkit';
import {
	appContextReducer,
	appContextInitialState
} from './slices/app-context/appContext.reducer';

import {
	pinsReducer,
	pinsInitialState
} from './slices/pins/pins.reducer';
import {
	peripheralsReducer,
	peripheralsInitialState
} from './slices/peripherals/peripherals.reducer';
import {
	clockNodesReducer,
	clockNodesInitialState
} from './slices/clock-nodes/clockNodes.reducer';
import {
	type TypedUseSelectorHook,
	useDispatch,
	useSelector
} from 'react-redux';
import type {
	ConfiguredPin,
	ConfigOptionsReturn,
	ConfiguredClockNode
} from '../../../common/api';
import {
	formatPinDictionary,
	formatPeripheralData
} from '../utils/json-formatter';
import type {
	ClockNode,
	ClockNodesDictionary,
	ControlCfg,
	RegisterDictionary,
	Soc
} from '../../../common/types/soc';
import {
	applyPersistedClockNodeConfig,
	applyPersistedPinConfig
} from '../utils/persistence';
import {
	getPersistenceListenerMiddleware,
	persistedActions
} from './utils/persistence-middleware';
import {computeDefaultValues} from '../utils/compute-register-value';
import {getPersistedSocData} from '../utils/api';
import {getFirmwarePlatform} from '../utils/firmware-platform';

type ResolvedType<T> = T extends Promise<infer R> ? R : T;

export type Store = ResolvedType<
	ReturnType<typeof getPreloadedStateStore>
>;

export type AppDispatch = ResolvedType<
	ReturnType<typeof getPreloadedStateStore>
>['dispatch'];

export type RootState = ReturnType<
	ResolvedType<ReturnType<typeof getPreloadedStateStore>>['getState']
>;

export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action
>;

const rootReducer = combineReducers({
	// New slices go here
	appContextReducer,
	pinsReducer,
	peripheralsReducer,
	clockNodesReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

function computeDefaultClockNodeValues(
	clockNode: ClockNode,
	registerDictionary: RegisterDictionary[],
	controls: ControlCfg[]
) {
	/* Work out the default from the reset values of the registers. */
	const defaults: Record<string, string> = computeDefaultValues(
		clockNode.Config,
		registerDictionary,
		controls
	);
	/* But if the default is specified in the control, then that overrides the register default. */
	const firmwarePlatform = getFirmwarePlatform();

	if (
		firmwarePlatform?.toLowerCase().includes('zephyr') &&
		clockNode.ConfigZephyr
	) {
		for (const [controlValueKey, controlValues] of Object.entries(
			clockNode.ConfigZephyr
		)) {
			for (const [key, config] of Object.entries(controlValues)) {
				if (config.Default) {
					defaults[controlValueKey] = key;
				}
			}
		}
	} else if (
		firmwarePlatform?.toLowerCase().includes('msdk') &&
		clockNode.ConfigMSDK
	) {
		for (const [controlValueKey, controlValues] of Object.entries(
			clockNode.ConfigMSDK
		)) {
			for (const [key, config] of Object.entries(controlValues)) {
				if (config.Default) {
					defaults[controlValueKey] = key;
				}
			}
		}
	}

	return defaults;
}

export function configurePreloadedStore(
	soc: Soc,
	persistedPinConfig?: ConfiguredPin[],
	persistedClockNodes?: ConfiguredClockNode[]
) {
	const pinReducerInitialState = {
		...pinsInitialState,
		...(soc.Packages?.[0].Pins
			? {
					pins: formatPinDictionary(soc.Packages[0]),
					canvas: soc.Packages?.[0].PinCanvas,
					pinConfig: soc.Controls.PinConfig
				}
			: {})
	};

	const registerDictionary = soc.Registers.map(register => ({
		name: register.Name,
		description: register.Description,
		address: register.Address,
		size: register.Size,
		fields: register.Fields.map((field, fieldIdx) => ({
			id: `${field.Name}-${fieldIdx}`,
			name: field.Name,
			description: field.Description,
			documentation: field.Documentation,
			position: field.Position,
			length: field.Length,
			reset: field.Reset,
			access: field.Access,
			enumVals: field.Enum?.map((enumVal, enumValIdx) => ({
				id: `${enumVal.Name}-${enumValIdx}`,
				name: enumVal.Name,
				description: enumVal.Description,
				value: enumVal.Value,
				documentation: enumVal.Documentation
			}))
		})),
		svg: `${soc.Name}-${soc.Packages[0].Name}/${register.Svg}`
	}));

	const clockNodesReducerInitialState = {
		...clockNodesInitialState,
		clockNodes: soc.ClockNodes.reduce<ClockNodesDictionary>(
			(acc, clockNode) => {
				acc[clockNode.Type] = {
					...acc[clockNode.Type],
					[clockNode.Name]: {
						...clockNode,
						controlValues: computeDefaultClockNodeValues(
							clockNode,
							registerDictionary,
							soc.Controls.ClockConfig
						),
						initialControlValues: computeDefaultClockNodeValues(
							clockNode,
							registerDictionary,
							soc.Controls.ClockConfig
						)
					}
				};

				return acc;
			},
			{}
		),
		activeClockNodeType: undefined,
		clockNodeDetailsTargetNode: undefined,
		clockConfig: soc.Controls.ClockConfig
	};

	if (
		persistedPinConfig &&
		Object.keys(persistedPinConfig).length > 0
	) {
		applyPersistedPinConfig(
			pinReducerInitialState.pins,
			persistedPinConfig
		);
	}

	if (
		persistedClockNodes &&
		Object.keys(persistedClockNodes).length > 0
	) {
		applyPersistedClockNodeConfig(
			clockNodesReducerInitialState.clockNodes,
			persistedClockNodes
		);
	}

	return configureStore({
		reducer: rootReducer,
		middleware: getDefaultMiddleware =>
			getDefaultMiddleware().prepend(
				...getPersistenceListenerMiddleware(persistedActions)
			),
		preloadedState: {
			pinsReducer: pinReducerInitialState,
			peripheralsReducer: {
				...peripheralsInitialState,
				peripherals: formatPeripheralData(soc)
			},
			appContextReducer: {
				...appContextInitialState,
				configScreen: {
					activeConfiguredSignalId: {}
				},
				registersScreen: {
					registers: registerDictionary
				}
			},
			clockNodesReducer: clockNodesReducerInitialState
		}
	});
}

export async function getPreloadedStateStore() {
	let persistedSocData: ConfigOptionsReturn;

	if (import.meta.env.MODE === 'development') {
		persistedSocData = {
			dataModel: (window as any).__DEV_SOC__,
			configOptions: undefined
		};
	} else {
		persistedSocData = await getPersistedSocData();
	}

	const {dataModel, configOptions} = persistedSocData ?? {};

	const {Pins: persistedPinConfig, ClockNodes: persistedClockNodes} =
		configOptions ?? {};

	if (!dataModel) {
		throw new Error(
			'There was an error loading your configuration data.'
		);
	}

	const store = configurePreloadedStore(
		dataModel,
		persistedPinConfig,
		persistedClockNodes
	);

	return store;
}

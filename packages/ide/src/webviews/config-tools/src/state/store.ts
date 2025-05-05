/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import type {ConfigOptionsReturn} from '../../../common/api';
import {
	formatPinDictionary,
	formatPeripheralSignalsTargets,
	formatPartitions,
	formatPeripheralAllocations
} from '../utils/json-formatter';
import type {
	ClockNode,
	ClockNodesDictionary,
	ControlCfg,
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
import {
	getControlsForProjectIds,
	getSocAndCfsconfigData
} from '../utils/api';
import {
	partitionsInitialState,
	partitionsReducer
} from './slices/partitions/partitions.reducer';
import {getCoreMemoryBlocks} from '../utils/memory';
import {type PeripheralConfig} from '../types/peripherals';
import {getPrimaryProjectId} from '../utils/config';
import {CONTROL_SCOPES} from '../constants/scopes';

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

export const rootReducer = combineReducers({
	// New slices go here
	appContextReducer,
	pinsReducer,
	peripheralsReducer,
	clockNodesReducer,
	partitionsReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

function computeDefaultClockNodeValues(
	clockNode: ClockNode,
	controls: ControlCfg[]
) {
	/* Work out the default from the reset values of the registers. */
	const defaults: Record<string, string> = computeDefaultValues(
		clockNode.Config,
		controls
	);

	return defaults;
}

export function configurePreloadedStore(
	soc: Soc,
	persistedConfig?: ConfigOptionsReturn['configOptions'],
	clockControls?: Record<string, ControlCfg[]>
) {
	const {
		Pins: persistedPinConfig,
		ClockNodes: persistedClockNodes,
		Projects: persistedCores
	} = persistedConfig ?? {};

	const peripheralsReducerInitialState = {
		...peripheralsInitialState,
		peripheralSignalsTargets: formatPeripheralSignalsTargets(soc),
		assignments: persistedCores
			? formatPeripheralAllocations(persistedCores)
			: ({} satisfies Record<string, PeripheralConfig>)
	};

	const pinReducerInitialState = {
		...pinsInitialState,
		...(soc.Packages?.[0].Pins
			? {
					pins: formatPinDictionary(soc.Packages[0])
				}
			: {})
	};

	const clockNodesReducerInitialState = {
		...clockNodesInitialState,
		clockNodes: soc.ClockNodes.reduce<ClockNodesDictionary>(
			(acc, clockNode) => {
				// Use default overrides if available, otherwise compute
				const defaultValues = computeDefaultClockNodeValues(
					clockNode,
					clockControls?.[clockNode.Name] ?? []
				);

				acc[clockNode.Name] = {
					Name: clockNode.Name,
					controlValues: defaultValues,
					initialControlValues: defaultValues
				};

				return acc;
			},
			{}
		),
		activeClockNodeType: undefined,
		clockNodeDetailsTargetNode: undefined,
		clockConfig: soc.Controls.ClockConfig
	};

	const memoryBlocks = getCoreMemoryBlocks();

	const partitionReducerInitialState = {
		...partitionsInitialState,

		partitions: persistedCores
			? formatPartitions(soc, persistedCores, memoryBlocks)
			: []
	};

	if (
		persistedPinConfig &&
		Object.keys(persistedPinConfig).length > 0
	) {
		applyPersistedPinConfig(
			pinReducerInitialState.pins,
			persistedPinConfig,
			persistedCores
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
			peripheralsReducer: peripheralsReducerInitialState,
			appContextReducer: {
				...appContextInitialState,
				configScreen: {
					activeConfiguredSignalId: {}
				}
			},
			clockNodesReducer: clockNodesReducerInitialState,
			partitionsReducer: partitionReducerInitialState
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
		persistedSocData = await getSocAndCfsconfigData();
	}

	const {dataModel, configOptions} = persistedSocData ?? {};

	const clockControls = await getControlsForProjectIds(
		[getPrimaryProjectId() ?? ''],
		CONTROL_SCOPES.CLOCK_CONFIG
	);

	if (!dataModel) {
		throw new Error(
			'There was an error loading your configuration data.'
		);
	}

	const store = configurePreloadedStore(
		dataModel,
		configOptions,
		clockControls
	);

	return store;
}

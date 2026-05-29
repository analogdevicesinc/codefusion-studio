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

import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';

import {
	setCpuLoadInterval,
	setInterface,
	setMemoryUsageInterval,
	setUARTPort,
	setValidationErrors,
	toggleAIProfilingEnabled,
	toggleCpuLoadEnabled,
	toggleInstrumentationSubsystemEnabled,
	toggleMemoryUsageEnabled,
	toggleProfilingEnabled,
	toggleRtosEventsEnabled,
	type ZephelinConfigErrors
} from '../slices/profiling/profiling.reducer';
import {updateProfilingConfig} from '../../utils/api';
import {type RootState} from '../store';
import {
	getMaxCpuLoadInterval,
	getMaxProfilingMemoryInterval,
	getMinCpuLoadInterval,
	getMinProfilingMemoryInterval
} from '../slices/profiling/profilingPeripherals';
import {type Zephelin} from 'cfs-types';
import {
	getLocalization,
	localizeMessage
} from '../../../../common/utils/localization';
import {type TLocaleContext} from '../../common/types/context';

export const persistedProfilingActions: Array<
	ActionCreatorWithPayload<any>
> = [
	toggleProfilingEnabled,
	toggleRtosEventsEnabled,
	toggleMemoryUsageEnabled,
	setMemoryUsageInterval,
	toggleCpuLoadEnabled,
	setCpuLoadInterval,
	toggleAIProfilingEnabled,
	toggleInstrumentationSubsystemEnabled,
	setInterface,
	setUARTPort
];

export function getProfilingPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			effect(action, listenerApi) {
				const {projectId} = action.payload as {projectId: string};
				const state = listenerApi.getState() as RootState;
				const config = state.profilingReducer.zephelin[projectId];

				void updateProfilingConfig(config, 'Zephelin', projectId);

				listenerApi.dispatch(
					setValidationErrors({
						projectId,
						errors: validateProfilingConfig(config)
					})
				);
			}
		});

		return listenerMiddleware.middleware;
	});
}

const validateProfilingConfig = (
	config: Partial<Zephelin> | undefined
): ZephelinConfigErrors => {
	const translations: TLocaleContext | undefined =
		getLocalization('cfgtools');
	const errors: ZephelinConfigErrors = {};

	if (config === undefined) {
		return errors;
	}

	if (config.ProfilingMemoryUsageEnabled) {
		if (config.ProfilingMemoryUsageInterval === undefined) {
			errors.ProfilingMemoryUsageInterval = localizeMessage(
				translations,
				'profiling.errors.invalid-input',
				{fieldName: 'Memory Usage Interval'}
			);
		} else if (
			config.ProfilingMemoryUsageInterval <
			getMinProfilingMemoryInterval()
		) {
			errors.ProfilingMemoryUsageInterval = localizeMessage(
				translations,
				'profiling.errors.value-too-low',
				{
					minValue: getMinProfilingMemoryInterval().toString(),
					unit: 'ms'
				}
			);
		} else if (
			config.ProfilingMemoryUsageInterval >
			getMaxProfilingMemoryInterval()
		) {
			errors.ProfilingMemoryUsageInterval = localizeMessage(
				translations,
				'profiling.errors.value-too-high',
				{
					maxValue: getMaxProfilingMemoryInterval().toString(),
					unit: 'ms'
				}
			);
		}
	}

	if (config.ProfilingCpuLoadEnabled) {
		if (config.ProfilingCpuLoadInterval === undefined) {
			errors.ProfilingCpuLoadInterval = localizeMessage(
				translations,
				'profiling.errors.invalid-input',
				{fieldName: 'CPU Load Interval'}
			);
		} else if (
			config.ProfilingCpuLoadInterval < getMinCpuLoadInterval()
		) {
			errors.ProfilingCpuLoadInterval = localizeMessage(
				translations,
				'profiling.errors.value-too-low',
				{
					minValue: getMinCpuLoadInterval().toString(),
					unit: 'ms'
				}
			);
		} else if (
			config.ProfilingCpuLoadInterval > getMaxCpuLoadInterval()
		) {
			errors.ProfilingCpuLoadInterval = localizeMessage(
				translations,
				'profiling.errors.value-too-high',
				{
					maxValue: getMaxCpuLoadInterval().toString(),
					unit: 'ms'
				}
			);
		}
	}

	return errors;
};

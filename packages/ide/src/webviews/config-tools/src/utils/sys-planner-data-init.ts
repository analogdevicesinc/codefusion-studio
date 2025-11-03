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
import {initializeSocCores} from './soc-cores';
import {initializeConfigDict} from './config';
import {initializePinCanvas} from './pin-canvas';
import {initializeClockCanvas} from './clock-canvas';
import {initializeClockNodes} from './clock-nodes';
import {initializeSocMemoryTypes} from './memory';
import {initializeSocPackage} from './soc-pins';
import {initializeSocPeripherals} from './soc-peripherals';
import {initializeSocControls} from './soc-controls';
import {initializeRegisterDictionary} from './register-dictionary';
import type {Soc} from '../../../common/types/soc';
import type {CfsConfig} from 'cfs-plugins-api';
import {initializeDfg} from './dfg';
import {initializeAiToolsData} from './ai-tools';
import {initializeProfilingPeripherals} from '../state/slices/profiling/profilingPeripherals';

/**
 * Initializes all SoC-related data structures for the system planner.
 * Should be called once at app startup.
 * @param dataModel The SoC data model
 * @param configOptions The persisted config options
 */
export function sysPlannerDataInit(
	dataModel: Soc,
	configOptions?: CfsConfig | undefined
) {
	if (configOptions) {
		initializeConfigDict(configOptions, dataModel);
	}

	initializeSocCores(dataModel.Cores);
	initializePinCanvas(dataModel.Packages?.[0]?.PinCanvas);
	initializeClockCanvas(dataModel.Packages?.[0]?.ClockCanvas);
	initializeClockNodes(dataModel.ClockNodes);
	initializeSocPackage(dataModel.Packages?.[0]);
	initializeSocPeripherals(dataModel.Peripherals);
	initializeSocControls(dataModel.Controls);
	initializeRegisterDictionary(dataModel.Registers);
	initializeSocMemoryTypes(dataModel.MemoryTypes);
	initializeDfg(dataModel.Gaskets);

	initializeAiToolsData(dataModel.Cores, dataModel.Peripherals);
	initializeProfilingPeripherals(dataModel.Peripherals);
}

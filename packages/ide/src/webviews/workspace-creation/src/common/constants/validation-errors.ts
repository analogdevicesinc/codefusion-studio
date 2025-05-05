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

import type {ConfigErrors} from '../types/state';

export const configErrors: Record<string, keyof ConfigErrors> = {
	soc: 'soc',
	boardPackage: 'boardPackage',
	multiCoreTemplate: 'multiCoreTemplate',
	cores: 'cores',
	coreConfig: 'coreConfig',
	workspaceDetails: 'workspaceDetails'
};

export enum ERROR_TYPES {
	noSelection = 'noSelection',
	noPrimaryCore = 'noPrimaryCore',
	unconfiguredCore = 'unconfiguredCore',
	noCoreConfig = 'noCoreConfig'
}

export const ERROR_MESSAGES: Record<string, string> = {
	noSelection: 'Please make a selection.',
	noPrimaryCore: 'Primary core should be enabled and configured.',
	unconfiguredCore: 'Configure your selected core(s).',
	noCoreConfig: 'Please provide a value for all required fields.'
};

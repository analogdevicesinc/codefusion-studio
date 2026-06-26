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

import {type AiSupportingBackend} from '../../../../../common/types/ai-fusion-data-model';
import {type AISupportingCore} from '../../../utils/ai-tools';
import {initializeConfigDict} from '../../../utils/config';
import {findSupportedAiBackendsForCore} from './ai-model-utils';

const createBackend = (
	name: string,
	targets: AiSupportingBackend['Targets']
): AiSupportingBackend => ({
	Name: name,
	Description: `${name} backend for tests`,
	Formats: ['tflite'],
	Package: `test.package.${name}`,
	Module: `test.module.${name}`,
	Targets: targets,
	AdvancedTools: false,
	MaxModels: 99
});

const backendData: Record<string, AiSupportingBackend> = {
	izer: createBackend('izer', [
		{
			Hardware: {
				Soc: 'MAX78002',
				Core: 'CM4',
				Accelerator: 'cnn'
			},
			FirmwarePlatform: null
		}
	]),
	'cfsai.tflm': createBackend('cfsai.tflm', [
		{
			Hardware: {
				Family: 'sharcfx',
				Accelerator: null
			},
			FirmwarePlatform: null
		},
		{
			Hardware: {
				Family: 'cortex-m',
				Accelerator: null
			},
			FirmwarePlatform: null
		}
	])
};

const baseCfsConfig = {
	BoardName: 'TestBoard',
	Package: 'WLP',
	Projects: [],
	ClockNodes: [],
	Peripherals: [],
	Cores: [],
	Copyright: '',
	SchemaVersion: '2.1.0',
	DataModelVersion: '1.0.0',
	Pins: [],
	Partitions: [],
	Timestamp: ''
};

describe('Backend Selection', () => {
	it('should return an array of matching backends for a core with specific accelerator', () => {
		const cm4Core: AISupportingCore = {
			Id: 'CM4',
			Family: 'cortex-m',
			CoreNum: 0,
			Description: 'Cortex-M4 Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Cortex-M4',
			Backend: 'izer'
		};

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX78002'
			},
			{
				Cores: [cm4Core]
			}
		);

		// CM4 on MAX78002 with CNN accelerator should match izer backend
		expect(
			findSupportedAiBackendsForCore(backendData, {
				...cm4Core,
				Accelerator: 'cnn'
			})
		).to.deep.equal(['izer']);
	});

	it('should return one matching backend when criteria match a single backend', () => {
		const cm4Core: AISupportingCore = {
			Id: 'CM4',
			Family: 'cortex-m',
			CoreNum: 0,
			Description: 'Cortex-M4 Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Cortex-M4',
			Backend: 'cfsai.tflm'
		};

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX32690'
			},
			{
				Cores: [cm4Core]
			}
		);

		// CM4 without accelerator on MAX32690 should match cfsai.tflm backend only
		const supportedBackends = findSupportedAiBackendsForCore(
			backendData,
			cm4Core
		);
		expect(supportedBackends).to.deep.equal(['cfsai.tflm']);
		expect(supportedBackends).to.have.lengthOf(1);
	});

	it('should return all matching backends for the same core and accelerator', () => {
		const cm4Core: AISupportingCore = {
			Id: 'CM4',
			Family: 'cortex-m',
			CoreNum: 0,
			Description: 'Cortex-M4 Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Cortex-M4',
			Backend: 'izer.primary'
		};

		const multiMatchBackendData: Record<string, AiSupportingBackend> =
			{
				'izer.primary': createBackend('izer.primary', [
					{
						Hardware: {
							Soc: 'MAX78002',
							Core: 'CM4',
							Accelerator: 'cnn'
						},
						FirmwarePlatform: null
					}
				]),
				'izer.secondary': createBackend('izer.secondary', [
					{
						Hardware: {
							Soc: 'MAX78002',
							Core: 'CM4',
							Accelerator: 'cnn'
						},
						FirmwarePlatform: null
					}
				])
			};

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX78002'
			},
			{
				Cores: [cm4Core]
			}
		);

		const supportedBackends = findSupportedAiBackendsForCore(
			multiMatchBackendData,
			{
				...cm4Core,
				Accelerator: 'cnn'
			}
		);

		expect(supportedBackends).to.deep.equal([
			'izer.primary',
			'izer.secondary'
		]);
		expect(supportedBackends).to.have.lengthOf(2);
	});

	it('should return empty array when no backends match', () => {
		const unknownCore: AISupportingCore = {
			Id: 'UNKNOWN',
			Family: 'unknown-family',
			CoreNum: 0,
			Description: 'Unknown Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Unknown',
			Backend: 'unknown-backend'
		};

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'UNKNOWN_SOC'
			},
			{
				Cores: [unknownCore]
			}
		);

		const supportedBackends = findSupportedAiBackendsForCore(
			backendData,
			unknownCore
		);
		expect(supportedBackends).to.have.lengthOf(0);
	});

	it('should correctly filter backends by core family when accelerator is null', () => {
		const sharcfxCore: AISupportingCore = {
			Id: 'SHARC_FX',
			Family: 'sharcfx',
			CoreNum: 0,
			Description: 'SHARC-FX Core',
			IsPrimary: true,
			Memory: [],
			Name: 'SHARC-FX',
			Backend: 'cfsai.tflm'
		};

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX32690'
			},
			{
				Cores: [sharcfxCore]
			}
		);

		// SHARC-FX core without accelerator should match cfsai.tflm
		const supportedBackends = findSupportedAiBackendsForCore(
			backendData,
			sharcfxCore
		);
		expect(supportedBackends).to.deep.equal(['cfsai.tflm']);
	});
});

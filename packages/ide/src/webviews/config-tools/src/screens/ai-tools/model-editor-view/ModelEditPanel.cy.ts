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

import {type AISupportingCore} from '../../../state/slices/ai-tools/aiModel.reducer';
import {initializeConfigDict} from '../../../utils/config';
import {selectBackendForTarget} from './ModelEditPanel';

const backendData = {
	izer: {
		Targets: [
			{
				Hardware: {
					Soc: 'MAX78002',
					Core: 'CM4',
					Accelerator: 'cnn'
				}
			}
		]
	},
	'cfsai.tflm': {
		Targets: [
			{
				Hardware: {
					Arch: 'sharcfx',
					Accelerator: null
				}
			},
			{
				Hardware: {
					Arch: 'cortex-m',
					Accelerator: null
				}
			}
		]
	}
};

const baseCfsConfig = {
	BoardName: 'TestBoard',
	Package: 'WLP',
	Projects: [],
	ClockNodes: [],
	Peripherals: [],
	Cores: [],
	Copyright: '',
	DataModelSchemaVersion: '',
	DataModelVersion: '1.0.0',
	Pins: [],
	Partitions: [],
	Timestamp: ''
};

describe('Backend Selection', () => {
	it('should select the correct backend based on the core and accelerator', () => {
		const cm4Core: AISupportingCore = {
			Id: 'CM4',
			Family: 'cortex-m',
			CoreNum: 0,
			Description: 'Cortex-M4 Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Cortex-M4'
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

		expect(
			selectBackendForTarget(backendData, {
				...cm4Core,
				Accelerator: 'cnn'
			})
		).to.equal('izer');

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX32690'
			},
			{
				Cores: [cm4Core]
			}
		);

		expect(selectBackendForTarget(backendData, cm4Core)).to.equal(
			'cfsai.tflm'
		);
	});
});

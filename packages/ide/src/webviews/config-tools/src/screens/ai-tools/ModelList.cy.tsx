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

import {configurePreloadedStore} from '../../state/store';
import {ModelList} from './ModelList';
import type {Soc} from '@common/types/soc';
import {type AIModel, type CfsConfig} from 'cfs-types';
import type {AiSupportingBackend} from '../../../../common/types/ai-fusion-data-model';
import {mockVsCodeApi} from '../../../../common/api';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const config: CfsConfig = {
	BoardName: 'TestBoard',
	Package: 'WLP',
	Soc: 'MAX32690',
	Copyright: '',
	SchemaVersion: '2.1.0',
	DataModelVersion: '',
	Pins: [],
	ClockNodes: [],
	Timestamp: '',
	Projects: [
		{
			CoreId: 'CM4',
			ExternallyManaged: false,
			ProjectId: 'project1',
			FirmwarePlatform: 'MAX32690',
			Partitions: [],
			Peripherals: [],
			PluginId: 'test-plugin',
			PluginVersion: '1.0.0',
			PlatformConfig: {},
			AIModels: []
		}
	]
};

const configWithModels: CfsConfig = {
	...config,
	Projects: [
		{
			CoreId: 'core1',
			ExternallyManaged: false,
			ProjectId: 'project1',
			FirmwarePlatform: 'MAX32690',
			Partitions: [],
			Peripherals: [],
			PluginId: 'test-plugin',
			PluginVersion: '1.0.0',
			PlatformConfig: {},
			AIModels: [
				{
					Name: 'TestModel',
					Files: {
						ModelFile: 'test-model.onnx'
					},
					Target: {
						Core: 'core1',
						Accelerator: 'cnn'
					},
					Backend: {
						Name: 'SingleModel'
					},
					Enabled: true,
					OutDir: ''
				},
				{
					Name: 'TestModel2',
					Files: {
						ModelFile: 'test-model.onnx'
					},
					Target: {
						Core: 'core1',
						Accelerator: 'cnn'
					},
					Backend: {
						Name: 'SingleModel'
					},
					Enabled: false,
					OutDir: ''
				}
			] satisfies AIModel[]
		},
		{
			CoreId: 'core2',
			ExternallyManaged: false,
			ProjectId: 'project1',
			FirmwarePlatform: 'MAX32690',
			Partitions: [],
			Peripherals: [],
			PluginId: 'test-plugin',
			PluginVersion: '1.0.0',
			PlatformConfig: {},
			AIModels: [
				{
					Name: 'TestModel3',
					Files: {
						ModelFile: 'test-model.onnx'
					},
					Target: {
						Core: 'core2'
					},
					Backend: {
						Name: 'InfiniteModels'
					},
					Enabled: true,
					OutDir: ''
				},
				{
					Name: 'TestModel4',
					Files: {
						ModelFile: 'test-model.onnx'
					},
					Target: {
						Core: 'core2'
					},
					Backend: {
						Name: 'InfiniteModels'
					},
					Enabled: false,
					OutDir: ''
				}
			]
		}
	]
};

const customCoreSoc: Soc = {
	...soc,
	Cores: [
		{
			Id: 'core1',
			Name: 'Core 1',
			Family: 'Cortex-M',
			CoreNum: 0,
			Description: '',
			IsPrimary: false,
			Memory: [],
			Ai: {}
		},
		{
			Id: 'core2',
			Name: 'Core 2',
			Family: 'Cortex-M',
			Description: '',
			CoreNum: 0,
			IsPrimary: false,
			Memory: [],
			Ai: {}
		}
	]
};

const supportedBackends: Record<string, AiSupportingBackend> = {
	InfiniteModels: {
		Targets: [
			{
				Hardware: {Family: 'arch', Accelerator: null}
			}
		],
		Docker: {Size: 1},
		MaxModels: 99,
		AdvancedTools: true
	},
	SingleModel: {
		Targets: [
			{
				Hardware: {Family: 'arch', Accelerator: 'cnn'}
			}
		],
		Docker: {Size: 1},
		MaxModels: 1,
		AdvancedTools: false
	}
};

describe('ModelList', () => {
	before(() => {
		mockVsCodeApi({
			postMessage(message: any) {
				if (message.type === 'get-ai-backends') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: supportedBackends
							}
						})
					);
				}
			},
			getState: cy.stub(),
			setState: cy.stub()
		});
	});

	it('should render the empty component when no AI Models exist', () => {
		const reduxStore = configurePreloadedStore(
			soc,
			config,
			undefined
		);

		cy.mount(<ModelList />, reduxStore);

		cy.dataTest('empty-table-view').should('exist');
	});

	it('should render tables based on targets with AI Models, can only include one for cores with accellerator', () => {
		const reduxStore = configurePreloadedStore(
			customCoreSoc,
			configWithModels,
			undefined
		);

		cy.mount(<ModelList />, reduxStore);

		cy.dataTest('core1.cnn-table').should('exist');
		cy.dataTest('core2.none-table').should('exist');

		// First model is toggled on
		cy.dataTest('include-toggle-TestModel-span')
			.invoke('attr', 'data-checked')
			.should('equal', 'true');
		cy.dataTest('include-toggle-TestModel2-span').click();
		// Second model is toggled on
		cy.dataTest('include-toggle-TestModel2-span')
			.invoke('attr', 'data-checked')
			.should('equal', 'true');
		// First model should be toggled off again
		cy.dataTest('include-toggle-TestModel-span')
			.invoke('attr', 'data-checked')
			.should('equal', 'false');

		cy.dataTest('include-toggle-TestModel4-span').click();
		// In case of table with no accelerator, multiple models can be toggled on
		cy.dataTest('include-toggle-TestModel3-span')
			.invoke('attr', 'data-checked')
			.should('equal', 'true');
		cy.dataTest('include-toggle-TestModel4-span')
			.invoke('attr', 'data-checked')
			.should('equal', 'true');
	});

	it('shows compatibility collumn and reporting icons correctly for advanced tools property', () => {
		const reduxStore = configurePreloadedStore(
			customCoreSoc,
			configWithModels,
			undefined
		);

		cy.mount(<ModelList />, reduxStore);

		cy.dataTest('core1.cnn-table')
			.should('exist')
			.within(() => {
				cy.dataTest('compatibility-column').should('not.exist');
				cy.dataTest('report-action').should('not.exist');
			});

		cy.dataTest('core2.none-table')
			.should('exist')
			.within(() => {
				cy.dataTest('compatibility-column').should('exist');
				cy.dataTest('report-action').should('exist');
			});
	});
});

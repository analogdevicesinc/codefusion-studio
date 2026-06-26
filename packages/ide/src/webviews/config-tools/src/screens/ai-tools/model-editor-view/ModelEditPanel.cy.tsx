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

import type {Soc} from '@common/types/soc';
import type {AiSupportingBackend} from '../../../../../common/types/ai-fusion-data-model';
import {
	loadAIBackends,
	type AISupportingCore
} from '../../../utils/ai-tools';
import {initializeConfigDict} from '../../../utils/config';
import {ModelEditPanel} from './ModelEditPanel';
import {configurePreloadedStore} from '../../../state/store';
import {
	mockVsCodeApi,
	type ConfigOptionsReturn
} from '../../../../../common/api';
import {
	createNewModel,
	saveEditingModel
} from '../../../state/slices/ai-tools/aiModel.reducer';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {findSupportedAiBackendsForCore} from './ai-model-utils';

const soc = (await import('@socs/max78002-csbga.json'))
	.default as unknown as Soc;

const l10n = await import(
	'../../../../../../../l10n/bundle.l10n.en.json'
);

(window as any).__webview_localization_resources__ = l10n;

const backendData: Record<string, AiSupportingBackend> = {
	backend1: {
		Targets: [
			{
				Hardware: {
					Soc: 'MAX78002',
					Core: 'CM4',
					Accelerator: 'cnn'
				}
			}
		],
		AdvancedTools: false,
		Docker: {Size: 1},
		MaxModels: 9999
	},
	backend2: {
		Targets: [
			{
				Hardware: {
					Family: 'sharcfx',
					Accelerator: null
				}
			},
			{
				Hardware: {
					Family: 'cortex-m',
					Accelerator: null
				}
			}
		],
		AdvancedTools: false,
		Docker: {Size: 1},
		MaxModels: 9999
	}
};

const baseCfsConfig = {
	BoardName: 'TestBoard',
	Soc: 'MAX78002',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'CM4',
			ProjectId: 'CM4',
			PluginId: 'com.analog.project.zephyr.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr',
			ExternallyManaged: false,
			PlatformConfig: {},
			Partitions: [],
			Peripherals: []
		}
	],
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

const cfsconfig: ConfigOptionsReturn['configOptions'] = {
	...baseCfsConfig,
	Soc: 'MAX78002'
};

let selectFileResponses: Array<string | undefined> = [];
let selectFileCallCount = 0;

describe('Backend Selection', () => {
	// Mock backend request
	before(() => {
		mockVsCodeApi({
			postMessage(message: any) {
				if (message.type === 'get-ai-backends') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: backendData
							}
						})
					);
				} else if (message.type === 'get-ai-backend-properties') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: [
									{
										Id: 'Symbol',
										Type: 'string',
										Description: 'Symbol for data',
										Tooltip:
											'The C symbol used for the data array and generated files.'
									},
									{
										Id: 'CalibrationSet',
										Type: 'array',
										Description: 'Calibration dataset',
										Tooltip:
											'List of paths to the sample input data used for quantization calibration.'
									},
									{
										Id: 'ValidationSet',
										Type: 'array',
										Description: 'Validation dataset',
										Tooltip:
											'List of paths to the sample input data used for quantization validation.'
									}
								]
							}
						})
					);
				} else if (message.type === 'select-file') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: selectFileResponses[selectFileCallCount++]
							}
						})
					);
				}
			},
			getState: cy.stub(),
			setState: cy.stub()
		});
	});
	it('can create Model', () => {
		const reduxStore = configurePreloadedStore(
			soc,
			cfsconfig,
			undefined
		);
		loadAIBackends().catch(() =>
			cy.contains('Could not load backends').should('not.exist')
		);
		initializeConfigDict(cfsconfig, soc);

		reduxStore.dispatch(createNewModel());
		cy.mount(<ModelEditPanel />, reduxStore);

		// Wait for panel to appear
		cy.dataTest('model-edit-panel').should('exist');

		// Target is auto-selected

		// Enter a model name
		cy.dataTest('model-name-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('Test Model Name');
			});

		// Enter a model file path
		cy.dataTest('model-file-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('/tmp/test-model.tflite');
			});

		// Click save
		cy.dataTest('model-save-button').click();

		cy.wrap({
			get: () => reduxStore.getState().aiModelReducer.aiModels[0]
		})
			.invoke('get')
			.should('exist')
			.then(model => {
				cy.wrap(model).and(
					'have.property',
					'Name',
					'Test Model Name'
				);
				cy.wrap(model).and(
					'have.nested.property',
					'Files.Model',
					'/tmp/test-model.tflite'
				);
				cy.wrap(model).and(
					'have.nested.property',
					'Backend.Name',
					'backend2'
				);
			});
	});

	it('should select the correct backend based on the core and accelerator', () => {
		const cm4Core: AISupportingCore = {
			Id: 'CM4',
			Family: 'cortex-m',
			CoreNum: 0,
			Description: 'Cortex-M4 Core',
			IsPrimary: false,
			Memory: [],
			Name: 'Cortex-M4',
			Backend: 'backend2'
		};

		initializeConfigDict(baseCfsConfig, {
			Cores: [cm4Core]
		});

		expect(
			findSupportedAiBackendsForCore(backendData, {
				...cm4Core,
				Accelerator: 'cnn'
			})
		).to.deep.equal(['backend1']);

		initializeConfigDict(
			{
				...baseCfsConfig,
				Soc: 'MAX32690'
			},
			{
				Cores: [cm4Core]
			}
		);

		expect(
			findSupportedAiBackendsForCore(backendData, cm4Core)
		).to.deep.equal(['backend2']);
	});

	it('shows errors correctly model name, file and symbol', () => {
		const reduxStore = configurePreloadedStore(
			soc,
			cfsconfig,
			undefined
		);
		loadAIBackends().catch(() =>
			cy.contains('Could not load backends').should('not.exist')
		);
		initializeConfigDict(cfsconfig, soc);

		reduxStore.dispatch(
			saveEditingModel({
				model: {
					id: crypto.randomUUID(),
					Name: 'test',
					Enabled: true,
					Files: {},
					Backend: {
						Name: 'backend2'
					},
					Target: {
						Core: 'CM4'
					},
					OutDir: ''
				}
			})
		);

		reduxStore.dispatch(createNewModel());
		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<ModelEditPanel />
			</LocalizationProvider>,
			reduxStore
		);

		cy.dataTest('model-edit-panel').should('exist');

		// Try to save with empty fields
		cy.dataTest('model-save-button').click();
		cy.contains('Model file is required', {matchCase: false}).should(
			'exist'
		);
		cy.contains('Name is required', {matchCase: false}).should(
			'exist'
		);

		// Enter already used model name
		cy.dataTest('model-name-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('test');
			});
		cy.dataTest('model-save-button').click();
		cy.contains('A model with this name already exists', {
			matchCase: false
		}).should('exist');

		// Enter valid model name but leave file empty
		cy.dataTest('model-name-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('validName');
			});
		cy.dataTest('model-file-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear();
			});
		cy.dataTest('model-save-button').click();
		cy.contains('Model file is required', {matchCase: false}).should(
			'exist'
		);
		cy.contains('A model with this name already exists', {
			matchCase: false
		}).should('not.exist');

		// Enter invalid symbol name
		cy.dataTest('model-config-form:control-Symbol-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('$Invalid$Symbol$');
			});
		cy.dataTest('model-save-button').click();
		cy.contains(
			'Enter a valid C identifier. Only letters, numbers and underscores are allowed'
		).should('exist');

		// Enter valid model name and file and symbol, should not show errors
		cy.dataTest('model-name-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('ValidName');
			});
		cy.dataTest('model-file-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('/tmp/model.tflite');
			});
		cy.dataTest('model-config-form:control-Symbol-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('Val1d_Symbol');
			});
		cy.dataTest('model-save-button').click();
		cy.contains('Name is required', {matchCase: false}).should(
			'not.exist'
		);
		cy.contains('Model file is required').should('not.exist');
		cy.contains('A model with this name already exists').should(
			'not.exist'
		);
		cy.contains(
			'Enter a valid C identifier. Only letters, numbers and underscores are allowed'
		).should('not.exist');
	});

	it('can add and remove calibration and validation files', () => {
		const reduxStore = configurePreloadedStore(
			soc,
			cfsconfig,
			undefined
		);
		loadAIBackends().catch(() =>
			cy.contains('Could not load backends').should('not.exist')
		);
		initializeConfigDict(cfsconfig, soc);

		selectFileResponses = [
			'/tmp/calibration1.npy',
			'/tmp/calibration2.npy',
			'/tmp/validation1.npy'
		];
		selectFileCallCount = 0;

		reduxStore.dispatch(createNewModel());
		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<ModelEditPanel />
			</LocalizationProvider>,
			reduxStore
		);

		// Wait for panel to appear
		cy.dataTest('model-edit-panel').should('exist');

		// Verify calibration and validation controls are present with no files initially
		cy.dataTest('calibration-set').should(
			'contain.text',
			'Calibration file(s)'
		);
		cy.dataTest('calibration-set').should(
			'contain.text',
			'No file chosen'
		);
		cy.dataTest('validation-set').should(
			'contain.text',
			'Validation file(s)'
		);
		cy.dataTest('validation-set').should(
			'contain.text',
			'No file chosen'
		);

		// Add two calibration files
		cy.dataTest('calibration-set-browse').click();
		cy.dataTest('calibration-set')
			.contains('calibration1.npy')
			.should('exist');
		cy.dataTest('calibration-set')
			.contains('No file chosen')
			.should('not.exist');

		cy.dataTest('calibration-set-browse').click();
		cy.dataTest('calibration-set')
			.contains('calibration2.npy')
			.should('exist');

		// Add a validation file
		cy.dataTest('validation-set-browse').click();
		cy.dataTest('validation-set')
			.contains('validation1.npy')
			.should('exist');
		cy.dataTest('validation-set')
			.contains('No file chosen')
			.should('not.exist');

		// Remove the first calibration file
		cy.dataTest('calibration-set')
			.contains('calibration1.npy')
			.closest('li')
			.dataTest('calibration-set-remove-0')
			.click();
		cy.dataTest('calibration-set')
			.contains('calibration1.npy')
			.should('not.exist');
		cy.dataTest('calibration-set')
			.contains('calibration2.npy')
			.should('exist');
	});
});

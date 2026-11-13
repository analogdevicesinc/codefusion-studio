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
import {type ConfigOptionsReturn} from '../../../../../common/api';
import {setupMessengerMock} from '../../../../../common/test-utils/messenger-mock';
import {
	getAIBackendPropertiesRequest,
	getSupportedAiBackendsRequest
} from '@constants/messages/ai-tools-messages';
import {
	getPreferenceRequest,
	selectFileRequest
} from '@constants/messages/vscode-api-messages';
import {
	createNewModel,
	editModel,
	saveEditingModel,
	type AIModelWithId
} from '../../../state/slices/ai-tools/aiModel.reducer';
import modelIndex from '../../../../../common/components/cfs-model-zoo/test-fixtures/model_index.json';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {findSupportedAiBackendsForCore} from './ai-model-utils';
import {resetCachedAiBackendControls} from '../../../state/slices/ai-tools/ai-backends';
import type {CfsConfig} from 'cfs-types';
import {logTelemetryRequest} from '@constants/messages/telemetry-messages';
import type {SentMessage} from '../../../state/utils/telemetry-reporter.cy';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from '../../../state/utils/telemetry-reporter';

const soc = {
	Name: 'MAX78002',
	Schema: '1.5.1',
	Parts: [],
	MemoryTypes: [],
	MemoryAliasTypes: [],
	SystemMemory: [],
	Cores: [
		{
			Id: 'CM4',
			Name: 'ARM Cortex-M4',
			Description: 'ARM Cortex-M4',
			CoreNum: 0,
			Family: 'cortex-m',
			Memory: [],
			IsPrimary: true,
			Ai: {}
		}
	],
	Peripherals: [
		{
			Name: 'CNN',
			Description: 'Convolutional Neural Network Accelerator',
			Cores: ['CM4'],
			Ai: {}
		}
	],
	ClockNodes: [],
	Controls: {
		ClockConfig: []
	},
	Registers: [],
	Packages: [
		{
			Name: 'CSBGA',
			Pins: []
		}
	]
} as unknown as Soc;

const l10n =
	await import('../../../../../../../l10n/bundle.l10n.en.json');

(window as any).__webview_localization_resources__ = l10n;

const backendData: Record<string, AiSupportingBackend> = {
	backend1: {
		Targets: [
			{
				Hardware: {
					Soc: 'MAX78002',
					Core: 'CM4',
					Accelerator: 'cnn'
				},
				FirmwarePlatform: null
			}
		],
		AdvancedTools: false,
		MaxModels: 9999,
		Description: '',
		Formats: [],
		Package: '',
		Module: '',
		Name: ''
	},
	backend2: {
		Targets: [
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
		],
		AdvancedTools: false,
		MaxModels: 9999,
		Description: '',
		Formats: [],
		Package: '',
		Module: '',
		Name: ''
	}
};

const baseCfsConfig: CfsConfig = {
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
	SchemaVersion: '2.1.0' as const,
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

type MockBackendProperty = {
	Id: string;
	Type: string;
	Description: string;
	Tooltip: string;
	Pattern?: string;
	Default?: string | number | boolean;
	EnumValues?: Array<{
		Id: string;
		Value: number;
		Description: string;
	}>;
};

const getDefaultBackendProperties = (): MockBackendProperty[] => [
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
];

let backendPropertiesResponse = getDefaultBackendProperties();

const sharedMessageHandlers = {
	[getSupportedAiBackendsRequest.method]: backendData,
	[getAIBackendPropertiesRequest.method]() {
		return backendPropertiesResponse;
	},
	[getPreferenceRequest.method]: [],
	[logTelemetryRequest.method]: undefined
};

describe('ModelEditPanel', () => {
	beforeEach(() => {
		backendPropertiesResponse = getDefaultBackendProperties();
		resetCachedAiBackendControls();
	});

	describe('Backend Selection', () => {
		// Mirrors the real `mot-xnnc` backend (NSS/XNNC MOT toolchain): a `Class`
		// extension with a default value, plus Calibration/Validation/Labels
		// controls that must be filled in before the model can be saved.
		const getMotBackendProperties = (): MockBackendProperty[] => [
			...getDefaultBackendProperties(),
			{
				Id: 'Class',
				Type: 'string',
				Default: 'classification',
				Description: 'Model class type',
				Tooltip: 'Model class type'
			},
			{
				Id: 'Labels',
				Type: 'array',
				Description: 'Inference output values',
				Tooltip: 'Inference output values'
			}
		];

		const getMetricBackendProperties = (
			defaultMetric: string
		): MockBackendProperty[] => [
			...getDefaultBackendProperties(),
			{
				Id: 'MetricName',
				Type: 'enum',
				Default: defaultMetric,
				Description: 'Quantization Metric',
				Tooltip:
					'Metric used to compare candidate quantization configurations',
				EnumValues: [
					{Id: 'auc', Value: 1, Description: 'Area under curve'},
					{
						Id: 'mse',
						Value: 6,
						Description: 'Mean squared error against ground truth'
					}
				]
			}
		];

		let selectFileResponses: Array<string | undefined> = [];
		let selectFileCallCount = 0;

		before(() => {
			setupMessengerMock({
				...sharedMessageHandlers,
				[selectFileRequest.method]() {
					return selectFileResponses[selectFileCallCount++];
				}
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
			cy.contains('Model file is required', {
				matchCase: false
			}).should('exist');
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
			cy.contains(
				'This identifier is already in use by another model',
				{
					matchCase: false
				}
			).should('exist');

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
			cy.contains('Model file is required', {
				matchCase: false
			}).should('exist');
			cy.contains(
				'This identifier is already in use by another model',
				{
					matchCase: false
				}
			).should('not.exist');

			// Enter invalid symbol name
			cy.dataTest('model-config-form:control-Symbol-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('$Invalid$Symbol$');
				});
			cy.dataTest('model-save-button').click();
			cy.contains(
				'Enter a valid C identifier. Only letters, non-leading numbers and underscores are allowed'
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
			cy.contains(
				'This identifier is already in use by another model'
			).should('not.exist');
			cy.contains(
				'Enter a valid C identifier. Only letters, numbers and underscores are allowed'
			).should('not.exist');
		});

		it('rejects model name starting with a digit', () => {
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
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('123model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/model.tflite');
				});

			cy.dataTest('model-save-button').click();
			cy.contains(
				'Enter a valid C identifier. Only letters, non-leading numbers and underscores are allowed'
			).should('exist');
		});

		it('shows identifier collision on Symbol field when symbols collide', () => {
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
						Name: 'existing_model',
						Enabled: true,
						Files: {},
						Backend: {
							Name: 'backend2',
							Extensions: {Symbol: 'my_sym'}
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

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('different_name');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/model.tflite');
				});
			cy.dataTest('model-config-form:control-Symbol-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('my_sym');
				});

			cy.dataTest('model-save-button').click();
			cy.contains(
				'This identifier is already in use by another model'
			).should('exist');
		});

		it('detects name collision via sanitization (spaces become underscores)', () => {
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
						Name: 'My_Model',
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

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('My Model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/model.tflite');
				});

			cy.dataTest('model-save-button').click();
			cy.contains(
				'This identifier is already in use by another model'
			).should('exist');
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

		it('requires calibration dataset, validation dataset and labels for backends with a Class extension', () => {
			backendPropertiesResponse = getMotBackendProperties();

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

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Mot Model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/mot-model.tflite');
				});

			// Try to save without calibration/validation/labels
			cy.dataTest('model-save-button').click();
			cy.dataTest('calibration-set-error').should('exist');
			cy.dataTest('validation-set-error').should('exist');
			cy.dataTest('labels-error').should('exist');
			cy.then(() => {
				expect(
					reduxStore.getState().aiModelReducer.aiModels
				).to.have.length(0);
			});

			// Fill in calibration, validation and labels
			cy.dataTest('calibration-set-browse').click();
			cy.dataTest('validation-set-browse').click();
			// A validation entry must also carry a label or an expected output
			cy.dataTest('validation-label-control-input')
				.first()
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('0');
				});
			cy.dataTest('labels-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('0,1');
				});

			cy.dataTest('model-save-button').click();
			cy.dataTest('calibration-set-error').should('not.exist');
			cy.dataTest('validation-set-error').should('not.exist');
			cy.dataTest('labels-error').should('not.exist');

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.should('exist')
				.then(model => {
					cy.wrap(model)
						.its('Backend.CalibrationData')
						.should('deep.equal', ['/tmp/calibration1.npy']);
					cy.wrap(model)
						.its('Backend.Labels')
						.should('deep.equal', ['0', '1']);
					cy.wrap(model)
						.its('Backend.ValidationData')
						.should('have.length', 1);
				});
		});

		it('does not require calibration, validation or labels for backends without a Class extension', () => {
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
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('No Class Model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/no-class-model.tflite');
				});

			cy.dataTest('model-save-button').click();
			cy.dataTest('calibration-set-error').should('not.exist');
			cy.dataTest('validation-set-error').should('not.exist');

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.should('exist')
				.then(model => {
					cy.wrap(model).and(
						'have.property',
						'Name',
						'No Class Model'
					);
				});
		});

		it('requires a label or expected output per validation entry', () => {
			const reduxStore = configurePreloadedStore(
				soc,
				cfsconfig,
				undefined
			);
			loadAIBackends().catch(() =>
				cy.contains('Could not load backends').should('not.exist')
			);
			initializeConfigDict(cfsconfig, soc);

			selectFileResponses = ['/tmp/validation1.npy'];
			selectFileCallCount = 0;

			reduxStore.dispatch(createNewModel());
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			// The name is left empty so saving always fails and the panel stays open
			cy.dataTest('validation-set-browse').click();
			cy.dataTest('model-save-button').click();
			cy.dataTest('validation-set-error').should(
				'contain.text',
				'either a label or an expected output'
			);

			// Without a metric only the label field is shown
			cy.dataTest('validation-expected-control-input').should(
				'not.exist'
			);
			cy.dataTest('validation-label-control-input')
				.first()
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('0');
				});
			cy.dataTest('model-save-button').click();
			cy.dataTest('validation-set-error').should('not.exist');
		});

		it('rejects validation entries that mix labels and expected outputs', () => {
			const reduxStore = configurePreloadedStore(
				soc,
				cfsconfig,
				undefined
			);
			loadAIBackends().catch(() =>
				cy.contains('Could not load backends').should('not.exist')
			);
			initializeConfigDict(cfsconfig, soc);

			// Mixed entries can only come from an existing config, since the
			// UI shows a single field per entry
			const existingModel: AIModelWithId = {
				id: crypto.randomUUID(),
				Name: 'mixed',
				Enabled: true,
				Files: {Model: '/tmp/mixed.tflite'},
				Backend: {
					Name: 'backend2',
					ValidationData: [
						{input: '/tmp/validation1.npy', label: '0'},
						{input: '/tmp/validation2.npy', expected: '/tmp/ref1.npy'}
					]
				},
				Target: {
					Core: 'CM4'
				},
				OutDir: ''
			};

			reduxStore.dispatch(editModel(existingModel));
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');
			cy.dataTest('model-save-button').click();
			cy.dataTest('validation-set-error').should(
				'contain.text',
				'must use the same field'
			);
		});

		it('saves an expected-only entry as {input, expected}', () => {
			// `mse` compares against expected outputs
			backendPropertiesResponse = getMetricBackendProperties('mse');

			const reduxStore = configurePreloadedStore(
				soc,
				cfsconfig,
				undefined
			);
			loadAIBackends().catch(() =>
				cy.contains('Could not load backends').should('not.exist')
			);
			initializeConfigDict(cfsconfig, soc);

			selectFileResponses = ['/tmp/validation1.npy'];
			selectFileCallCount = 0;

			reduxStore.dispatch(createNewModel());
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Expected Only Model');
				});

			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/test-model.tflite');
				});

			cy.dataTest('validation-set-browse').click();
			cy.dataTest('validation-expected-control-input')
				.first()
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('/tmp/ref1.npy');
				});

			cy.dataTest('model-save-button').click();

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.its('Backend.ValidationData')
				.should('deep.equal', [
					{input: '/tmp/validation1.npy', expected: '/tmp/ref1.npy'}
				]);
		});

		it('shows the validation field matching the metric and drops the other on metric change', () => {
			backendPropertiesResponse = getMetricBackendProperties('auc');

			const reduxStore = configurePreloadedStore(
				soc,
				cfsconfig,
				undefined
			);
			loadAIBackends().catch(() =>
				cy.contains('Could not load backends').should('not.exist')
			);
			initializeConfigDict(cfsconfig, soc);

			selectFileResponses = ['/tmp/validation1.npy'];
			selectFileCallCount = 0;

			reduxStore.dispatch(createNewModel());
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Metric Model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/test-model.tflite');
				});

			// The default `auc` metric compares against labels
			cy.dataTest('validation-set-browse').click();
			cy.dataTest('validation-expected-control-input').should(
				'not.exist'
			);
			cy.dataTest('validation-label-control-input')
				.first()
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('0');
				});

			// `mse` compares against expected outputs, so the label is dropped
			cy.dataTest('model-config-form:control-MetricName').click();
			cy.dataTest('model-config-form:control-MetricName:mse').click();
			cy.dataTest('validation-label-control-input').should(
				'not.exist'
			);
			cy.dataTest('validation-expected-control-input')
				.first()
				.shadow()
				.within(() => {
					cy.get('#control')
						.should('have.value', '')
						.type('/tmp/ref1.npy');
				});

			cy.dataTest('model-save-button').click();

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.its('Backend.ValidationData')
				.should('deep.equal', [
					{input: '/tmp/validation1.npy', expected: '/tmp/ref1.npy'}
				]);
		});

		it('validates Pattern-based dynamic fields from backend properties', () => {
			backendPropertiesResponse = [
				...getDefaultBackendProperties(),
				{
					Id: 'ModelPrefix',
					Type: 'string',
					Pattern: '[A-Za-z_][A-Za-z0-9_]*',
					Description: 'Model prefix',
					Tooltip: 'Prefix used in generated model artifacts.'
				}
			];

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
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Pattern Validation Model');
				});

			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control')
						.clear()
						.type('/tmp/pattern-model.tflite');
				});

			cy.dataTest(
				'model-config-form:control-ModelPrefix-control-input'
			)
				.shadow()
				.within(() => {
					cy.get('#control').clear();
				});

			cy.dataTest('model-save-button').click();
			cy.contains('Field is required').should('exist');

			cy.dataTest(
				'model-config-form:control-ModelPrefix-control-input'
			)
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('123-invalid-prefix');
				});

			cy.dataTest('model-save-button').click();
			cy.contains('Invalid format for field').should('exist');

			cy.dataTest(
				'model-config-form:control-ModelPrefix-control-input'
			)
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Valid_Prefix_1');
				});

			cy.dataTest('model-save-button').click();
			cy.contains('Field is required').should('not.exist');
			cy.contains('Invalid format for field').should('not.exist');
		});
	});

	describe('Telemetry Reporting', () => {
		const ADI_MODEL_ZOO_URL =
			'https://raw.githubusercontent.com/analogdevicesinc/adi-model-zoo/refs/heads/main';
		const CUSTOM_MODEL_ZOO_URL = 'https://models.test/zoo';

		const [zooModel] = modelIndex.models;

		const zooIndex = {
			...modelIndex,
			models: [
				{
					...zooModel,
					supportedPlatforms: [
						{
							...zooModel.supportedPlatforms[0],
							soc: 'MAX78002',
							board: 'TestBoard',
							core: 'CM4'
						}
					]
				}
			]
		};

		let sentMessages: SentMessage[] = [];
		let preferenceResponse: unknown = [];

		function mountPanelAndSelectZooModel(zooUrl: string) {
			preferenceResponse = [zooUrl];
			cy.intercept('GET', `${zooUrl}/model_index.json`, {
				body: zooIndex
			});

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
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-file-control-input')
				.contains('Browse')
				.click();
			cy.dataTest(`model-summary-${zooModel.uniqueId}`)
				.find('h3')
				.click();
			cy.dataTest('model-zoo-use-model').click();

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Zoo Model');
				});

			cy.dataTest('model-save-button').click();

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.should('exist');
		}

		before(() => {
			setupMessengerMock({
				...sharedMessageHandlers,
				[getPreferenceRequest.method]() {
					return preferenceResponse;
				},
				[logTelemetryRequest.method](msg: SentMessage) {
					sentMessages.push(msg);
				}
			});
		});

		beforeEach(() => {
			sentMessages = [];
			preferenceResponse = [];
		});

		it('anonymizes model details when a local model is added', () => {
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

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Local Model');
				});
			cy.dataTest('model-file-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('/tmp/local-model.tflite');
				});

			cy.dataTest('model-save-button').click();

			cy.wrap(sentMessages).should(messages => {
				expect(messages).to.have.length(1);
				expect(messages[0].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.MODEL_ADDED,
					metadata: {
						modelName: 'Custom',
						modelTags: ['Custom'],
						modelSource: 'localModel'
					}
				});
			});
		});

		it('logs model name and tags when an ADI model zoo model is added', () => {
			mountPanelAndSelectZooModel(ADI_MODEL_ZOO_URL);

			cy.wrap(sentMessages).should(messages => {
				expect(messages).to.have.length(1);
				expect(messages[0].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.MODEL_ADDED,
					metadata: {
						modelName: 'DS CNN',
						modelTags: ['Keyword Spotting', 'Audio', 'tensorflow'],
						modelSource: 'modelZooModel'
					}
				});
			});
		});

		it('anonymizes model details when a non-ADI model zoo model is added', () => {
			mountPanelAndSelectZooModel(CUSTOM_MODEL_ZOO_URL);

			cy.wrap(sentMessages).should(messages => {
				expect(messages).to.have.length(1);
				expect(messages[0].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.MODEL_ADDED,
					metadata: {
						modelName: 'Custom',
						modelTags: ['Custom'],
						modelSource: 'modelZooModel'
					}
				});
			});
		});

		it('does not log telemetry when updating an existing model', () => {
			const reduxStore = configurePreloadedStore(
				soc,
				cfsconfig,
				undefined
			);
			loadAIBackends().catch(() =>
				cy.contains('Could not load backends').should('not.exist')
			);
			initializeConfigDict(cfsconfig, soc);

			const existingModel: AIModelWithId = {
				id: crypto.randomUUID(),
				Name: 'existing',
				Enabled: true,
				Files: {Model: '/tmp/existing.tflite'},
				Backend: {
					Name: 'backend2'
				},
				Target: {
					Core: 'CM4'
				},
				OutDir: ''
			};

			reduxStore.dispatch(saveEditingModel({model: existingModel}));
			reduxStore.dispatch(editModel(existingModel));
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');

			cy.dataTest('model-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('renamed');
				});

			cy.dataTest('model-save-button').click();

			cy.wrap({
				get: () => reduxStore.getState().aiModelReducer.aiModels[0]
			})
				.invoke('get')
				.should('have.property', 'Name', 'renamed');
			cy.wrap(sentMessages).should('have.length', 0);
		});

		it('does not log telemetry when model validation fails', () => {
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
			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ModelEditPanel />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest('model-edit-panel').should('exist');
			cy.dataTest('model-save-button').click();
			cy.contains('Name is required', {matchCase: false}).should(
				'exist'
			);
			cy.wrap(sentMessages).should('have.length', 0);
		});
	});
});

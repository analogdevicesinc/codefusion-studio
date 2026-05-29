/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import App from './App';
import {setupMessengerMock} from '../../common/test-utils/messenger-mock';
import type {AIModelCfsWorkspace} from 'cfs-types';

const mockWorkspaceConfig = {
	modelFile: '/path/to/model.tflite',
	sampleData: '/path/to/sample.npy',
	workspaceName: 'my-workspace',
	soc: 'MAX78000',
	board: 'MAX78000EVKIT'
};

const mockWorkspaceConfigWithSocOnly = {
	soc: 'MAX78000'
};

const mockCatalog = [
	{
		id: 'MAX78000',
		name: 'MAX78000',
		family: {
			id: 'MAX78xxx',
			name: 'MAX78xxx'
		},
		boards: [{
			id: 'MAX78000EVKIT',
			name: 'MAX78000EVKIT',
			packageIDs: ['WLP'],
		}],
		packages: ['WLP', 'TQFN'],
		cores: [
			{id: 'cm4', name: 'Cortex-M4', aiSupported: true},
			{id: 'cm5', name: 'Cortex-M5', aiSupported: true},
			{id: 'riscv', name: 'RISC-V', aiSupported: false}
		]
	}
];

const defaultMockCompatibilityResult: Record<
	string,
	boolean | 'error'
> = {
	cm4: true,
	cm5: false
};

const l10n = await import(
	'../../../../l10n/bundle.l10n.en.json'
);

const {validationErrors} = l10n.default['model-wrksp'];

(window as any).__webview_localization_resources__ = l10n.default;

let workspaceConfig: Partial<AIModelCfsWorkspace>
let compatibilityResult: Record<string, boolean | 'error'> =
	defaultMockCompatibilityResult;

describe('ModelWorkspaceCreation', () => {
	before(() => {
		setupMessengerMock({
			// Initial config loaded when the store is hydrated
			getWorkspaceConfig: () => workspaceConfig,
			// SoC catalog loaded by SocSection on mount
			getCatalog: mockCatalog,
			// Called after config hydration and whenever files/SoC change
			runCompatibilityCheck: () => compatibilityResult,
			// Called when the user browses for a file (no-op stub)
			selectFile: undefined
		});
	});

	beforeEach(() => {
		workspaceConfig = {};
		compatibilityResult = defaultMockCompatibilityResult;
	});

	it('should render the empty form', () => {
		workspaceConfig = {}

		cy.mount(<App />);

		cy.dataTest('model-file-control-input').should('exist');
		cy.dataTest('model-file-control-input').should('have.value', '');
		cy.dataTest('sample-data-control-input').should('exist');
		cy.dataTest('sample-data-control-input').should('have.value', '');
		cy.dataTest('workspace-name-control-input').should('exist');
		cy.dataTest('workspace-name-control-input').should(
			'have.value',
			''
		);
		cy.dataTest('searchable-grouped-selection:container').should(
			'exist'
		);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('searchable-grouped-selection:option:MAX78000').should(
			'exist'
		);
		cy.dataTest('searchable-grouped-selection:option:MAX78000').click();

		cy.dataTest('select-soc-board-select').should('exist');

		cy.get('[class*="selectedContent"]')
			.should('contain.text', 'Cortex-M4')
			.and('contain.text', 'Cortex-M5')
			.and('contain.text', 'RISC-V')
			.and('contains.text', 'Unsupported');

	});

	it('should show compatibility results for cores after selection', () => {
		cy.mount(<App />);

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).click();

		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).should('contain.text', 'Compatible');
	});

	it('should show incompatible state in soc header after selection', () => {
		compatibilityResult = {
			cm4: false,
			cm5: false
		};

		cy.mount(<App />);

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).click();

		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).should('contain.text', 'Incompatible');
	});

	it('should show incompatible state when all core compatibility checks return error', () => {
		compatibilityResult = {
			cm4: 'error',
			cm5: 'error'
		};

		cy.mount(<App />);

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).click();

		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).should('contain.text', 'Incompatible');
	});

	it('should apply an existing workspace config', () => {
		workspaceConfig = mockWorkspaceConfig;

		cy.mount(<App />);

		cy.dataTest('model-file-control-input').should(
			'have.value',
			mockWorkspaceConfig.modelFile
		);
		cy.dataTest('sample-data-control-input').should(
			'have.value',
			mockWorkspaceConfig.sampleData
		);
		cy.dataTest('workspace-name-control-input').should(
			'have.value',
			mockWorkspaceConfig.workspaceName
		);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('select-soc-board-select').should(
			'have.value',
			mockWorkspaceConfig.board
		);

	});

	it('should show and clear validation errors after filling required fields and validating again', () => {
		workspaceConfig = mockWorkspaceConfigWithSocOnly;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('model-file-error').should(
			'contain.text',
			validationErrors.pleaseSelectFile
		);
		cy.dataTest('select-soc-board-select-error').should(
			'contain.text',
			validationErrors.selectBoardRequired
		);

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');
		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('model-file-error').should('not.exist');
		cy.dataTest('select-soc-board-select-error').should(
			'not.exist',
		);
	});

});


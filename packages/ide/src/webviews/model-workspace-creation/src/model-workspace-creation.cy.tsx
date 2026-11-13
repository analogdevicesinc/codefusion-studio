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
import {
	NO_RESPONSE,
	sendMockErrorResponse,
	setupMessengerMock
} from '../../common/test-utils/messenger-mock';
import type {AIModelCfsWorkspace} from 'cfs-types';
import {getPreferenceRequest} from '@constants/messages/vscode-api-messages';

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
		boards: [
			{
				id: 'MAX78000EVKIT',
				name: 'MAX78000EVKIT',
				packageIDs: ['WLP']
			},
			{
				id: 'MAX32690EVKIT',
				name: 'MAX32690EVKIT',
				packageIDs: ['WLP']
			}
		],
		packages: ['WLP', 'TQFN'],
		cores: [
			{
				// Catalog ids intentionally differ from the data model ids
				id: 'catalog-cm4',
				name: 'Cortex-M4',
				aiSupported: true,
				dataModelCoreID: 'cm4'
			},
			{
				id: 'catalog-cm5',
				name: 'Cortex-M5',
				aiSupported: true,
				dataModelCoreID: 'cm5'
			},
			{
				id: 'catalog-riscv',
				name: 'RISC-V',
				aiSupported: false,
				dataModelCoreID: 'riscv'
			}
		]
	},
	{
		id: 'MAX78001',
		name: 'MAX78001',
		family: {
			id: 'MAX78xxx',
			name: 'MAX78xxx'
		},
		boards: [
			{
				id: 'MAX78001EVKIT',
				name: 'MAX78001EVKIT',
				packageIDs: ['WLP']
			}
		],
		packages: ['WLP'],
		cores: [
			{
				id: 'cm4',
				name: 'Cortex-M4',
				aiSupported: true,
				dataModelCoreID: 'cm4'
			}
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

const l10n = await import('../../../../l10n/bundle.l10n.en.json');

const {validationErrors, compatibilityWarning, socSection} =
	l10n.default['model-wrksp'];

(window as any).__webview_localization_resources__ = l10n.default;

let workspaceConfig: Partial<AIModelCfsWorkspace>;
let compatibilityResult: Record<string, boolean | 'error'> =
	defaultMockCompatibilityResult;
let generateWorkspaceCalls: Array<
	Partial<AIModelCfsWorkspace> | undefined
> = [];
// The last generateWorkspace request, left pending so tests can settle it.
let pendingGenerateWorkspaceRequest: unknown;

describe('ModelWorkspaceCreation', () => {
	before(() => {
		setupMessengerMock({
			// Initial config loaded when the store is hydrated
			getWorkspaceConfig: () => workspaceConfig,
			// SoC catalog loaded by SocSection on mount
			getCatalog: mockCatalog,
			// Called after config hydration and whenever files/SoC change
			runCompatibilityCheck: () => compatibilityResult,
			// Workspace and AI code generation, kept pending until settled
			generateWorkspace(message: {
				params?: Partial<AIModelCfsWorkspace>;
			}) {
				generateWorkspaceCalls.push(message.params);
				pendingGenerateWorkspaceRequest = message;

				return NO_RESPONSE;
			},
			// Called when the user browses for a file (no-op stub)
			selectFile: undefined,
			// Persisted on every relevant state change (no-op stub)
			updateWorkspaceConfig: undefined,
			[getPreferenceRequest.method]: []
		});
	});

	beforeEach(() => {
		workspaceConfig = {};
		compatibilityResult = defaultMockCompatibilityResult;
		generateWorkspaceCalls = [];
		pendingGenerateWorkspaceRequest = undefined;
	});

	it('should render the empty form', () => {
		workspaceConfig = {};

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

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).should('exist');
		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).click();

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

	it('should show error state when all core compatibility checks return error', () => {
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
		).should('contain.text', socSection.compatibilityTestError);
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

	it('should generate the workspace with the data model id of the selected core', () => {
		workspaceConfig = mockWorkspaceConfig;
		compatibilityResult = {cm4: true, cm5: true};

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.click({force: true});

		cy.dataTest('create-workspace-button').click();

		cy.wrap(generateWorkspaceCalls).should('deep.equal', [
			{coreId: 'cm5'}
		]);
	});

	it('should restore the persisted core and generate the workspace with it', () => {
		workspaceConfig = {...mockWorkspaceConfig, coreId: 'cm5'};
		compatibilityResult = {cm4: true, cm5: true};

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('not.be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('be.checked');

		cy.dataTest('create-workspace-button').click();

		cy.wrap(generateWorkspaceCalls).should('deep.equal', [
			{coreId: 'cm5'}
		]);
	});

	it('should replace a restored core that is incompatible with the model', () => {
		workspaceConfig = {...mockWorkspaceConfig, coreId: 'cm5'};
		compatibilityResult = {cm4: true, cm5: false};

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('not.be.checked');

		cy.dataTest('create-workspace-button').click();

		cy.wrap(generateWorkspaceCalls).should('deep.equal', [
			{coreId: 'cm4'}
		]);
	});

	it('should auto-select the board when the SoC has only one board option', () => {
		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78001'
		).click();

		cy.dataTest('select-soc-board-select').should(
			'have.value',
			'MAX78001EVKIT'
		);
	});

	it('should auto-select the first AI-supported core when no compatibility check has run', () => {
		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest(
			'searchable-grouped-selection:option:MAX78000'
		).click();

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('not.be.checked');
	});

	it('should auto-select the first compatible AI-supported core after compatibility check', () => {
		compatibilityResult = {cm4: true, cm5: false};

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

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('not.be.checked');
	});

	it('should auto-select the second compatible core when the first is incompatible', () => {
		compatibilityResult = {cm4: false, cm5: true};

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

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('not.be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('be.checked');
	});

	it('should fall back to the first AI-supported core when no compatible cores exist', () => {
		compatibilityResult = {cm4: false, cm5: false};

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

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');
		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(1)
			.should('not.be.checked');
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
		cy.dataTest('select-soc-board-select-error').should('not.exist');
	});

	it('should reject a workspace name containing a space', () => {
		workspaceConfig = mockWorkspaceConfigWithSocOnly;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');
		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest('workspace-name-control-input')
			.shadow()
			.find('input')
			.type('My Workspace');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('workspace-name-error').should(
			'contain.text',
			validationErrors.invalidFilenameCharacters
		);
	});

	it('should reject a workspace name containing a special character', () => {
		workspaceConfig = mockWorkspaceConfigWithSocOnly;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');
		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest('workspace-name-control-input')
			.shadow()
			.find('input')
			.type('Workspace!');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('workspace-name-error').should(
			'contain.text',
			validationErrors.invalidFilenameCharacters
		);
	});

	it('should clear the workspace name error once corrected to a valid name', () => {
		workspaceConfig = mockWorkspaceConfigWithSocOnly;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');
		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest('workspace-name-control-input')
			.shadow()
			.find('input')
			.type('My Workspace!');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('workspace-name-error').should(
			'contain.text',
			validationErrors.invalidFilenameCharacters
		);

		cy.dataTest('workspace-name-control-input')
			.shadow()
			.find('input')
			.clear()
			.type('My_Workspace-1');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('workspace-name-error').should('not.exist');
	});

	it('should reject a workspace name consisting only of spaces', () => {
		workspaceConfig = mockWorkspaceConfigWithSocOnly;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.dataTest('model-file-control-input')
			.shadow()
			.find('input')
			.type('/new/model.tflite');
		cy.dataTest('select-soc-board-select').click();
		cy.dataTest('select-soc-board-select')
			.find('> vscode-option')
			.contains('MAX78000EVKIT')
			.click();

		cy.dataTest('workspace-name-control-input')
			.shadow()
			.find('input')
			.type('   ');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('workspace-name-error').should(
			'contain.text',
			validationErrors.invalidFilenameCharacters
		);
	});

	it('should stay busy while the workspace is generated and recover when generation fails', () => {
		workspaceConfig = mockWorkspaceConfig;

		cy.mount(<App />);

		cy.dataTest(
			'searchable-grouped-selection:segmented-controls:expand'
		).click();

		cy.get('[class*="selectedContent"]')
			.find('input[type="checkbox"]')
			.eq(0)
			.should('be.checked');

		cy.dataTest('create-workspace-button').click();

		cy.dataTest('create-workspace-button')
			.should('have.attr', 'disabled')
			.and(
				'contain.text',
				l10n.default['model-wrksp'].footer.creating
			);

		cy.wrap(null).should(() => {
			expect(pendingGenerateWorkspaceRequest).to.not.equal(undefined);
		});

		cy.then(() => {
			sendMockErrorResponse(
				pendingGenerateWorkspaceRequest,
				'Code generation failed'
			);
		});

		cy.dataTest('create-workspace-button')
			.should('not.have.attr', 'disabled')
			.and('contain.text', l10n.default['model-wrksp'].footer.create);
	});

	describe('compatibility warning', () => {
		const fillFormAndCreate = (expectedCoreBadge: string) => {
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

			// Per-core badges only render once the compatibility check finished
			cy.get('[class*="selectedContent"]').should(
				'contain.text',
				expectedCoreBadge
			);

			cy.dataTest('create-workspace-button').click();
		};

		it('should create the workspace without a warning when the selected core is compatible', () => {
			compatibilityResult = {cm4: true, cm5: false};

			fillFormAndCreate(socSection.compatible);

			cy.contains(compatibilityWarning.title).should(
				'not.be.visible'
			);
			cy.wrap(null).should(() => {
				expect(generateWorkspaceCalls).to.have.length(1);
			});
		});

		it('should warn when the selected core is incompatible and not create on cancel', () => {
			compatibilityResult = {cm4: false, cm5: false};

			fillFormAndCreate(socSection.incompatible);

			cy.contains(compatibilityWarning.title).should('be.visible');
			cy.contains(compatibilityWarning.incompatible).should(
				'be.visible'
			);

			cy.contains(compatibilityWarning.cancel).click();

			cy.contains(compatibilityWarning.title).should(
				'not.be.visible'
			);
			cy.wrap(null).should(() => {
				expect(generateWorkspaceCalls).to.have.length(0);
			});
		});

		it('should create the workspace when the user confirms the incompatibility warning', () => {
			compatibilityResult = {cm4: false, cm5: false};

			fillFormAndCreate(socSection.incompatible);

			cy.contains(compatibilityWarning.confirm).click();

			cy.contains(compatibilityWarning.title).should(
				'not.be.visible'
			);
			cy.wrap(null).should(() => {
				expect(generateWorkspaceCalls).to.have.length(1);
			});
		});

		it('should warn when the compatibility check failed for the selected core', () => {
			compatibilityResult = {cm4: 'error', cm5: 'error'};

			fillFormAndCreate(socSection.error);

			cy.contains(compatibilityWarning.error).should('be.visible');
			cy.contains(compatibilityWarning.confirm).click();

			cy.wrap(null).should(() => {
				expect(generateWorkspaceCalls).to.have.length(1);
			});
		});
	});
});

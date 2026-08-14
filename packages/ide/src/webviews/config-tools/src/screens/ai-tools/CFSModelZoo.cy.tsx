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

import {CfsModelZoo} from '../../../../common/components/cfs-model-zoo/CfsModelZoo';
import modelIndex from '../../../../common/components/cfs-model-zoo/test-fixtures/model_index.json';

const l10n = (
	await import('../../../../../../l10n/bundle.l10n.en.json')
).default;

(window as any).__webview_localization_resources__ = l10n;

const MODEL_ZOO_URL = 'https://models.test/zoo';
const MODEL_INDEX_ENDPOINT = `${MODEL_ZOO_URL}/model_index.json`;

const baseModel = modelIndex.models[0];

const secondModel = {
	...baseModel,
	uniqueId: 'second-model-uuid',
	name: 'Second Model',
	displayName: 'Second Model',
	supportedPlatforms: [
		{
			soc: 'MAX78000',
			board: 'EvKit_V1',
			family: 'Cortex-M',
			core: 'CM4',
			modelPaths: {
				int8: 'second_model/int8.tflite'
			},
			sizeInKb: {
				int8: 12.3
			},
			compilation: {
				hardwareParameters: [],
				optimization: {values: ['-O0'], default: '-O0'},
				quantization: {values: ['int8'], default: 'int8'}
			}
		}
	]
};

function buildIndex(models: unknown[]) {
	return {...modelIndex, models};
}

const twoModelIndex = buildIndex([baseModel, secondModel]);

type MountOverrides = Readonly<{
	getPreference?: () => Promise<unknown>;
	selectFile?: () => Promise<string | undefined>;
	defaultSocFilter?: string[];
	defaultCoreFilter?: string[];
}>;

function mountZoo(overrides: MountOverrides = {}) {
	const onClose = cy.stub().as('onClose');
	const onModelSelected = cy.stub().as('onModelSelected');
	const onLocalFileSelected = cy.stub().as('onLocalFileSelected');
	const getPreference =
		overrides.getPreference ?? cy.stub().resolves([MODEL_ZOO_URL]);
	const selectFile =
		overrides.selectFile ?? cy.stub().resolves(undefined);

	cy.mount(
		<CfsModelZoo
			isOpen
			defaultSocFilter={overrides.defaultSocFilter}
			defaultCoreFilter={overrides.defaultCoreFilter}
			getPreference={getPreference}
			selectFile={selectFile}
			onClose={onClose}
			onModelSelected={onModelSelected}
			onLocalFileSelected={onLocalFileSelected}
		/>
	);

	return {onClose, onModelSelected, onLocalFileSelected};
}

describe('CfsModelZoo', () => {
	it('should render the component', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		mountZoo();
		cy.dataTest('cfs-model-zoo').should('exist');
	});

	it('shows a loading state until the model index resolves', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {
			body: modelIndex,
			delay: 500
		}).as('modelIndex');

		mountZoo();

		cy.dataTest('model-zoo-loading').should('exist');
		cy.wait('@modelIndex');
		cy.dataTest('model-zoo-loading').should('not.exist');
		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);
	});

	it('renders models returned by the model index', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		mountZoo();

		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);
		cy.contains(baseModel.displayName).should('exist');
	});

	it('expands a card to reveal model details and collapses again', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		mountZoo();

		const [platform] = baseModel.supportedPlatforms;

		cy.contains(baseModel.description).should('not.exist');

		cy.dataTest(
			`model-summary-${baseModel.uniqueId}:endSlot:icon`
		).click();

		cy.contains(baseModel.description).should('exist');
		cy.contains(baseModel.license).should('exist');
		cy.contains(baseModel.accuracy.dataset).should('exist');
		cy.contains(
			`${platform.board} (${platform.soc}/${platform.core})`
		).should('exist');

		cy.dataTest(
			`model-summary-${baseModel.uniqueId}:endSlot:icon`
		).click();
		cy.contains(baseModel.description).should('not.exist');
	});

	it('shows an empty state when no model zoo sources are configured', () => {
		mountZoo({getPreference: async () => undefined});

		cy.dataTest('model-zoo-empty').should('exist');
	});

	it('shows an empty state when the model index fetch fails', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {statusCode: 500});

		mountZoo();

		cy.dataTest('model-zoo-empty').should('exist');
	});

	it('filters models by search query and restores them on clear', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		mountZoo();

		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);

		cy.dataTest('model-zoo-search-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('keyword');
			});
		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);

		cy.dataTest('model-zoo-search-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('no-such-model-xyz');
			});
		cy.dataTest('model-zoo-empty').should('exist');

		cy.dataTest('model-zoo-search-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear();
			});
		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);
	});

	it('filters models by selected SoC', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: twoModelIndex});

		mountZoo();

		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'exist'
		);
		cy.dataTest(`model-summary-${secondModel.uniqueId}`).should(
			'exist'
		);

		cy.dataTest('model-zoo-soc-filter').find('button').click();
		cy.dataTest('multiselect-option-MAX78000').click();

		cy.dataTest(`model-summary-${secondModel.uniqueId}`).should(
			'exist'
		);
		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'not.exist'
		);
	});

	it('disables core options unavailable for the selected SoC filter', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: twoModelIndex});

		mountZoo();

		cy.dataTest('model-zoo-soc-filter').find('button').click();
		cy.dataTest('multiselect-option-MAX78000').click();

		cy.dataTest('model-zoo-core-filter').find('button').click();
		cy.dataTest('multiselect-option-FX')
			.parent()
			.should('have.attr', 'disabled');
	});

	it('shows an error banner when clicking the use-model button without a model selected', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		const {onClose, onModelSelected} = mountZoo();

		// Error should not be shown initially
		cy.dataTest('cfs-model-zoo')
			.contains(l10n['model-zoo'].noModelSelectedError)
			.should('not.exist');

		// Click the button without selecting a model
		cy.dataTest('model-zoo-use-model').click();

		// Error message should appear
		cy.dataTest('cfs-model-zoo')
			.contains(l10n['model-zoo'].noModelSelectedError)
			.should('exist');

		// Callbacks should not have been called
		cy.wrap(onModelSelected).should('not.have.been.called');
		cy.wrap(onClose).should('not.have.been.called');
	});

	it('uses the selected model when clicking the use-model button after selection', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		const {onClose, onModelSelected} = mountZoo();

		// Click the title rather than the card's default center point: the
		// center can land in the card's end slot (badges/dropdown), which
		// stops click propagation so it doesn't also toggle selection.
		cy.dataTest(`model-summary-${baseModel.uniqueId}`)
			.find('h3')
			.click();

		// Error should not be shown when a model is selected
		cy.dataTest('cfs-model-zoo')
			.contains(l10n['model-zoo'].noModelSelectedError)
			.should('not.exist');

		cy.dataTest('model-zoo-use-model').click();

		cy.wrap(onModelSelected).should('have.been.calledOnce');
		cy.wrap(onModelSelected).should(stub => {
			const arg = stub.firstCall.args[0];
			expect(arg.model.uniqueId).to.equal(baseModel.uniqueId);
			expect(arg.quantization).to.equal('int8');
		});
		cy.wrap(onClose).should('have.been.calledOnce');
	});

	it('uses the quantization chosen via the dropdown when selecting a model', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		const {onModelSelected} = mountZoo();

		cy.dataTest(`quantization-${baseModel.uniqueId}`).click();
		cy.dataTest(`quantization-${baseModel.uniqueId}`)
			.find('> vscode-option')
			.contains('int16')
			.click();

		cy.dataTest('model-zoo-use-model').click();

		cy.wrap(onModelSelected).should(stub => {
			const arg = stub.firstCall.args[0];
			expect(arg.quantization).to.equal('int16');
		});
	});

	it('calls onLocalFileSelected and onClose when a local file is chosen', () => {
		const {onClose, onLocalFileSelected} = mountZoo({
			selectFile: async () => '/workspace/model.tflite'
		});

		cy.dataTest('model-zoo-browse-local').click();

		cy.wrap(onLocalFileSelected).should(
			'have.been.calledWith',
			'/workspace/model.tflite'
		);
		cy.wrap(onClose).should('have.been.calledOnce');
	});

	it('does not call onLocalFileSelected when file selection is cancelled', () => {
		const {onClose, onLocalFileSelected} = mountZoo({
			selectFile: async () => undefined
		});

		cy.dataTest('model-zoo-browse-local').click();

		cy.wrap(onLocalFileSelected).should('not.have.been.called');
		cy.wrap(onClose).should('not.have.been.called');
	});

	it('calls onClose when the close button is clicked', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: modelIndex});

		const {onClose} = mountZoo();

		cy.dataTest('model-zoo-close').click();

		cy.wrap(onClose).should('have.been.calledOnce');
	});

	it('applies default SoC and core filters on open', () => {
		cy.intercept('GET', MODEL_INDEX_ENDPOINT, {body: twoModelIndex});

		mountZoo({
			defaultSocFilter: ['MAX78000'],
			defaultCoreFilter: ['CM4']
		});

		cy.dataTest(`model-summary-${secondModel.uniqueId}`).should(
			'exist'
		);
		cy.dataTest(`model-summary-${baseModel.uniqueId}`).should(
			'not.exist'
		);
	});
});

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
import {type CfsConfig} from 'cfs-types';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {formatSocCoreMemoryBlocks} from '../../../../utils/json-formatter';
import {Connections} from '../connections';
import {
	resetSruConnection,
	selectSruOutput,
	setSruConnection,
	setSignalAlias,
	setSignalInversion,
	setUserDescription
} from '../../../../state/slices/sru/sru.reducer';
import {
	getSruDefaultConnections,
	getSruOutputSignals,
	getSruSelectableInputs,
	getSruSelectableOutputs,
	getSruSignal,
	getSruSignalPeripheral,
	supportsSruInversion
} from '../../../../utils/sru';
import l10n from '../../../../../../../../l10n/bundle.l10n.en.json';

const adsp = formatSocCoreMemoryBlocks(
	(await import('@socs/adsp-21835w-bga_ed.json'))
		.default as unknown as Soc
);

(window as any).__webview_localization_resources__ = l10n;

const adspConfig = {
	BoardName: 'EV-SOMCRR-EZKIT',
	Package: 'BGA_ED',
	Soc: 'ADSP-SC835W',
	Projects: [
		{
			ExternallyManaged: false,
			FirmwarePlatform: 'SHARC-FX',
			CoreId: 'FX',
			ProjectId: 'FX',
			PluginId: '',
			PluginVersion: ''
		}
	]
} as unknown as CfsConfig;

// ASRC0's signals contain "SRC0" — its item in the navigation is "SRC 0".
// ASRC0 has no Peripheral.Group but does have an SRU subgroup, so it's
// wrapped in its own "ASRC0" accordion, which must be expanded first.
const ASRC0_SIGNAL_GROUP = 'SRC 0';
const INPUT_SIGNAL = 'SRC0_CLK_IP_I';
const OUTPUT_SIGNAL = 'SRC0_DAT_OP_O';
const ALIAS_INFO_TOOLTIP =
	'Aliases make signals easier to identify without changing the hardware signal name.';

/**
 * Configures a store for the fixture SoC. Doing this also populates the SRU
 * module caches, so it must run before any `getSru*` helper is called.
 */
function createStore() {
	return configurePreloadedStore(adsp, adspConfig);
}

function mountConnections(store = createStore()) {
	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<Connections />
		</LocalizationProvider>,
		store
	);

	return store;
}

function expandAsrc0GroupIfNeeded() {
	cy.dataTest('sru-peripheral-navigation').then($nav => {
		if (
			$nav.find(
				`[data-test="sru-peripheral-item:${ASRC0_SIGNAL_GROUP}"]`
			).length === 0
		) {
			cy.dataTest('accordion:ASRC0')
				.children('section')
				.first()
				.click();
		}
	});
}

function selectAsrc0SignalGroup() {
	expandAsrc0GroupIfNeeded();
	cy.dataTest(`sru-peripheral-item:${ASRC0_SIGNAL_GROUP}`).click();
}

function openInputConnectionDetails(signalName = INPUT_SIGNAL) {
	selectAsrc0SignalGroup();
	cy.dataTest(`signal-card:${signalName}:edit-button`).click();
}

function openOutputConnectionDetails(signalName = OUTPUT_SIGNAL) {
	selectAsrc0SignalGroup();
	cy.dataTest(`signal-card:${signalName}:edit-button`).click();
}

/** Collapses the input multi-select so it stops overlaying the selected list. */
function closeInputDropdown() {
	cy.dataTest('connection-details-input-multiselect').click();
}

/** An output `INPUT_SIGNAL` can be routed to that is not its default source. */
function findAlternateOutput() {
	const defaultSource = getSruDefaultConnections()[INPUT_SIGNAL];
	const alternate = getSruSelectableOutputs(INPUT_SIGNAL).find(
		name => name !== defaultSource
	);

	if (!alternate) {
		throw new Error(
			`Fixture offers no alternative output for ${INPUT_SIGNAL}`
		);
	}

	return alternate;
}

/** An output `inputName` can be routed to that is not its default or `excludeOutput`. */
function findAlternateOutputForInput(
	inputName: string,
	excludeOutput?: string
) {
	const defaultSource = getSruDefaultConnections()[inputName];
	const alternate = getSruSelectableOutputs(inputName).find(
		name =>
			name !== defaultSource &&
			(excludeOutput === undefined || name !== excludeOutput)
	);

	if (!alternate) {
		throw new Error(
			`Fixture offers no alternative output for ${inputName}`
		);
	}

	return alternate;
}

/** Stages an input on the open output connection details panel. */
function stageInputInOutputPanel(searchTerm: string) {
	const inputName = findSelectableInput(searchTerm);

	cy.dataTest('connection-details-input-multiselect').click();
	cy.dataTest('connection-details-input-multiselect-search').type(
		searchTerm
	);
	cy.dataTest(`multiselect-option-${inputName}`).click();

	return inputName;
}

/**
 * First input routable from `OUTPUT_SIGNAL` whose name contains `searchTerm`.
 * The multi-select filters its options in order, so this is also the first
 * option rendered once `searchTerm` is typed into its search box.
 */
function findSelectableInput(searchTerm: string) {
	const inputName = getSruSelectableInputs(OUTPUT_SIGNAL).find(name =>
		name.includes(searchTerm)
	);

	if (!inputName) {
		throw new Error(
			`Fixture offers no input matching "${searchTerm}" for ${OUTPUT_SIGNAL}`
		);
	}

	return inputName;
}

/**
 * Finds an input/output pair the SoC connects by default, so tests that just
 * need *some* pre-existing default connection (to seed a selected-input row,
 * for example) don't depend on a hardcoded signal name. The pair's output may
 * or may not be `LOW` - tests specifically about the lock/disable behavior
 * should use {@link findLowDefaultPair} or {@link findNonLowDefaultPair}
 * instead, since that behavior now differs between the two.
 */
function findDefaultConnectedPair() {
	const outputSignals = getSruOutputSignals();
	const pair = Object.entries(getSruDefaultConnections()).find(
		([, source]) => source in outputSignals
	);

	if (!pair) {
		throw new Error(
			'Fixture has no default connection to a real SRU output signal'
		);
	}

	return {inputName: pair[0], outputName: pair[1]};
}

/**
 * Finds an input/output pair whose SoC default routes to the constant `LOW`
 * signal - the one case where a default connection's option/delete control
 * stays disabled, since there's nothing left to disconnect.
 */
function findLowDefaultPair() {
	const pair = Object.entries(getSruDefaultConnections()).find(
		([, source]) => source === 'LOW'
	);

	if (!pair) {
		throw new Error(
			'Fixture has no default connection routed to LOW'
		);
	}

	return {inputName: pair[0], outputName: pair[1]};
}

/**
 * Finds an input/output pair the SoC connects by default to a real, non-LOW
 * output signal - the common case where removing the default connection
 * should now be allowed, disconnecting the input to LOW.
 */
function findNonLowDefaultPair() {
	const outputSignals = getSruOutputSignals();
	const pair = Object.entries(getSruDefaultConnections()).find(
		([, source]) => source !== 'LOW' && source in outputSignals
	);

	if (!pair) {
		throw new Error(
			'Fixture has no default connection to a real, non-LOW SRU output signal'
		);
	}

	return {inputName: pair[0], outputName: pair[1]};
}

/**
 * Finds a default input/output pair whose input supports polarity inversion,
 * with the default routed to `LOW` or to a real, non-LOW output signal
 * depending on `routedToLow`.
 */
function findInvertibleDefaultPair(routedToLow: boolean) {
	const outputSignals = getSruOutputSignals();
	const pair = Object.entries(getSruDefaultConnections()).find(
		([input, source]) =>
			supportsSruInversion(input) &&
			source in outputSignals &&
			(source === 'LOW') === routedToLow
	);

	if (!pair) {
		throw new Error(
			`Fixture has no invertible input with a default routed ${
				routedToLow ? 'to LOW' : 'to a non-LOW output signal'
			}`
		);
	}

	return {inputName: pair[0], outputName: pair[1]};
}

function getAliasInput() {
	return cy
		.dataTest('connection-details-alias-control-input')
		.shadow()
		.find('input');
}

/**
 * Hovers the alias info icon and asserts its tooltip appears. The tooltip is
 * portalled onto `document.body` with `pointer-events: none`, so Cypress' hit
 * test never resolves to it - it can only be asserted to exist, not to be
 * visible.
 */
function assertAliasInfoTooltip() {
	cy.dataTest('connection-details-alias-info')
		.trigger('mouseover')
		.trigger('mousemove')
		.trigger('mouseenter');
	cy.contains(ALIAS_INFO_TOOLTIP).should('exist');
}

/** The SoC-provided description for a signal in the fixture data model. */
function getSocDescription(signalName: string) {
	const description = getSruSignal(signalName)?.Description;

	if (!description) {
		throw new Error(
			`Fixture signal ${signalName} has no SoC description`
		);
	}

	return description;
}

/**
 * DAI0's polarity-invertible input with no `PeripheralSubGroup`
 * (`DAI0_MISCA4_I` in the fixture). Every `DAI0_PBxx` signal's subgroup is
 * classified as a pin-buffer group by `groupSruSignals` (see
 * `utils/sru-navigation.ts`) and rendered under its own accordion, but
 * DAI0's remaining ungrouped signals fold into a single flat top-level
 * entry named after the peripheral - so this one is reachable without
 * expanding an accordion first, unlike `DAI0_PB19_I`/`DAI0_PB20_I`.
 */
const POLARITY_INPUT_SIGNAL = 'DAI0_MISCA4_I';
const POLARITY_PERIPHERAL_ITEM = 'DAI0';

function selectDai0Group() {
	cy.dataTest(
		`sru-peripheral-item:${POLARITY_PERIPHERAL_ITEM}`
	).click();
}

function openPolarityInputDetails(
	signalName = POLARITY_INPUT_SIGNAL
) {
	selectDai0Group();
	cy.dataTest(`signal-card:${signalName}:edit-button`).click();
}

beforeEach(() => {
	cy.viewport(1920, 1080);
});

describe('ConnectionDetailsPanel', () => {
	describe('input mode', () => {
		it('shows a searchable output select with the effective source', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('signal-routing-unit-connection-details').contains(
				'Output Signal'
			);
			cy.dataTest('connection-details-output-select').should('exist');

			const defaultSource = getSruDefaultConnections()[INPUT_SIGNAL];

			cy.dataTest('connection-details-output-select').contains(
				defaultSource
			);
			cy.dataTest('connection-details-save').should('be.disabled');
		});

		it('filters output options by search', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details-output-select').click();
			cy.dataTest('connection-details-output-select-search').type(
				'NOT_A_REAL_SIGNAL_XYZ'
			);
			cy.dataTest('connection-details-output-select').contains(
				'No signals found'
			);
		});

		it('enables Save after selecting a different output, persists on save and closes the panel', () => {
			const store = mountConnections();
			const alternateOutput = findAlternateOutput();

			openInputConnectionDetails();
			cy.dataTest('connection-details-output-select').click();
			cy.dataTest(`select-option-${alternateOutput}`).click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
			cy.dataTest('connection-details-save').click();
			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[
						INPUT_SIGNAL
					]
				).to.equal(alternateOutput);
			});
		});

		it('discards staged changes when the panel is closed', () => {
			const store = mountConnections();
			const alternateOutput = findAlternateOutput();

			openInputConnectionDetails();
			cy.dataTest('connection-details-output-select').click();
			cy.dataTest(`select-option-${alternateOutput}`).click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);

			cy.dataTest('connection-details-close').click();
			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections
				).to.not.have.property(INPUT_SIGNAL);
			});
		});

		it('keeps staged changes when an unrelated part of the store updates', () => {
			const store = mountConnections();
			const alternateOutput = findAlternateOutput();

			openInputConnectionDetails();
			cy.dataTest('connection-details-output-select').click();
			cy.dataTest(`select-option-${alternateOutput}`).click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);

			cy.then(() => {
				store.dispatch(
					setSignalAlias({
						signalName: 'SRC1_CLK_IP_I',
						alias: 'Unrelated Alias'
					})
				);
			});

			cy.dataTest('connection-details-output-select').contains(
				alternateOutput
			);
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
		});

		it('hides the section chevron and keeps the section expanded', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details:source-section')
				.find('svg')
				.should('not.be.visible');
			cy.dataTest('connection-details-output-select').should(
				'be.visible'
			);
			cy.dataTest('connection-details:source-section').click();
			cy.dataTest('connection-details-output-select').should(
				'be.visible'
			);
		});

		it("shows the input's SoC description below its name in the destination summary", () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details:destination-section')
				.parent()
				.contains(getSocDescription(INPUT_SIGNAL));
		});

		it('seeds the comment field from an existing user description', () => {
			const store = createStore();

			store.dispatch(
				setUserDescription({
					input: INPUT_SIGNAL,
					description: 'Existing comment'
				})
			);
			mountConnections(store);

			openInputConnectionDetails();
			cy.dataTest('connection-details-comment')
				.shadow()
				.find('textarea')
				.should('have.value', 'Existing comment');
			cy.dataTest('connection-details-save').should('be.disabled');
		});

		it('enables Save after editing only the comment, and persists it', () => {
			const store = mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details-comment')
				.shadow()
				.find('textarea')
				.type('A new comment');
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.userDescriptions[INPUT_SIGNAL]
				).to.equal('A new comment');
			});
		});

		it('limits the comment field to 500 characters', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details-comment')
				.shadow()
				.find('textarea')
				.type('A'.repeat(520));
			cy.dataTest('connection-details-comment')
				.shadow()
				.find('textarea')
				.should('have.value', 'A'.repeat(500));
			cy.dataTest('connection-details-comment-counter').should(
				'have.text',
				'500/500'
			);
		});

		it('clearing an existing comment to empty removes it on save', () => {
			const store = createStore();

			store.dispatch(
				setUserDescription({
					input: INPUT_SIGNAL,
					description: 'Existing comment'
				})
			);
			mountConnections(store);

			openInputConnectionDetails();
			cy.dataTest('connection-details-comment')
				.shadow()
				.find('textarea')
				.clear();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.userDescriptions
				).to.not.have.property(INPUT_SIGNAL);
			});
		});

		it('clears the comment when the connection is reset', () => {
			const store = createStore();

			store.dispatch(
				setUserDescription({
					input: INPUT_SIGNAL,
					description: 'Existing comment'
				})
			);
			store.dispatch(resetSruConnection(INPUT_SIGNAL));

			expect(
				store.getState().sruReducer.userDescriptions
			).to.not.have.property(INPUT_SIGNAL);
		});

		it('renders an optional alias field seeded from an existing user alias', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: INPUT_SIGNAL,
					alias: 'My Input Alias'
				})
			);
			mountConnections(store);

			openInputConnectionDetails();
			getAliasInput().should('have.value', 'My Input Alias');
			cy.dataTest('connection-details-save').should('be.disabled');
		});

		it('shows a character counter for the alias field', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'0/15'
			);

			getAliasInput().type('My Input Alias');
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'14/15'
			);
		});

		it('limits the alias field to 15 characters', () => {
			mountConnections();

			openInputConnectionDetails();
			getAliasInput().type('A'.repeat(40));
			getAliasInput().should('have.value', 'A'.repeat(15));
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'15/15'
			);
		});

		it('shows an info tooltip explaining the alias field', () => {
			mountConnections();

			openInputConnectionDetails();
			assertAliasInfoTooltip();
		});

		it('enables Save after editing only the alias, and persists it', () => {
			const store = mountConnections();

			openInputConnectionDetails();
			getAliasInput().type('My Input Alias');
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalAliases[INPUT_SIGNAL]
				).to.equal('My Input Alias');
			});
		});

		it('clearing an existing alias to empty removes it on save', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: INPUT_SIGNAL,
					alias: 'My Input Alias'
				})
			);
			mountConnections(store);

			openInputConnectionDetails();
			getAliasInput().clear();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalAliases
				).to.not.have.property(INPUT_SIGNAL);
			});
		});

		it('shows the raw signal name as the title, not the alias', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: INPUT_SIGNAL,
					alias: 'My Input Alias'
				})
			);
			mountConnections(store);

			openInputConnectionDetails();
			cy.dataTest('connection-details-signal-name').should(
				'have.text',
				INPUT_SIGNAL
			);
			getAliasInput().should('have.value', 'My Input Alias');
		});

		it('does not clear the alias when the connection is reset', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: INPUT_SIGNAL,
					alias: 'My Input Alias'
				})
			);
			store.dispatch(resetSruConnection(INPUT_SIGNAL));

			expect(
				store.getState().sruReducer.signalAliases[INPUT_SIGNAL]
			).to.equal('My Input Alias');
		});
	});

	describe('polarity control', () => {
		it('renders the polarity checkbox for an INVERT-capable input', () => {
			mountConnections();

			openPolarityInputDetails();
			cy.dataTest('connection-details-invert-polarity').should(
				'exist'
			);
		});

		it('does not render the polarity checkbox for an input with no INVERT control', () => {
			mountConnections();

			openInputConnectionDetails();
			cy.dataTest('connection-details-invert-polarity').should(
				'not.exist'
			);
		});

		it('seeds the checkbox from persisted inversion state', () => {
			const store = createStore();

			store.dispatch(
				setSignalInversion({
					input: POLARITY_INPUT_SIGNAL,
					inverted: true
				})
			);
			mountConnections(store);

			openPolarityInputDetails();
			cy.dataTest('connection-details-invert-polarity').should(
				'have.attr',
				'current-checked',
				'true'
			);
		});

		it('stages the polarity change without writing it to the store until Save', () => {
			const store = mountConnections();

			openPolarityInputDetails();
			cy.dataTest('connection-details-invert-polarity').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalInversions
				).to.not.have.property(POLARITY_INPUT_SIGNAL);
			});

			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalInversions[
						POLARITY_INPUT_SIGNAL
					]
				).to.be.true;
			});
		});

		it('discards a staged polarity change when the panel is closed', () => {
			const store = mountConnections();

			openPolarityInputDetails();
			cy.dataTest('connection-details-invert-polarity').click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);

			cy.dataTest('connection-details-close').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalInversions
				).to.not.have.property(POLARITY_INPUT_SIGNAL);
			});
		});

		it('enables Save after toggling only the polarity checkbox', () => {
			mountConnections();

			openPolarityInputDetails();
			cy.dataTest('connection-details-save').should('be.disabled');

			cy.dataTest('connection-details-invert-polarity').click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
		});

		it('removes the inversion entry on save when un-inverting', () => {
			const store = createStore();

			store.dispatch(
				setSignalInversion({
					input: POLARITY_INPUT_SIGNAL,
					inverted: true
				})
			);
			mountConnections(store);

			openPolarityInputDetails();
			cy.dataTest('connection-details-invert-polarity').click();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalInversions
				).to.not.have.property(POLARITY_INPUT_SIGNAL);
			});
		});
	});

	describe('output mode', () => {
		it('shows a multi-select of compatible inputs', () => {
			mountConnections();

			openOutputConnectionDetails();
			cy.dataTest('signal-routing-unit-connection-details').contains(
				'Input Signals'
			);
			cy.dataTest('connection-details-input-multiselect').should(
				'exist'
			);
			cy.dataTest('connection-details-input-multiselect').contains(
				'Select input signals'
			);
		});

		it("shows the output's SoC description below its name in the source summary", () => {
			mountConnections();

			openOutputConnectionDetails();
			cy.dataTest('connection-details:source-section')
				.parent()
				.contains(getSocDescription(OUTPUT_SIGNAL));
		});

		it('disables the multiselect option only when its default is already LOW', () => {
			const store = createStore();
			const {inputName, outputName} = findLowDefaultPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				inputName
			);
			cy.dataTest(`multiselect-option-${inputName}`)
				.closest('.checkboxContainer')
				.should('have.attr', 'disabled');
		});

		it('enables the multiselect option for a default connection that is not LOW', () => {
			const store = createStore();
			const {inputName, outputName} = findNonLowDefaultPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				inputName
			);
			cy.dataTest(`multiselect-option-${inputName}`)
				.closest('.checkboxContainer')
				.should('not.have.attr', 'disabled');
		});

		it('persists a newly added input connection on save', () => {
			const store = mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputName]
				).to.equal(OUTPUT_SIGNAL);
			});
		});

		it('closes the panel on save', () => {
			mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();
			cy.dataTest('connection-details-save').click();

			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);
		});

		it('keeps staged inputs when an unrelated part of the store updates', () => {
			const store = mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			const openFilteredDropdown = () => {
				cy.dataTest('connection-details-input-multiselect').click();
				cy.dataTest(
					'connection-details-input-multiselect-search'
				).type('SRC1_DAT');
			};

			openOutputConnectionDetails();
			openFilteredDropdown();
			cy.dataTest(`multiselect-option-${inputName}`).click();
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);

			cy.then(() => {
				store.dispatch(
					setSignalAlias({
						signalName: 'SRC1_CLK_IP_I',
						alias: 'Unrelated Alias'
					})
				);
			});

			cy.dataTest(`multiselect-option-${inputName}`)
				.closest('.checkboxContainer')
				.should('have.attr', 'aria-checked', 'true');
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
		});

		it('renders selected inputs with names and badges', () => {
			mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();

			cy.dataTest(`connection-details-input:${inputName}`).should(
				'exist'
			);
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				inputName
			);
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Modified'
			);
		});

		it('removes a row and unchecks the multiselect option when deleted', () => {
			mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();
			closeInputDropdown();

			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}`).should(
				'not.exist'
			);

			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`)
				.closest('.checkboxContainer')
				.should('have.attr', 'aria-checked', 'false');
		});

		it('disables delete on a default input row only when its default is already LOW', () => {
			const store = createStore();
			const {inputName, outputName} = findLowDefaultPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(`connection-details-input:${inputName}`).should(
				'exist'
			);
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Default'
			);
			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).should('have.attr', 'disabled');
		});

		it('enables delete on a default input row that is not LOW, and routes it to LOW on save', () => {
			const store = createStore();
			const {inputName, outputName} = findNonLowDefaultPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Default'
			);
			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).should('not.have.attr', 'disabled');
			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).click();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputName]
				).to.equal('LOW');
			});
		});

		it('marks a default input row Modified while its polarity is inverted, and Default again when cleared', () => {
			const store = createStore();
			const {inputName, outputName} =
				findInvertibleDefaultPair(false);

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Default'
			);

			cy.then(() => {
				store.dispatch(
					setSignalInversion({input: inputName, inverted: true})
				);
			});
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Modified'
			);
			cy.dataTest(`connection-details-input:${inputName}`)
				.contains('Default')
				.should('not.exist');

			cy.then(() => {
				store.dispatch(
					setSignalInversion({input: inputName, inverted: false})
				);
			});
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Default'
			);
		});

		it('keeps delete disabled on an inverted LOW-default input row', () => {
			const store = createStore();
			const {inputName, outputName} = findInvertibleDefaultPair(true);

			store.dispatch(
				setSignalInversion({input: inputName, inverted: true})
			);
			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'Modified'
			);
			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).should('have.attr', 'disabled');
		});

		it('persists input removal on save after deleting from the list', () => {
			const store = mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();
			cy.dataTest('connection-details-save').click();

			// The panel closes on save, so it has to be reopened to remove the
			// connection that was just persisted.
			openOutputConnectionDetails();
			cy.dataTest(
				`connection-details-input:${inputName}:delete-button`
			).click();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections
				).to.not.have.property(inputName);
			});
		});

		it("shows the selected input's SoC description when its row is expanded", () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				getSocDescription(inputName)
			);
		});

		it('seeds a selected input row description from an existing user description', () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				setUserDescription({
					input: inputName,
					description: 'Existing comment'
				})
			);
			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.should('have.value', 'Existing comment');
			cy.dataTest('connection-details-save').should('be.disabled');
		});

		it('enables Save after editing only a selected input row description, and persists it', () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.type('A new comment');
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.userDescriptions[inputName]
				).to.equal('A new comment');
			});
		});

		it('clearing a selected input row description to empty removes it on save', () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				setUserDescription({
					input: inputName,
					description: 'Existing comment'
				})
			);
			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.clear();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.userDescriptions
				).to.not.have.property(inputName);
			});
		});

		it('limits a selected input row description to 500 characters', () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.type('A'.repeat(520));
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.should('have.value', 'A'.repeat(500));
			cy.dataTest(
				`connection-details-input:${inputName}:description-counter`
			).should('have.text', '500/500');
		});

		it('persists a newly added input row description alongside its connection on save', () => {
			const store = mountConnections();
			const inputName = findSelectableInput('SRC1_DAT');

			openOutputConnectionDetails();
			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`).click();
			closeInputDropdown();

			cy.dataTest(
				`connection-details-input:${inputName}:expand-button`
			).click();
			cy.dataTest(`connection-details-input:${inputName}:description`)
				.shadow()
				.find('textarea')
				.type('New input comment');
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.userDescriptions[inputName]
				).to.equal('New input comment');
			});
		});

		it('shows a reroute confirmation when staging an input with a modified connection to another output', () => {
			const store = createStore();
			const inputName = findSelectableInput('SRC1_DAT');
			const previousOutput = findAlternateOutputForInput(
				inputName,
				OUTPUT_SIGNAL
			);

			store.dispatch(
				setSruConnection({input: inputName, source: previousOutput})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			cy.dataTest('connection-details-save').click();

			cy.dataTest('reroute-confirm-dialog').should('be.visible');
			cy.dataTest('reroute-confirm-dialog').contains(
				`The following routing will be changed to use ${OUTPUT_SIGNAL}:`
			);
			cy.dataTest(`reroute-item-${inputName}`).contains(
				`${previousOutput} → ${inputName}`
			);
		});

		it('does not show a reroute confirmation when staging an input at its default source', () => {
			mountConnections();

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			cy.dataTest('connection-details-save').click();

			cy.dataTest('reroute-confirm-dialog').should('not.exist');
			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);
		});

		it('leaves staged changes intact when the reroute confirmation is cancelled', () => {
			const store = createStore();
			const inputName = findSelectableInput('SRC1_DAT');
			const previousOutput = findAlternateOutputForInput(
				inputName,
				OUTPUT_SIGNAL
			);

			store.dispatch(
				setSruConnection({input: inputName, source: previousOutput})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			cy.dataTest('connection-details-save').click();
			cy.dataTest('reroute-confirm-cancel').click();

			cy.dataTest('reroute-confirm-dialog').should('not.exist');
			cy.dataTest('signal-routing-unit-connection-details').should(
				'exist'
			);
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);

			cy.dataTest('connection-details-input-multiselect').click();
			cy.dataTest('connection-details-input-multiselect-search').type(
				'SRC1_DAT'
			);
			cy.dataTest(`multiselect-option-${inputName}`)
				.closest('.checkboxContainer')
				.should('have.attr', 'aria-checked', 'true');

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputName]
				).to.equal(previousOutput);
			});
		});

		it('applies the reroute when the confirmation is accepted', () => {
			const store = createStore();
			const inputName = findSelectableInput('SRC1_DAT');
			const previousOutput = findAlternateOutputForInput(
				inputName,
				OUTPUT_SIGNAL
			);

			store.dispatch(
				setSruConnection({input: inputName, source: previousOutput})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			cy.dataTest('connection-details-save').click();
			cy.dataTest('reroute-confirm-confirm').click();

			cy.dataTest('reroute-confirm-dialog').should('not.exist');
			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputName]
				).to.equal(OUTPUT_SIGNAL);
			});
		});

		it('preserves an existing user description after a confirmed reroute', () => {
			const store = createStore();
			const inputName = findSelectableInput('SRC1_DAT');
			const previousOutput = findAlternateOutputForInput(
				inputName,
				OUTPUT_SIGNAL
			);

			store.dispatch(
				setSruConnection({input: inputName, source: previousOutput})
			);
			store.dispatch(
				setUserDescription({
					input: inputName,
					description: 'Existing comment'
				})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			cy.dataTest('connection-details-save').click();
			cy.dataTest('reroute-confirm-confirm').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputName]
				).to.equal(OUTPUT_SIGNAL);
				expect(
					store.getState().sruReducer.userDescriptions[inputName]
				).to.equal('Existing comment');
			});
		});

		it('renders an optional alias field seeded from an existing user alias', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: OUTPUT_SIGNAL,
					alias: 'My Output Alias'
				})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			getAliasInput().should('have.value', 'My Output Alias');
			cy.dataTest('connection-details-save').should('be.disabled');
		});

		it('shows a character counter for the alias field', () => {
			mountConnections();

			openOutputConnectionDetails();
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'0/15'
			);

			getAliasInput().type('My Output Alias');
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'15/15'
			);
		});

		it('limits the alias field to 15 characters', () => {
			mountConnections();

			openOutputConnectionDetails();
			getAliasInput().type('A'.repeat(40));
			getAliasInput().should('have.value', 'A'.repeat(15));
			cy.dataTest('connection-details-alias-counter').should(
				'have.text',
				'15/15'
			);
		});

		it('shows an info tooltip explaining the alias field', () => {
			mountConnections();

			openOutputConnectionDetails();
			assertAliasInfoTooltip();
		});

		it('enables Save after editing only the alias, and persists it', () => {
			const store = mountConnections();

			openOutputConnectionDetails();
			getAliasInput().type('My Output Alias');
			cy.dataTest('connection-details-save').should(
				'not.be.disabled'
			);
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalAliases[OUTPUT_SIGNAL]
				).to.equal('My Output Alias');
			});
		});

		it('clearing an existing alias to empty removes it on save', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: OUTPUT_SIGNAL,
					alias: 'My Output Alias'
				})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			getAliasInput().clear();
			cy.dataTest('connection-details-save').click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.signalAliases
				).to.not.have.property(OUTPUT_SIGNAL);
			});
		});

		it('shows the raw signal name as the title, not the alias', () => {
			const store = createStore();

			store.dispatch(
				setSignalAlias({
					signalName: OUTPUT_SIGNAL,
					alias: 'My Output Alias'
				})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			cy.dataTest('connection-details-signal-name').should(
				'have.text',
				OUTPUT_SIGNAL
			);
			getAliasInput().should('have.value', 'My Output Alias');
		});

		it("shows a selected input's alias with its raw name in the selected inputs list", () => {
			const store = createStore();
			const {inputName, outputName} = findDefaultConnectedPair();

			store.dispatch(
				setSignalAlias({
					signalName: inputName,
					alias: 'My Selected Input Alias'
				})
			);
			store.dispatch(
				selectSruOutput({
					peripheralName: getSruSignalPeripheral(outputName) ?? '',
					output: getSruOutputSignals()[outputName]
				})
			);
			mountConnections(store);

			cy.dataTest(`connection-details-input:${inputName}`).contains(
				'My Selected Input Alias'
			);
			cy.dataTest(`connection-details-input:${inputName}`).contains(
				inputName
			);
		});

		it('lists every pending reroute in one confirmation dialog', () => {
			const store = createStore();
			const firstInput = findSelectableInput('SRC1_DAT');
			const secondInput = findSelectableInput('SRC2_DAT');
			const firstPreviousOutput = findAlternateOutputForInput(
				firstInput,
				OUTPUT_SIGNAL
			);
			const secondPreviousOutput = findAlternateOutputForInput(
				secondInput,
				OUTPUT_SIGNAL
			);

			store.dispatch(
				setSruConnection({
					input: firstInput,
					source: firstPreviousOutput
				})
			);
			store.dispatch(
				setSruConnection({
					input: secondInput,
					source: secondPreviousOutput
				})
			);
			mountConnections(store);

			openOutputConnectionDetails();
			stageInputInOutputPanel('SRC1_DAT');
			closeInputDropdown();
			stageInputInOutputPanel('SRC2_DAT');
			cy.dataTest('connection-details-save').click();

			cy.dataTest('reroute-confirm-dialog').contains(
				`The following routings will be changed to use ${OUTPUT_SIGNAL}:`
			);
			cy.dataTest(`reroute-item-${firstInput}`).contains(
				`${firstPreviousOutput} → ${firstInput}`
			);
			cy.dataTest(`reroute-item-${secondInput}`).contains(
				`${secondPreviousOutput} → ${secondInput}`
			);
		});
	});
});

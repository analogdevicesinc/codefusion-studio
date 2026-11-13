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

import type {CfsConfig} from 'cfs-types';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {
	resetSruConnection,
	setSruConnection
} from '../../../state/slices/sru/sru.reducer';
import {getSruDefaultConnections} from '../../../utils/sru';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {Connections} from './connections';
import l10n from '../../../../../../../l10n/bundle.l10n.en.json';

const adsp21835 = (await import('@socs/adsp-21835-bga_ed.json').then(
	m => m.default
)) as Soc;

(window as any).__webview_localization_resources__ = l10n;

// ASRC0's signals contain "SRC0" — its item in the navigation is "SRC 0".
// ASRC0 has no Peripheral.Group but does have an SRU subgroup, so it's
// wrapped in its own "ASRC0" accordion, which must be expanded first.
// TIMER0's signals contain "TM0" — it renders as a flat "TIMER0" item.
const ASRC0_SIGNAL = 'SRC0_CLK_IP_I';
const MODIFIED_SOURCE = 'TEST_MODIFIED_SOURCE';

let store: ReturnType<typeof configurePreloadedStore>;

function mountConnections() {
	store = configurePreloadedStore(adsp21835, {} as CfsConfig);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<Connections />
		</LocalizationProvider>,
		store
	);
}

function typeInSearch(text: string) {
	cy.dataTest('search-bar-control-input')
		.shadow()
		.find('input')
		.type(text);
}

function clearSearch() {
	cy.dataTest('search-bar-control-input')
		.find('vscode-button[appearance="icon"]')
		.click();
}

function markModified(input: string, source = MODIFIED_SOURCE) {
	cy.wrap(null).then(() => {
		store.dispatch(setSruConnection({input, source}));
	});
}

// The scope picker overlays the top of the side panel for as long as there is
// search text, so groups have to be expanded before searching.
function expandGroup(group: string) {
	// The accordion's data-test spans both its header and body, so scope the
	// click to the header (the container's first section).
	cy.dataTest(`accordion:${group}`)
		.children('section')
		.first()
		.click();
}

function selectSrc0() {
	expandGroup('ASRC0');
	cy.dataTest('sru-peripheral-item:SRC 0').click();
}

describe('Connections Filter', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		mountConnections();
	});

	describe('Search', () => {
		it('shows all SRU peripherals by default', () => {
			expandGroup('ASRC0');
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
		});

		it('does not narrow the nav list when searching by signal name', () => {
			expandGroup('ASRC0');

			typeInSearch('SRC0');
			cy.dataTest('filter-control:signals').click();

			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
			cy.dataTest('sru-search-filter-controls').should('exist');
		});

		it('does not narrow the nav list for a case-insensitive signal search', () => {
			expandGroup('ASRC0');

			typeInSearch('src0');
			cy.dataTest('filter-control:signals').click();

			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
		});

		it('keeps every peripheral visible when searching for another signal', () => {
			expandGroup('ASRC0');

			typeInSearch('TM0');
			cy.dataTest('filter-control:signals').click();

			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
		});

		it('shows the scoped search picker while typing', () => {
			typeInSearch('S');

			cy.dataTest('sru-search-filter-controls').should('exist');
			cy.dataTest('min-characters').should('exist');
		});

		it('reveals a matching peripheral group without selecting main-panel content', () => {
			typeInSearch('SPORT');
			cy.dataTest('filter-control:peripherals').click();
			cy.dataTest('search-result-SPORT').click();

			cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');
			cy.dataTest('signal-routing-unit-no-selection').should('exist');
		});

		it('keeps the nav list when no peripheral matches the search text', () => {
			expandGroup('ASRC0');

			typeInSearch('ZZZNOMATCH');

			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
			cy.dataTest('signal-routing-unit-empty-side-panel').should(
				'not.exist'
			);
			cy.dataTest('sru-search-filter-controls').should('exist');
		});

		it('leaves the nav list unchanged when search is cleared', () => {
			expandGroup('ASRC0');

			typeInSearch('SRC0');
			clearSearch();

			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
		});
	});

	describe('Status Filter', () => {
		it('clicking the Modified chip shows only peripherals with modified connections', () => {
			markModified(ASRC0_SIGNAL);

			cy.dataTest('filter-chip-modified').click();

			expandGroup('ASRC0');
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');
		});

		it('clicking the Default chip shows only peripherals without modifications', () => {
			markModified(ASRC0_SIGNAL);

			cy.dataTest('filter-chip-default').click();

			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
			cy.dataTest('sru-peripheral-item:SRC 0').should('not.exist');
		});

		it('clicking the All chip after filtering restores all peripherals', () => {
			markModified(ASRC0_SIGNAL);
			cy.dataTest('filter-chip-modified').click();
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');

			cy.dataTest('filter-chip-all').click();

			expandGroup('ASRC0');
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
		});
	});

	describe('Combined Search and Status Filter', () => {
		it('lets the status filter alone drive nav narrowing while search text does nothing extra', () => {
			markModified(ASRC0_SIGNAL);
			expandGroup('ASRC0');

			cy.dataTest('filter-chip-modified').click();
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');

			typeInSearch('SRC0');
			cy.dataTest('filter-control:signals').click();

			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');
			cy.dataTest('sru-search-filter-controls').should('exist');
		});

		it('keeps status-filtered peripherals visible when search text matches a filtered-out one', () => {
			markModified(ASRC0_SIGNAL);
			expandGroup('ASRC0');
			cy.dataTest('filter-chip-modified').click();

			typeInSearch('TM0');

			cy.dataTest('filter-chip-modified').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
		});

		it('disables Modified when search has no modified results and keeps the current filter', () => {
			markModified(ASRC0_SIGNAL);
			cy.dataTest('filter-chip-modified').click();
			expandGroup('ASRC0');

			typeInSearch('TM0');

			cy.dataTest('filter-chip-modified').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('sru-peripheral-item:SRC 0').should('exist');
			cy.dataTest('sru-peripheral-item:TIMER0').should('not.exist');
		});

		it('disables Default when search has no default results and keeps the current filter', () => {
			markModified(ASRC0_SIGNAL);
			cy.dataTest('filter-chip-default').click();

			typeInSearch('SRC0_CLK_IP_I');

			cy.dataTest('filter-chip-default').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('sru-peripheral-item:TIMER0').should('exist');
			cy.dataTest('sru-peripheral-item:SRC 0').should('not.exist');
		});
	});
});

describe('Connections Main Panel', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		mountConnections();
	});

	it('prompts for a selection until a navigation item is clicked', () => {
		cy.dataTest('signal-routing-unit-no-selection').should(
			'contain.text',
			'No Items Selected Yet'
		);

		selectSrc0();

		cy.dataTest('signal-routing-unit-no-selection').should(
			'not.exist'
		);
	});

	it('scrolls the full-width main panel, not the centered card column', () => {
		// Bound the layout height so overflow is measurable; the default Cypress
		// mount root grows with content and never creates a scroll viewport.
		store = configurePreloadedStore(adsp21835, {} as CfsConfig);

		cy.mount(
			<div style={{height: '400px'}}>
				<LocalizationProvider namespace='cfgtools'>
					<Connections />
				</LocalizationProvider>
			</div>,
			store
		);

		selectSrc0();

		cy.dataTest('signal-routing-unit-main')
			.should('have.css', 'overflow-y', 'auto')
			.and($main => {
				expect($main[0].scrollHeight).to.be.greaterThan(
					$main[0].clientHeight
				);
			});
		cy.dataTest('signal-routing-unit-connections-panel')
			.should('not.have.css', 'overflow-y', 'auto')
			.and($panel => {
				expect($panel[0].scrollHeight).to.equal(
					$panel[0].clientHeight
				);
			});
	});

	it('titles the panel after the selected signal group and describes its peripheral', () => {
		selectSrc0();

		cy.dataTest('signal-routing-unit-main')
			.should('contain.text', 'SRC 0')
			.and('contain.text', 'Asynchronous Sample Rate Converters');
	});

	it('shows only the selected signal group signals, not its siblings', () => {
		selectSrc0();

		cy.dataTest('signal-card:SRC0_CLK_IP_I').should('exist');
		cy.dataTest('signal-card:SRC0_DAT_OP_O').should('exist');
		cy.dataTest('signal-card:SRC1_CLK_IP_I').should('not.exist');
	});

	it('scopes a grouped peripheral to the clicked sub-group only', () => {
		expandGroup('SPORT');

		cy.dataTest('sru-peripheral-item:SPORT 0A').click();

		cy.dataTest('signal-card:SPT0A_CLK_I').should('exist');
		cy.dataTest('signal-card:SPT0B_CLK_I').should('not.exist');
	});

	it('omits the output section for a signal group that has no outputs', () => {
		cy.dataTest('sru-peripheral-item:TIMER0').click();

		cy.dataTest('signal-group:input').should('exist');
		cy.dataTest('signal-group:output').should('not.exist');
		cy.dataTest('signal-group:directionControl').should('not.exist');
		cy.dataTest('signal-group:input')
			.find('h2')
			.should('have.text', 'Input Signals');
	});

	it('omits the input section for a signal group that has no inputs', () => {
		cy.dataTest('sru-peripheral-item:TRU0').click();

		cy.dataTest('signal-group:output').should('exist');
		cy.dataTest('signal-group:input').should('not.exist');
		cy.dataTest('signal-group:directionControl').should('not.exist');
	});

	it('splits pin-buffer enable inputs into a Direction Controls section', () => {
		expandGroup('DAI0');
		cy.dataTest('sru-peripheral-item:DAI0_PB01').click();

		cy.dataTest('signal-group:directionControl').should('exist');
		cy.dataTest('signal-group:directionControl')
			.find('[data-test="signal-card:DAI0_PBEN01_I"]')
			.should('exist');
		cy.dataTest('signal-group:directionControl')
			.find('h2')
			.should('have.text', 'Direction Controls');

		cy.dataTest('signal-group:input')
			.find('[data-test="signal-card:DAI0_PB01_I"]')
			.should('exist');
		cy.dataTest('signal-group:input')
			.find('[data-test="signal-card:DAI0_PBEN01_I"]')
			.should('not.exist');
		cy.dataTest('signal-group:input')
			.find('h2')
			.should('have.text', 'Inputs');

		cy.dataTest('signal-group:output')
			.find('[data-test="signal-card:DAI0_PB01_O"]')
			.should('exist');
		cy.dataTest('signal-group:output')
			.find('h2')
			.should('have.text', 'Outputs');
	});

	describe('Pin buffer direction and pin location', () => {
		const PBEN = 'DAI0_PBEN01_I';
		const INPUT = 'DAI0_PB01_I';
		// Package pin for DAI0 PIN01 on ADSP-21835 BGA_ED.
		const PIN_LOCATION = 'DAI0_PIN01 (Y08)';

		function selectDai0Pb01() {
			expandGroup('DAI0');
			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
		}

		function selectDirection(optionLabel: string) {
			cy.dataTest('pin-buffer-controls:direction-select').click();
			cy.dataTest('pin-buffer-controls:direction-select')
				.find('> vscode-option')
				.contains(optionLabel)
				.click();
		}

		it('shows the resolved package pin for the pin-buffer subgroup', () => {
			selectDai0Pb01();

			cy.dataTest('pin-buffer-controls:pin-location-value').should(
				'have.text',
				PIN_LOCATION
			);
		});

		it('derives the direction dropdown from the PBEN source', () => {
			markModified(PBEN, 'HIGH');
			selectDai0Pb01();

			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'output'
			);

			markModified(PBEN, 'LOW');

			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'input'
			);

			markModified(PBEN, 'DAI0_MISCA0_O');

			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'bidirectional'
			);
		});

		it('sets the PBEN source to HIGH or LOW when Output or Input is selected', () => {
			selectDai0Pb01();

			selectDirection('Input');

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[PBEN]
				).to.equal('LOW');
				expect(
					store.getState().sruReducer.modifiedConnections[INPUT]
				).to.equal('LOW');
			});
			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'input'
			);

			selectDirection('Output');

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[PBEN]
				).to.equal('HIGH');
			});
			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'output'
			);
		});

		it('hides the Input signal edit button when direction is Input', () => {
			const INPUT = 'DAI0_PB01_I';
			const OUTPUT = 'DAI0_PB01_O';

			selectDai0Pb01();
			selectDirection('Input');

			cy.dataTest(`signal-card:${INPUT}:count`).should(
				'have.text',
				'Unused'
			);
			cy.dataTest(`signal-card:${INPUT}:edit-button`).should(
				'not.exist'
			);
			cy.dataTest(`signal-card:${OUTPUT}:edit-button`).should(
				'exist'
			);
			cy.dataTest(`signal-card:${PBEN}:edit-button`).should('exist');

			selectDirection('Output');

			cy.dataTest(`signal-card:${INPUT}:edit-button`).should('exist');

			selectDirection('Input');
			selectDirection('Bidirectional');

			cy.dataTest(`signal-card:${INPUT}:edit-button`).should('exist');
		});

		it('restores the last real PBEN signal when Bidirectional is selected', () => {
			const defaultSource = getSruDefaultConnections()[PBEN];
			const remembered =
				defaultSource === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';

			markModified(PBEN, remembered);
			selectDai0Pb01();
			selectDirection('Input');

			selectDirection('Bidirectional');

			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);
			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'bidirectional'
			);
			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[PBEN]
				).to.equal(remembered);
			});
		});

		it('remembers the last real signal independently per PBEN group', () => {
			const pbenA = 'DAI0_PBEN01_I';
			const pbenB = 'DAI0_PBEN02_I';
			const defaultA = getSruDefaultConnections()[pbenA];
			const defaultB = getSruDefaultConnections()[pbenB];
			const signalA =
				defaultA === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';
			const signalB =
				defaultB === 'DAI0_MISCA1_O'
					? 'DAI0_MISCA0_O'
					: 'DAI0_MISCA1_O';

			markModified(pbenA, signalA);
			markModified(pbenB, signalB);

			expandGroup('DAI0');
			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
			selectDirection('Input');

			cy.dataTest('sru-peripheral-item:DAI0_PB02').click();
			selectDirection('Input');

			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
			selectDirection('Bidirectional');
			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[pbenA]
				).to.equal(signalA);
			});

			cy.dataTest('sru-peripheral-item:DAI0_PB02').click();
			selectDirection('Bidirectional');
			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[pbenB]
				).to.equal(signalB);
			});

			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);
		});

		it('falls back to the SoC default after a PBEN connection is reset', () => {
			const defaultSource = getSruDefaultConnections()[PBEN];
			const remembered =
				defaultSource === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';

			expect(defaultSource)
				.to.be.a('string')
				.and.not.be.oneOf(['LOW', 'HIGH']);

			markModified(PBEN, remembered);
			selectDai0Pb01();
			selectDirection('Input');

			cy.wrap(null).then(() => {
				store.dispatch(resetSruConnection(PBEN));
			});

			cy.then(() => {
				expect(
					store.getState().sruReducer.lastRealSignal[PBEN]
				).to.equal(undefined);
			});

			selectDirection('Input');
			selectDirection('Bidirectional');

			cy.dataTest('signal-routing-unit-connection-details').should(
				'not.exist'
			);
			cy.dataTest('pin-buffer-controls:direction-select').should(
				'have.attr',
				'current-value',
				'bidirectional'
			);
			cy.then(() => {
				const {modifiedConnections} = store.getState().sruReducer;

				expect(modifiedConnections[PBEN]).to.equal(undefined);
			});
		});

		it('restores the last real pin-buffer input signal when Output or Bidirectional is selected', () => {
			const defaultSource = getSruDefaultConnections()[INPUT];
			const remembered =
				defaultSource === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';

			markModified(INPUT, remembered);
			selectDai0Pb01();
			selectDirection('Input');

			selectDirection('Output');

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[INPUT]
				).to.equal(remembered);
			});

			selectDirection('Input');
			selectDirection('Bidirectional');

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[INPUT]
				).to.equal(remembered);
			});
		});

		it('remembers the last real pin-buffer input signal independently per group', () => {
			const inputA = 'DAI0_PB01_I';
			const inputB = 'DAI0_PB02_I';
			const defaultA = getSruDefaultConnections()[inputA];
			const defaultB = getSruDefaultConnections()[inputB];
			const signalA =
				defaultA === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';
			const signalB =
				defaultB === 'DAI0_MISCA1_O'
					? 'DAI0_MISCA0_O'
					: 'DAI0_MISCA1_O';

			markModified(inputA, signalA);
			markModified(inputB, signalB);

			expandGroup('DAI0');
			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
			selectDirection('Input');

			cy.dataTest('sru-peripheral-item:DAI0_PB02').click();
			selectDirection('Input');

			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
			selectDirection('Output');
			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputA]
				).to.equal(signalA);
			});

			cy.dataTest('sru-peripheral-item:DAI0_PB02').click();
			selectDirection('Output');
			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[inputB]
				).to.equal(signalB);
			});
		});

		it('falls back to the SoC default for the pin-buffer input after its connection is reset', () => {
			const defaultSource = getSruDefaultConnections()[INPUT];
			const remembered =
				defaultSource === 'DAI0_MISCA0_O'
					? 'DAI0_MISCA1_O'
					: 'DAI0_MISCA0_O';

			expect(defaultSource).to.be.a('string').and.not.equal('LOW');

			markModified(INPUT, remembered);
			selectDai0Pb01();
			selectDirection('Input');

			cy.wrap(null).then(() => {
				store.dispatch(resetSruConnection(INPUT));
			});

			cy.then(() => {
				expect(
					store.getState().sruReducer.lastRealSignal[INPUT]
				).to.equal(undefined);
			});

			selectDirection('Input');
			selectDirection('Output');

			cy.then(() => {
				const {modifiedConnections} = store.getState().sruReducer;

				expect(modifiedConnections[INPUT]).to.equal(undefined);
			});
		});
	});

	it('does not narrow the selected group cards when searching', () => {
		selectSrc0();
		cy.dataTest('signal-card:SRC0_CLK_IP_I').should('exist');
		cy.dataTest('signal-card:SRC0_DAT_OP_O').should('exist');

		typeInSearch('SRC0_DAT');
		cy.dataTest('filter-control:signals').click();

		cy.dataTest('signal-routing-unit-no-selection').should(
			'not.exist'
		);
		cy.dataTest('signal-card:SRC0_DAT_OP_O').should('exist');
		cy.dataTest('signal-card:SRC0_CLK_IP_I').should('exist');
		cy.dataTest('sru-search-filter-controls').should('exist');
	});

	it('shows the no-matching-signals state when the status filter excludes every card', () => {
		markModified('SRC1_CLK_IP_I');
		selectSrc0();

		cy.dataTest('filter-chip-modified').click();

		cy.dataTest('signal-cards-empty').should(
			'contain.text',
			'No Matching Signals'
		);
	});

	describe('Expand and collapse all', () => {
		// Overriding two of SRC 0's inputs guarantees both cards have a
		// connection, and so are expandable, whatever the SoC defaults are.
		const FIRST_INPUT = 'SRC0_CLK_IP_I';
		const SECOND_INPUT = 'SRC0_CLK_OP_I';

		beforeEach(() => {
			markModified(FIRST_INPUT, 'SRC0_DAT_OP_O');
			markModified(SECOND_INPUT, 'SRC0_TDM_IP_O');
			selectSrc0();
		});

		it('expands every expandable card and then collapses them again', () => {
			cy.dataTest(`signal-card:${FIRST_INPUT}:body`).should(
				'not.exist'
			);

			cy.dataTest('signal-cards').should(
				'have.attr',
				'role',
				'toolbar'
			);
			cy.dataTest('signal-cards:expand-all').click();

			cy.dataTest(`signal-card:${FIRST_INPUT}:body`).should('exist');
			cy.dataTest(`signal-card:${SECOND_INPUT}:body`).should('exist');

			cy.dataTest('signal-cards:collapse-all').click();

			cy.dataTest(`signal-card:${FIRST_INPUT}:body`).should(
				'not.exist'
			);
			cy.dataTest(`signal-card:${SECOND_INPUT}:body`).should(
				'not.exist'
			);
		});

		it('disables collapse all until something is expanded, and expand all once everything is', () => {
			cy.dataTest('signal-cards:collapse-all').should(
				'have.attr',
				'disabled'
			);

			cy.dataTest('signal-cards:expand-all').click();

			cy.dataTest('signal-cards:expand-all').should(
				'have.attr',
				'disabled'
			);
			cy.dataTest('signal-cards:collapse-all').should(
				'not.have.attr',
				'disabled'
			);
		});

		it('expands a single card without expanding its siblings', () => {
			cy.dataTest(`signal-card:${FIRST_INPUT}`).click();

			cy.dataTest(`signal-card:${FIRST_INPUT}:body`).should('exist');
			cy.dataTest(`signal-card:${SECOND_INPUT}:body`).should(
				'not.exist'
			);
		});
	});

	it('opens connection details for the edited signal', () => {
		const signalName = 'SRC0_CLK_IP_I';

		selectSrc0();
		cy.dataTest(`signal-card:${signalName}:edit-button`).click();

		cy.dataTest(`signal-card:${signalName}`)
			.should('have.attr', 'data-active')
			.and('equal', 'true');
		cy.dataTest('signal-routing-unit-connection-details').should(
			'exist'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			signalName
		);
		cy.dataTest('connection-details-output-select').should('exist');

		cy.dataTest('connection-details-close').click();
		cy.dataTest(`signal-card:${signalName}`).should(
			'have.attr',
			'data-active',
			'false'
		);
	});

	describe('Remove connection', () => {
		// Same pair as the expand/collapse tests: both signals are in the
		// SRC 0 signal group. SRC0_CLK_OP_I has no SoC default route, so overriding
		// it always yields a modified connection on the output card.
		const MODIFIED_INPUT = 'SRC0_CLK_OP_I';
		const OUTPUT = 'SRC0_TDM_IP_O';

		beforeEach(() => {
			markModified(MODIFIED_INPUT, OUTPUT);
			selectSrc0();
			cy.dataTest('signal-cards:expand-all').click();
			cy.dataTest(`signal-card:${OUTPUT}:body`).should('exist');
		});

		it('clicking delete on a modified row resets the connection', () => {
			cy.dataTest(`signal-connection:${MODIFIED_INPUT}`).should(
				'contain',
				'Modified'
			);

			cy.dataTest(
				`signal-connection:${MODIFIED_INPUT}:delete-button`
			).click();

			cy.dataTest(`signal-connection:${MODIFIED_INPUT}`).should(
				'not.exist'
			);
		});

		it('clicking delete on a default row routes the input to LOW', () => {
			const defaultInput = 'SRC0_DAT_IP_I';
			const defaultSource = getSruDefaultConnections()[defaultInput];

			expect(defaultSource).to.equal('DAI0_PB01_O');

			expandGroup('DAI0');
			cy.dataTest('sru-peripheral-item:DAI0_PB01').click();
			cy.dataTest('signal-cards:expand-all').click();

			cy.dataTest(`signal-connection:${defaultInput}`).should(
				'contain',
				'Default'
			);

			cy.dataTest(
				`signal-connection:${defaultInput}:delete-button`
			).click();

			cy.then(() => {
				expect(
					store.getState().sruReducer.modifiedConnections[
						defaultInput
					]
				).to.equal('LOW');
			});
		});
	});
});

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
import type {Soc} from '@common/types/soc';
import type {CfsConfig} from 'cfs-types';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {configurePreloadedStore} from '../../../../state/store';
import {
	revealNavigationGroup,
	setSelectedSignalGroup
} from '../../../../state/slices/sru/sru.reducer';
import {getPeripheralList} from '../../../../utils/soc-peripherals';
import {groupSruSignals} from '../../../../utils/sru-navigation';
import SruPeripheralNavigation from './sru-peripheral-navigation';
import l10n from '../../../../../../../../l10n/bundle.l10n.en.json';

const mock = (await import('@socs/adsp-21835-bga_ed.json'))
	.default as unknown as Soc;

(window as any).__webview_localization_resources__ = l10n;

/**
 * Mounts the navigation, optionally inside a scrollable container of the
 * given pixel height to mimic the Connections side panel's scrolling list.
 */
function mountNavigation(containerHeight?: number) {
	const store = configurePreloadedStore(mock, {} as CfsConfig);

	const sruPeripherals = getPeripheralList().filter(peripheral =>
		Boolean(peripheral.sru)
	);
	const sections = groupSruSignals(sruPeripherals);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<div
				data-test='scroll-container'
				style={
					containerHeight
						? {height: `${containerHeight}px`, overflowY: 'auto'}
						: undefined
				}
			>
				<SruPeripheralNavigation sections={sections} />
			</div>
		</LocalizationProvider>,
		store
	);

	return {store, sections};
}

/**
 * Asserts where a row sits relative to the scrollable container's viewport.
 * Retries via `should` so it tolerates the scroll landing a render later.
 * The one-pixel slack absorbs sub-pixel row heights.
 */
function assertRowPosition(
	name: string,
	expected: 'inside' | 'below'
) {
	cy.dataTest(`sru-peripheral-item:${name}`).should($row => {
		const container = Cypress.$(
			'[data-test="scroll-container"]'
		)[0].getBoundingClientRect();
		const row = $row[0].getBoundingClientRect();

		if (expected === 'inside') {
			expect(row.top).to.be.at.least(container.top - 1);
			expect(row.bottom).to.be.at.most(container.bottom + 1);
		} else {
			expect(row.top).to.be.greaterThan(container.bottom);
		}
	});
}

function expandGroup(group: string) {
	// The accordion's data-test spans both its header and body, so once
	// expanded, a plain click lands in the body instead of the header.
	// Scope the click to the header (the container's first section).
	cy.dataTest(`accordion:${group}`)
		.children('section')
		.first()
		.click();
}

describe('SruPeripheralNavigation', () => {
	it('renders pin-buffer and peripheral section headings', () => {
		mountNavigation();

		cy.dataTest('sru-navigation-section:pinBuffers').should(
			'contain.text',
			'Pin Buffers'
		);
		cy.dataTest('sru-navigation-section:peripherals').should(
			'contain.text',
			'Peripherals'
		);
	});

	it('shows SRU signal groups (not peripheral names) once the SPORT group is expanded', () => {
		mountNavigation();

		expandGroup('SPORT');

		cy.dataTest('sru-peripheral-item:SPORT0').should('not.exist');
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');
		cy.dataTest('sru-peripheral-item:SPORT 0A:inputs').should(
			'contain.text',
			'4'
		);
		cy.dataTest('sru-peripheral-item:SPORT 0A:outputs').should(
			'contain.text',
			'10'
		);
		cy.dataTest('sru-peripheral-item:SPORT 7B:inputs').should(
			'contain.text',
			'4'
		);
		cy.dataTest('sru-peripheral-item:SPORT 7B:outputs').should(
			'contain.text',
			'10'
		);
	});

	it('wraps ungrouped peripherals that have SRU subgroups under their own name, but renders fully ungrouped peripherals flat', () => {
		mountNavigation();

		// ASRC0 has no Peripheral.Group but does have SRU subgroups, so it's
		// wrapped in its own "ASRC0" accordion.
		expandGroup('ASRC0');
		cy.dataTest('sru-peripheral-item:SRC 0:inputs').should(
			'contain.text',
			'6'
		);
		cy.dataTest('sru-peripheral-item:SRC 0:outputs').should(
			'contain.text',
			'2'
		);

		// Likewise for SPDIF0.
		expandGroup('SPDIF0');
		cy.dataTest('sru-peripheral-item:SPDIF TX 0:inputs').should(
			'contain.text',
			'5'
		);
		cy.dataTest('sru-peripheral-item:SPDIF TX 0:outputs').should(
			'contain.text',
			'2'
		);

		// TIMER0/TRU0 have no signal-level groups at all, so they render
		// flat at the top level: their signal group is named after the
		// peripheral and counts all of its signals.
		cy.dataTest('sru-peripheral-item:TIMER0:inputs').should(
			'contain.text',
			'2'
		);
		cy.dataTest('sru-peripheral-item:TIMER0:outputs').should(
			'contain.text',
			'0'
		);
		cy.dataTest('sru-peripheral-item:TRU0:inputs').should(
			'contain.text',
			'0'
		);
		cy.dataTest('sru-peripheral-item:TRU0:outputs').should(
			'contain.text',
			'8'
		);

		// DAI0's ungrouped misc signals stay flat in the peripherals
		// section. Its pin-buffer subgroups live under the DAI0 accordion in
		// the pin-buffers section.
		cy.dataTest('sru-peripheral-item:DAI0:inputs').should(
			'contain.text',
			'16'
		);
		cy.dataTest('sru-peripheral-item:DAI0:outputs').should(
			'contain.text',
			'8'
		);

		expandGroup('DAI0');
		cy.dataTest('sru-peripheral-item:DAI0_PB01:inputs').should(
			'contain.text',
			'1'
		);
		cy.dataTest('sru-peripheral-item:DAI0_PB01:outputs').should(
			'contain.text',
			'1'
		);
	});

	it('auto-opens a collapsed group when one of its signal groups becomes selected', () => {
		const {store, sections} = mountNavigation();

		const signalGroup = sections
			.flatMap(section => section.entries)
			.find(entry => entry.group === 'SPORT')
			?.signalGroups.find(
				candidate => candidate.label === 'SPORT 0A'
			);

		if (!signalGroup) {
			throw new Error(
				'Expected to find the SPORT 0A signal group in the SPORT group fixture'
			);
		}

		// Collapsed by default: the row nested inside the SPORT accordion
		// isn't rendered yet.
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('not.exist');

		cy.then(() => {
			store.dispatch(setSelectedSignalGroup(signalGroup.key));
		});

		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');
	});

	it('reopens a group when its selected signal group is reselected after a manual collapse', () => {
		const {store, sections} = mountNavigation();

		const signalGroup = sections
			.flatMap(section => section.entries)
			.find(entry => entry.group === 'SPORT')
			?.signalGroups.find(
				candidate => candidate.label === 'SPORT 0A'
			);

		if (!signalGroup) {
			throw new Error(
				'Expected to find the SPORT 0A signal group in the SPORT group fixture'
			);
		}

		cy.then(() => {
			store.dispatch(setSelectedSignalGroup(signalGroup.key));
		});
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');

		// Manually collapse the group the selected row lives in.
		expandGroup('SPORT');
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('not.exist');

		// Reselecting the exact same, already-selected signal group must
		// still reopen the group - the selected key alone doesn't change
		// value here, so this exercises `selectionSequence` rather than
		// `selectedSignalGroupKey`.
		cy.then(() => {
			store.dispatch(setSelectedSignalGroup(signalGroup.key));
		});
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');
	});

	it('reveals and reopens a section-qualified group without changing selection', () => {
		const {store} = mountNavigation();

		cy.then(() => {
			store.dispatch(setSelectedSignalGroup('TIMER0'));
			store.dispatch(
				revealNavigationGroup({
					sectionKind: 'pinBuffers',
					group: 'SPORT'
				})
			);
		});

		// A group with this label exists only in the peripherals section, so
		// the section-mismatched request must leave it collapsed.
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('not.exist');

		cy.then(() => {
			store.dispatch(
				revealNavigationGroup({
					sectionKind: 'peripherals',
					group: 'SPORT'
				})
			);
		});
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');

		expandGroup('SPORT');
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('not.exist');

		cy.then(() => {
			store.dispatch(
				revealNavigationGroup({
					sectionKind: 'peripherals',
					group: 'SPORT'
				})
			);
			expect(
				store.getState().sruReducer.selectedSignalGroupKey
			).to.equal('TIMER0');
		});
		cy.dataTest('sru-peripheral-item:SPORT 0A').should('exist');
	});

	it('scrolls a selected flat row into view when it sits below the fold', () => {
		const {store, sections} = mountNavigation(150);

		const signalGroup = sections
			.flatMap(section => section.entries)
			.filter(entry => entry.group === undefined)
			.at(-1)?.signalGroups[0];

		if (!signalGroup) {
			throw new Error(
				'Expected the fixture to contain a flat, ungrouped signal group'
			);
		}

		assertRowPosition(signalGroup.name, 'below');

		cy.then(() => {
			store.dispatch(setSelectedSignalGroup(signalGroup.key));
		});

		assertRowPosition(signalGroup.name, 'inside');
	});

	it('scrolls a selected row into view once its collapsed group auto-opens', () => {
		const {store, sections} = mountNavigation(150);

		const signalGroup = sections
			.flatMap(section => section.entries)
			.find(entry => entry.group === 'SPORT')
			?.signalGroups.at(-1);

		if (!signalGroup) {
			throw new Error(
				'Expected to find signal groups in the SPORT group fixture'
			);
		}

		cy.then(() => {
			store.dispatch(setSelectedSignalGroup(signalGroup.key));
		});

		assertRowPosition(signalGroup.name, 'inside');
	});
});

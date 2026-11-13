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
import {configurePreloadedStore} from '../../state/store';
import {navigationItems} from '../../../../common/constants/navigation';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import {formatSocCoreMemoryBlocks} from '../../utils/json-formatter';
import {
	setConnectionsFilter,
	setUserDescription
} from '../../state/slices/sru/sru.reducer';
import {SignalRoutingUnit} from './signal-routing-unit';
import l10n from '../../../../../../l10n/bundle.l10n.en.json';

const adsp21834 = (await import('@socs/adsp-21834-bga_ed.json').then(
	module => module.default
)) as Soc;

const adsp = formatSocCoreMemoryBlocks(
	(await import('@socs/adsp-21835w-bga_ed.json'))
		.default as unknown as Soc
);

(window as any).__webview_localization_resources__ = l10n;

// ASRC0's signals contain "SRC0" — its item in the navigation is "SRC 0".
// ASRC0 has no Peripheral.Group but does have an SRU subgroup, so it's
// wrapped in its own "ASRC0" accordion, which must be expanded first.
const ASRC0_SIGNAL_GROUP = 'SRC 0';
const INPUT_SIGNAL = 'SRC0_CLK_IP_I';
const OUTPUT_SIGNAL = 'SRC0_DAT_OP_O';

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

function mountScreen(
	soc: Soc = adsp21834,
	config: CfsConfig = {} as CfsConfig
) {
	const store = configurePreloadedStore(soc, config);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<SignalRoutingUnit />
		</LocalizationProvider>,
		store
	);

	return store;
}

beforeEach(() => {
	cy.viewport(1920, 1080);
});

describe('Signal Routing Unit View', () => {
	it('renders the Connections subscreen (two-column) by default', () => {
		mountScreen();

		cy.dataTest('signal-routing-unit-side-panel').should('exist');
		cy.dataTest('signal-routing-unit-main').should('exist');
		cy.dataTest('search-and-filter-bar').should('exist');
		cy.dataTest('signal-routing-unit-connection-details').should(
			'not.exist'
		);
		cy.dataTest('signal-routing-unit-routing').should('not.exist');
	});

	it('switches to the Routing subscreen (single-column)', () => {
		const store = configurePreloadedStore(adsp21834, {} as CfsConfig);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SignalRoutingUnit
					initialActiveScreenSubscreen={
						navigationItems.signalRoutingUnitRouting
					}
				/>
			</LocalizationProvider>,
			store
		);

		cy.dataTest('signal-routing-unit-routing').should('exist');
		cy.dataTest('signal-routing-unit-routing-body').should('exist');
		cy.dataTest('search-and-filter-bar').should('exist');
		cy.dataTest('signal-routing-unit-side-panel').should('not.exist');
	});

	it('Shows no results in the routing table and clears filters correctly', () => {
		const store = configurePreloadedStore(adsp21834, {} as CfsConfig);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SignalRoutingUnit
					initialActiveScreenSubscreen={
						navigationItems.signalRoutingUnitRouting
					}
				/>
			</LocalizationProvider>,
			store
		);

		// Apply a search filter that produces no routing results
		cy.get('[data-test="search-bar-control-input"]')
			.shadow()
			.find('input#control')
			.type('test search string')
			.should('have.value', 'test search string');

		// Verify that the empty state is displayed after applying the search filter
		cy.dataTest('empty-state').should('exist');
		// Clear the applied filters
		cy.dataTest('clear-filters').click();

		// Verify that the search bar and filters are reset correctly
		cy.get('[data-test="search-bar-control-input"]')
			.shadow()
			.find('input#control')
			.should('have.value', '');

		cy.dataTest('filter-chip-all').should(
			'have.attr',
			'appearance',
			'primary'
		);
	});

	it('opens connection details when editing SRU signals', () => {
		mountScreen(adsp, adspConfig);

		cy.dataTest('accordion:ASRC0')
			.children('section')
			.first()
			.click();
		cy.dataTest(`sru-peripheral-item:${ASRC0_SIGNAL_GROUP}`).click();
		cy.dataTest(`signal-card:${INPUT_SIGNAL}`).should('exist');
		cy.dataTest(`signal-card:${OUTPUT_SIGNAL}`).should('exist');
		cy.dataTest('signal-routing-unit-connection-details').should(
			'not.exist'
		);

		cy.dataTest(`signal-card:${INPUT_SIGNAL}:edit-button`).click();
		cy.dataTest('signal-routing-unit-connection-details').should(
			'exist'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Connection Details'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Source Details'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Destination Details'
		);
		cy.dataTest('connection-details-output-select').should('exist');
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Output Signal'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			INPUT_SIGNAL
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'ASRC0'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Clock Signals'
		);

		cy.dataTest(`signal-card:${OUTPUT_SIGNAL}:edit-button`).click();
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Input Signals'
		);
	});

	it("jumps from a Routing table row's configure icon into Connections with its details panel open", () => {
		const store = configurePreloadedStore(adsp, adspConfig);

		store.dispatch(
			setUserDescription({
				input: INPUT_SIGNAL,
				description: 'Existing row description'
			})
		);
		// A mismatched Connections filter must not hide the target
		// peripheral once we navigate there.
		store.dispatch(
			setConnectionsFilter({
				searchText: 'unrelated search',
				statusFilter: 'modified'
			})
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SignalRoutingUnit
					initialActiveScreenSubscreen={
						navigationItems.signalRoutingUnitRouting
					}
				/>
			</LocalizationProvider>,
			store
		);

		cy.dataTest('signal-routing-unit-routing').should('exist');
		cy.dataTest('signal-routing-unit-connection-details').should(
			'not.exist'
		);

		cy.dataTest(`configure-${INPUT_SIGNAL}`).click();

		// Header segmented control switched from Routing to Connections.
		cy.dataTest('signal-routing-unit-routing').should('not.exist');
		cy.dataTest('signal-routing-unit-side-panel').should('exist');

		// Owning peripheral selected/expanded, its detail view loaded.
		cy.dataTest(`signal-card:${INPUT_SIGNAL}`).should('exist');

		// Connection Details panel opened automatically, reflecting the
		// row's destination signal and carrying over its description.
		cy.dataTest('signal-routing-unit-connection-details').should(
			'exist'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'Destination Details'
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			INPUT_SIGNAL
		);
		cy.dataTest('signal-routing-unit-connection-details').contains(
			'ASRC0'
		);
		cy.dataTest('connection-details-comment')
			.shadow()
			.find('textarea')
			.should('have.value', 'Existing row description');

		// Closing the panel keeps the Connections view active.
		cy.dataTest('connection-details-close').click();

		cy.dataTest('signal-routing-unit-connection-details').should(
			'not.exist'
		);
		cy.dataTest('signal-routing-unit-side-panel').should('exist');
		cy.dataTest('signal-routing-unit-routing').should('not.exist');
	});
});

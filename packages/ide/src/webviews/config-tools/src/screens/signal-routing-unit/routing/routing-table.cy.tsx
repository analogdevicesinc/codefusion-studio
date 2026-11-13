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
import {navigationItems} from '@common/constants/navigation';
import {configurePreloadedStore} from '../../../state/store';
import {
	setSruConnection,
	setRoutingFilter,
	setConnectionsFilter,
	setSignalAlias,
	setUserDescription,
	setSignalInversion
} from '../../../state/slices/sru/sru.reducer';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {RoutingTable} from './routing-table';
import l10n from '../../../../../../../l10n/bundle.l10n.en.json';

const adsp21834 = (await import('@socs/adsp-21834-bga_ed.json').then(
	m => m.default
)) as Soc;

(window as any).__webview_localization_resources__ = l10n;

const INPUT_A = 'SRC0_CLK_IP_I';
const INPUT_B = 'SRC0_CLK_OP_I';
const MODIFIED_SOURCE = 'TEST_MODIFIED_SOURCE';

let store: ReturnType<typeof configurePreloadedStore>;

function mountTable() {
	store = configurePreloadedStore(adsp21834, {} as CfsConfig);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<RoutingTable />
		</LocalizationProvider>,
		store
	);
}

function applyFilter(filter: Parameters<typeof setRoutingFilter>[0]) {
	cy.wrap(null).then(() => {
		store.dispatch(setRoutingFilter(filter));
	});
}

function markModified(input: string, source = MODIFIED_SOURCE) {
	cy.wrap(null).then(() => {
		store.dispatch(setSruConnection({input, source}));
	});
}

function markAlias(signalName: string, alias: string) {
	cy.wrap(null).then(() => {
		store.dispatch(setSignalAlias({signalName, alias}));
	});
}

function markInverted(input: string, inverted: boolean) {
	cy.wrap(null).then(() => {
		store.dispatch(setSignalInversion({input, inverted}));
	});
}

describe('Routing Table', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		mountTable();
	});

	describe('Rendering', () => {
		it('renders data rows from SoC default connections', () => {
			cy.dataTest('routing-table')
				.find('[role="row"]')
				.should('have.length.greaterThan', 1);
		});

		it('shows destination name in the destination column', () => {
			cy.dataTest('routing-table').should('contain', INPUT_A);
		});

		it('shows a user description in the description column', () => {
			cy.wrap(null).then(() => {
				store.dispatch(
					setUserDescription({
						input: INPUT_A,
						description: 'My custom description'
					})
				);
			});

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'My custom description');
		});

		it('shows a Default badge for unmodified connections', () => {
			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'Default');
		});

		it('shows the destination raw name as the primary label with its alias below', () => {
			markAlias(INPUT_A, 'My Destination Alias');

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.as('row');

			cy.get('@row')
				.find(
					'[data-test="destination-cell"] [data-test="signal-name"]'
				)
				.should('have.text', INPUT_A);
			cy.get('@row')
				.find(
					'[data-test="destination-cell"] [data-test="signal-alias"]'
				)
				.should('have.text', 'My Destination Alias');
		});

		it('shows an inverted signal icon next to the destination name when the signal is inverted', () => {
			markInverted(INPUT_A, true);

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.find('[data-test="destination-cell"]')
				.find('svg')
				.should('exist');
		});

		it('does not show an inverted signal icon when the signal is not inverted', () => {
			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.find('[data-test="destination-cell"]')
				.find('svg')
				.should('not.exist');
		});

		it('shows the source raw name as the primary label with its alias below', () => {
			markModified(INPUT_A);
			markAlias(MODIFIED_SOURCE, 'My Source Alias');

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.as('row');

			cy.get('@row')
				.find('[data-test="source-cell"] [data-test="signal-name"]')
				.should('have.text', MODIFIED_SOURCE);
			cy.get('@row')
				.find('[data-test="source-cell"] [data-test="signal-alias"]')
				.should('have.text', 'My Source Alias');
		});
	});

	describe('Modified Connections', () => {
		it('shows a Modified badge after a connection is changed', () => {
			markModified(INPUT_A);

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'Modified');
		});

		it('reset button is disabled for default connections', () => {
			cy.dataTest(`reset-${INPUT_A}`).should('have.attr', 'disabled');
		});

		it('reset button is enabled for modified connections', () => {
			markModified(INPUT_A);

			cy.dataTest(`reset-${INPUT_A}`).should(
				'not.have.attr',
				'disabled'
			);
		});

		it('clicking reset returns a modified connection to default', () => {
			markModified(INPUT_A);

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'Modified');

			cy.dataTest(`reset-${INPUT_A}`).click();

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'Default')
				.and('not.contain', 'Modified');
		});

		it('resetting one connection does not affect other modified connections', () => {
			markModified(INPUT_A);
			markModified(INPUT_B);

			cy.dataTest(`reset-${INPUT_A}`).click();

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_A}")`)
				.should('contain', 'Default');

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.filter(`:contains("${INPUT_B}")`)
				.should('contain', 'Modified');
		});
	});

	describe('Routing Filter', () => {
		describe('Search', () => {
			it('filters rows by destination name, case-insensitive', () => {
				markModified(INPUT_A);

				applyFilter({searchText: INPUT_A.toLowerCase()});

				cy.dataTest('routing-table').should('contain', INPUT_A);
				cy.dataTest('routing-table').should('not.contain', INPUT_B);
			});

			it('filters rows by source name', () => {
				markModified(INPUT_A);

				applyFilter({searchText: MODIFIED_SOURCE});

				cy.dataTest('routing-table').should('contain', INPUT_A);
				cy.dataTest('routing-table').should('not.contain', INPUT_B);
			});

			it('filters rows by alias text', () => {
				markModified(INPUT_A);
				markAlias(INPUT_A, 'My Destination Alias');

				applyFilter({searchText: 'My Destination Alias'});

				cy.dataTest('routing-table').should('contain', INPUT_A);
				cy.dataTest('routing-table').should('not.contain', INPUT_B);
			});

			it('shows all rows when search is cleared', () => {
				markModified(INPUT_A);
				applyFilter({searchText: MODIFIED_SOURCE});

				cy.dataTest('routing-table')
					.find('[role="row"]')
					.should('have.length', 2); // Header + 1 match

				applyFilter({searchText: ''});

				cy.dataTest('routing-table')
					.find('[role="row"]')
					.should('have.length.greaterThan', 2);
			});
		});

		describe('Status Filter', () => {
			it('shows only modified connections when status filter is "modified"', () => {
				markModified(INPUT_A);

				applyFilter({statusFilter: 'modified'});

				cy.dataTest('routing-table')
					.find('[role="row"]')
					.should('have.length', 2); // Header + 1 modified row

				cy.dataTest('routing-table').should('not.contain', INPUT_B);
			});

			it('shows only default connections when status filter is "default"', () => {
				markModified(INPUT_A);

				applyFilter({statusFilter: 'default'});

				cy.dataTest('routing-table').should('contain', INPUT_B);
				cy.dataTest('routing-table').should('not.contain', INPUT_A);
			});

			it('shows all connections when status filter is reset to "all"', () => {
				markModified(INPUT_A);
				applyFilter({statusFilter: 'modified'});
				applyFilter({statusFilter: 'all'});

				cy.dataTest('routing-table')
					.find('[role="row"]')
					.should('have.length.greaterThan', 2);
			});
		});

		describe('Combined Search and Status Filter', () => {
			it('applies search and status filter simultaneously', () => {
				markModified(INPUT_A);
				markModified(INPUT_B);

				applyFilter({
					searchText: INPUT_A,
					statusFilter: 'modified'
				});

				cy.dataTest('routing-table').should('contain', INPUT_A);
				cy.dataTest('routing-table').should('not.contain', INPUT_B);
			});

			it('shows no data rows when combined filters match nothing', () => {
				markModified(INPUT_A);

				applyFilter({
					searchText: 'NONEXISTENT_SIGNAL',
					statusFilter: 'modified'
				});

				cy.dataTest('routing-table')
					.find('[role="row"]')
					.should('have.length', 1); // Header only
			});
		});
	});

	describe('Configure Action', () => {
		it('is enabled for both default and modified connections', () => {
			markModified(INPUT_A);

			cy.dataTest(`configure-${INPUT_A}`).should(
				'not.have.attr',
				'disabled'
			);
			cy.dataTest(`configure-${INPUT_B}`).should(
				'not.have.attr',
				'disabled'
			);
		});

		it('switches the active subscreen to Connections', () => {
			cy.dataTest(`configure-${INPUT_A}`).click();

			cy.wrap(null).then(() => {
				expect(
					store.getState().appContextReducer.activeScreenSubscreen
				).to.equal(navigationItems.signalRoutingUnitConnections);
			});
		});

		it('selects the destination signal and opens its details panel', () => {
			cy.dataTest(`configure-${INPUT_A}`).click();

			cy.wrap(null).then(() => {
				const state = store.getState();

				expect(
					Boolean(state.sruReducer.selectedSignalGroupKey)
				).to.equal(true);
				expect(state.sruReducer.editableConnections).to.have.length(
					1
				);
				expect(
					state.sruReducer.editableConnections?.[0]?.input?.Name
				).to.equal(INPUT_A);
				expect(state.sruReducer.expandedSignals).to.include(INPUT_A);
			});
		});

		it('resets the Connections search and status filter so the target peripheral stays visible', () => {
			cy.wrap(null).then(() => {
				store.dispatch(
					setConnectionsFilter({
						searchText: 'unrelated search',
						statusFilter: 'modified'
					})
				);
			});

			cy.dataTest(`configure-${INPUT_A}`).click();

			cy.wrap(null).then(() => {
				expect(
					store.getState().sruReducer.connectionsFilter
				).to.deep.equal({searchText: '', statusFilter: 'all'});
			});
		});
	});
});

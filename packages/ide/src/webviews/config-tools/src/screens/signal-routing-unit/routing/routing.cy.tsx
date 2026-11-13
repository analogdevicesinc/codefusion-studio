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
import {setSruConnection} from '../../../state/slices/sru/sru.reducer';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {Routing} from './routing';
import l10n from '../../../../../../../l10n/bundle.l10n.en.json';

const adsp21834 = (await import('@socs/adsp-21834-bga_ed.json').then(
	m => m.default
)) as Soc;

(window as any).__webview_localization_resources__ = l10n;

// Both are SRU input signals from adsp-21834 with distinct name fragments.
const INPUT_A = 'SRC0_CLK_IP_I';
const INPUT_B = 'SRC0_CLK_OP_I';
const MODIFIED_SOURCE = 'TEST_MODIFIED_SOURCE';

let store: ReturnType<typeof configurePreloadedStore>;

function mountRouting() {
	store = configurePreloadedStore(adsp21834, {} as CfsConfig);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<Routing />
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

describe('Routing Filter', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		mountRouting();
	});

	describe('Search', () => {
		it('shows all rows by default', () => {
			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('contain', INPUT_B);
		});

		it('filters rows by signal name substring', () => {
			typeInSearch(INPUT_A);

			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('not.contain', INPUT_B);
		});

		it('search is case-insensitive', () => {
			typeInSearch(INPUT_A.toLowerCase());

			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('not.contain', INPUT_B);
		});

		it('shows only matching rows when searching for another signal', () => {
			typeInSearch(INPUT_B);

			cy.dataTest('routing-table').should('contain', INPUT_B);
			cy.dataTest('routing-table').should('not.contain', INPUT_A);
		});

		it('shows only the header row when no signal matches the search', () => {
			typeInSearch('ZZZNOMATCH');

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.should('have.length', 1);
		});

		it('restores all rows when search is cleared', () => {
			typeInSearch(INPUT_A);
			cy.dataTest('routing-table').should('not.contain', INPUT_B);

			clearSearch();

			cy.dataTest('routing-table').should('contain', INPUT_B);
		});
	});

	describe('Status Filter', () => {
		it('clicking the Modified chip shows only modified rows', () => {
			markModified(INPUT_A);

			cy.dataTest('filter-chip-modified').click();

			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('not.contain', INPUT_B);
		});

		it('clicking the Default chip shows only default rows', () => {
			markModified(INPUT_A);

			cy.dataTest('filter-chip-default').click();

			cy.dataTest('routing-table').should('contain', INPUT_B);
			cy.dataTest('routing-table').should('not.contain', INPUT_A);
		});

		it('clicking the All chip after filtering restores all rows', () => {
			markModified(INPUT_A);
			cy.dataTest('filter-chip-modified').click();
			cy.dataTest('routing-table').should('not.contain', INPUT_B);

			cy.dataTest('filter-chip-all').click();

			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('contain', INPUT_B);
		});
	});

	describe('Combined Search and Status Filter', () => {
		it('applies search and status filter simultaneously', () => {
			markModified(INPUT_A);
			markModified(INPUT_B);

			typeInSearch(INPUT_A);
			cy.dataTest('filter-chip-modified').click();

			cy.dataTest('routing-table').should('contain', INPUT_A);
			cy.dataTest('routing-table').should('not.contain', INPUT_B);
		});

		it('shows only the header row when combined filters match nothing', () => {
			markModified(INPUT_A);

			cy.dataTest('filter-chip-modified').click();

			typeInSearch(INPUT_B);

			cy.dataTest('routing-table')
				.find('[role="row"]')
				.should('have.length', 1);
		});
	});
});

describe('Routing Scroll', () => {
	beforeEach(() => {
		// The layout's height:100% chain only resolves against a sized
		// ancestor; component tests don't load the app's global
		// html/body height:100vh rule, so an explicit pixel height is
		// needed here to reproduce the constrained-viewport clipping
		// that the removed `.routing` overflow rule used to prevent.
		store = configurePreloadedStore(adsp21834, {} as CfsConfig);

		cy.mount(
			<div style={{height: '300px'}}>
				<LocalizationProvider namespace='cfgtools'>
					<Routing />
				</LocalizationProvider>
			</div>,
			store
		);
	});

	it('lets the routing table scroll instead of clipping rows', () => {
		cy.dataTest('routing-table').then(([table]) => {
			expect(table.scrollHeight).to.be.greaterThan(
				table.clientHeight
			);
		});
	});

	it('reveals rows below the fold by scrolling the routing table', () => {
		cy.dataTest('routing-table')
			.find('[role="row"]')
			.last()
			.should('not.be.visible');

		cy.dataTest('routing-table').scrollTo('bottom');

		cy.dataTest('routing-table').then(([table]) => {
			expect(table.scrollTop).to.be.greaterThan(0);
		});

		cy.dataTest('routing-table')
			.find('[role="row"]')
			.last()
			.should('be.visible');
	});
});

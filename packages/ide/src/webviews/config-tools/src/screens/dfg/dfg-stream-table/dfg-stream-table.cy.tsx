/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {configurePreloadedStore} from '../../../state/store';
import {Dfg} from '../DFG';
import {setActiveScreen} from '../../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../../../../common/constants/navigation';
import {
	addNewStream,
	type DFGStreamUI,
	setFilteredDestinations
} from '../../../state/slices/gaskets/gasket.reducer';
import CfgtoolsTopBar from '../../../components/cfgtools-header/CfgtoolsTopbar';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import styles from '../../../components/cfgtools-header/CfgtoolsTopbar.module.scss';
import type {WebviewApi} from 'vscode-webview';
import {mockVsCodeApi} from '../../../../../common/api';

let reduxStore: ReturnType<typeof configurePreloadedStore>;

/**
 * A utility function to create a stream directly using the reducer for testing filters.
 */
function createTestStream(streamParams: {
	source: string;
	destination: string;
	alias: string;
	sourceBufferSize?: number;
	destinationBufferSize?: number;
	group?: string;
}) {
	const {
		source,
		destination,
		alias,
		sourceBufferSize = 512,
		destinationBufferSize = 512,
		group = ''
	} = streamParams;

	const testStream: DFGStreamUI = {
		StreamId: 0, // Will be set by the reducer
		Description: alias,
		Source: {
			Gasket: source,
			Index: 0,
			BufferSize: sourceBufferSize,
			BufferAddress: 0x20000000
		},
		Destinations: [
			{
				Gasket: destination,
				Index: 0,
				BufferSize: destinationBufferSize,
				BufferAddress: 0x20001000
			}
		],
		Group: group,
		Uuid: `${Math.random()}-${Math.random()}`
	};

	reduxStore.dispatch(addNewStream(testStream));
}

function TestCfgtoolsTopBar() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<CfgtoolsTopBar />
			<div>
				<Dfg />
			</div>
		</LocalizationProvider>
	);
}

describe('DFG Stream Table', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);

		cy.fixture('dfgtest-dfg.json')
			.as('soc')
			.then(soc => {
				// Initialize the redux store globally for the test helper function
				reduxStore = configurePreloadedStore(soc, {} as CfsConfig);
				// Start with DFG screen, the component will set the initial subscreen
				reduxStore.dispatch(setActiveScreen(navigationItems.dfg));
				cy.mount(
					<Dfg
						initialActiveScreenSubscreen={
							navigationItems.dfgStreamList
						}
					/>,
					reduxStore
				);
				cy.dataTest('dfg-stream-list').should('exist');
			});
	});
	describe('DFG Navigation', () => {
		beforeEach(() => {
			cy.fixture('dfgtest-dfg.json').as('soc');
		});
		it('should navigate to the DFG Table screen and create a stream', function () {
			reduxStore = configurePreloadedStore(this.soc, {} as CfsConfig);
			reduxStore.dispatch(
				setActiveScreen(navigationItems.dfgVisualisation)
			);
			createTestStream({
				source: 'ASS',
				destination: 'BSS',
				alias: 'test-stream'
			});

			cy.mount(<TestCfgtoolsTopBar />, reduxStore);
			cy.get('[data-test="dfg-visualisation"]').should('be.visible');
			cy.get('[data-test="dfg-stream-list"]').should('not.exist');
			cy.get(
				`[data-test="subscreen-button:${navigationItems.dfgStreamList}"]`
			).should('not.have.class', styles.active);
			cy.get(
				`[data-test="subscreen-button:${navigationItems.dfgVisualisation}"]`
			).should('have.class', styles.active);
			cy.get(
				`[data-test="subscreen-button:${navigationItems.dfgStreamList}"]`
			).click();
			cy.get('[data-test="dfg-stream-list"]').should('be.visible');
			cy.get('[data-test="dfg-visualisation"]').should('not.exist');
			cy.get(
				`[data-test="subscreen-button:${navigationItems.dfgStreamList}"]`
			).should('have.class', styles.active);
			cy.get(
				`[data-test="subscreen-button:${navigationItems.dfgVisualisation}"]`
			).should('not.have.class', styles.active);

			cy.dataTest('stream-table-grid')
				.find('[role="row"]')
				.should('contain', 'ASS')
				.and('contain', 'BSS')
				.and('contain', 'test-stream');
		});
	});

	describe('DFG Stream Table Filter', () => {
		describe('Search Input Filter', () => {
			it('should filter streams by search query in description, case insensitive', () => {
				// Create test streams with different descriptions
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'Important Stream'
				});
				createTestStream({
					source: 'GSS',
					destination: 'FSS',
					alias: 'TestConnection'
				});

				// Test search functionality
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('important');

				// Should show filtered results
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'Important Stream')
					.and('not.contain', 'TestConnection');
			});

			it('should show minimum character warning for single character search', () => {
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('a');

				cy.dataTest('stream-table-grid')
					.find('[role="row"][data-row-type="default"]')
					.should('not.exist');

				cy.contains(
					'A minimum of two characters is required to start searching.'
				).should('exist');
			});

			it('should filter by source gasket name in search, case insensitive', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'noise-cancellation-stream'
				});
				createTestStream({
					source: 'GSS',
					destination: 'FSS',
					alias: 'some-information-stream'
				});

				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('ASS');

				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'ASS')
					.and('contain', 'noise-cancellation-stream')
					.and('not.contain', 'GSS')
					.and('not.contain', 'some-information-stream');
			});

			it('should filter by destination gasket name in search, case insensitive', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'another stream'
				});
				createTestStream({
					source: 'GSS',
					destination: 'ESS',
					alias: 'fft-stream'
				});

				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('BSS');

				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'BSS')
					.and('not.contain', 'ESS');
			});

			it('should filter by group name in search, case insensitive', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'nice stream',
					group: 'Noise Cancellation'
				});
				createTestStream({
					source: 'ESS',
					destination: 'BSS',
					alias: 'Awesome stream',
					group: 'Awesome Group'
				});

				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('noise');

				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'ASS')
					.and('contain', 'nice stream')
					.and('contain', 'Noise Cancellation')
					.and('not.contain', 'Awesome stream')
					.and('not.contain', 'ESS');
			});
		});

		describe('Source Filter', () => {
			it('should filter streams by source gasket', () => {
				// Create streams with different sources
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'ASS-to-BSS'
				});
				createTestStream({
					source: 'GSS',
					destination: 'FSS',
					alias: 'GSS-to-FSS'
				});

				// Open source filter dropdown
				cy.dataTest('dfg-source-filter').find('button').click();

				// Select ASS source
				cy.dataTest('multiselect-option-ASS').click();

				// Close dropdown
				cy.get('body').click(0, 0);

				// Verify only ASS streams are shown
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'ASS')
					.and('not.contain', 'GSS');

				// Check chip shows count
				cy.dataTest('dfg-source-filter').should('contain', '1');
			});

			it('should allow multiple source selections', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'ASS-stream'
				});
				createTestStream({
					source: 'GSS',
					destination: 'FSS',
					alias: 'GSS-stream'
				});
				createTestStream({
					source: 'ESS',
					destination: 'DSS',
					alias: 'ess-stream'
				});

				// Open source filter and select multiple options
				cy.dataTest('dfg-source-filter').find('button').click();

				cy.dataTest('multiselect-option-ASS').click();
				cy.dataTest('multiselect-option-GSS').click();

				cy.get('body').click(0, 0);

				// Should show both ASS and GSS streams
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'ASS')
					.and('contain', 'GSS')
					.and('not.contain', 'ESS');

				// Check chip shows count of 2
				cy.dataTest('dfg-source-filter').should('contain', '2');
			});
		});

		describe('Destination Filter', () => {
			it('should filter streams by destination gasket', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'to-BSS'
				});
				createTestStream({
					source: 'GSS',
					destination: 'FSS',
					alias: 'to-FSS'
				});

				// Open destination filter dropdown
				cy.dataTest('dfg-destination-filter').find('button').click();

				// Select BSS destination
				cy.dataTest('multiselect-option-BSS').click();

				cy.get('body').click(0, 0);

				// Verify only BSS streams are shown
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'BSS')
					.and('not.contain', 'FSS');
			});
		});

		describe('Group Filter', () => {
			it('should handle streams with no group assigned', () => {
				// First create a stream with a group to have at least one group
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'grouped-stream',
					group: 'test-group'
				});

				// Create a stream (which typically won't have a group initially)
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'ungrouped-stream'
				});

				// Open group filter dropdown
				cy.dataTest('dfg-group-filter').find('button').click();

				// Should show "No group assigned" option
				cy.dataTest('multiselect-option-nogroup')
					.should('exist')
					.click();

				cy.get('body').click(0, 0);

				// Should show the ungrouped stream
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'ungrouped-stream');
			});
		});

		describe('Clear All Filters', () => {
			it('should clear all active filters when clicked', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'test-stream'
				});

				// Apply search filter
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('test');

				// Apply source filter
				cy.dataTest('dfg-source-filter').find('button').click();
				cy.dataTest('multiselect-option-ASS').click();
				cy.get('body').click(0, 0);

				// Verify filters are applied
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.should('have.value', 'test');
				cy.dataTest('dfg-source-filter').should('contain', '1');

				// Click clear all filters
				cy.dataTest('dfg-clear-all-filters').click();

				// Verify all filters are cleared
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.should('have.value', '');
				cy.dataTest('dfg-source-filter').should('not.contain', '0');
			});
		});

		describe('Combined Filters', () => {
			it('should apply multiple filters simultaneously', () => {
				// Create multiple test streams
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'important-ASS-stream'
				});
				createTestStream({
					source: 'ASS',
					destination: 'FSS',
					alias: 'ASS-FSS-stream'
				});
				createTestStream({
					source: 'GSS',
					destination: 'BSS',
					alias: 'important-GSS-stream'
				});

				// Apply search filter
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('important');

				// Apply source filter
				cy.dataTest('dfg-source-filter').find('button').click();
				cy.dataTest('multiselect-option-ASS').click();
				cy.get('body').click(0, 0);

				// Should only show streams matching both criteria
				cy.dataTest('stream-table-grid')
					.find('[role="row"]')
					.should('contain', 'important-ASS-stream')
					.and('not.contain', 'ASS-FSS-stream')
					.and('not.contain', 'important-GSS-stream');
			});

			it('should show "no streams found" message when filters return no results', () => {
				createTestStream({
					source: 'ASS',
					destination: 'BSS',
					alias: 'test-stream'
				});

				// Apply filters that won't match any streams
				cy.dataTest('dfg-search-input-control-input')
					.shadow()
					.find('input')
					.type('nonexistent');

				cy.contains(
					'No streams found matching the current filters.'
				).should('exist');
			});
		});
	});
	describe('Export CSV', () => {
		it('should export the stream table as CSV', () => {
			let csvData: Promise<{csvContent: string}> | undefined;
			const mockApi: WebviewApi<any> = {
				postMessage(msgObj: {id: number; type: string; body: any}) {
					if (msgObj.type === 'export-csv') {
						csvData = Promise.resolve(msgObj.body);
					}

					return undefined;
				},
				getState() {
					return undefined;
				},
				setState(newState: any) {
					return newState;
				}
			};
			mockVsCodeApi(mockApi);
			createTestStream({
				source: 'ASS',
				destination: 'BSS',
				sourceBufferSize: 128,
				destinationBufferSize: 128,
				alias: 'test-stream'
			});
			createTestStream({
				source: 'GSS',
				destination: 'BSS',
				sourceBufferSize: 128,
				destinationBufferSize: 128,
				alias: 'GSS to BSS'
			});
			createTestStream({
				source: 'ASS',
				destination: 'GSS',
				sourceBufferSize: 128,
				destinationBufferSize: 128,
				alias: 'another stream'
			});

			cy.dataTest('export-as-csv')
				.click()
				.then(() => {
					cy.dataTest('stream-table-grid').should('exist');
					cy.then(async () => csvData)
						.should('not.be.undefined')
						.then(csv => {
							if (!csv) {
								throw new Error('CSV data is undefined');
							}

							const csvRows = csv.csvContent.split('\n');
							cy.wrap(csvRows[0]).should(
								'contain',
								'ID,Source,Destination,Source Index,Destination Index,Description,Group,Source Buffer Address,Destination Buffer Address,Source Buffer Size,Destination Buffer Size'
							);
							cy.wrap(csvRows[1]).should(
								'contain',
								'1,"ASS","BSS",0,0,"test-stream","",0x00000000,0x00000000,128B,128B'
							);
							cy.wrap(csvRows[2]).should(
								'contain',
								'161,"GSS","BSS",0,1,"GSS to BSS","",0x00000000,0x00000080,128B,128B'
							);
							cy.wrap(csvRows[3]).should(
								'contain',
								'2,"ASS","GSS",1,0,"another stream","",0x00000080,0x00000000,128B,128B'
							);
						});
				})
				.then(() => {
					cy.wrap(
						reduxStore.dispatch(setFilteredDestinations(['BSS']))
					);
				})
				.then(() => {
					cy.dataTest('export-as-csv').click();
				})
				.then(() => {
					cy.dataTest('stream-table-grid').should('exist');
					cy.then(async () => csvData)
						.should('not.be.undefined')
						.then(csv => {
							if (!csv) {
								throw new Error('CSV data is undefined');
							}

							const csvRows = csv.csvContent.split('\n');
							cy.wrap(csvRows).should('have.length', 3);
							cy.wrap(csvRows[0]).should(
								'contain',
								'ID,Source,Destination,Source Index,Destination Index,Description,Group,Source Buffer Address,Destination Buffer Address,Source Buffer Size,Destination Buffer Size'
							);
							cy.wrap(csvRows[1]).should(
								'contain',
								'1,"ASS","BSS",0,0,"test-stream","",0x00000000,0x00000000,128B,128B'
							);
							cy.wrap(csvRows[2]).should(
								'contain',
								'161,"GSS","BSS",0,1,"GSS to BSS","",0x00000000,0x00000080,128B,128B'
							);
						});
				});
		});
	});
});

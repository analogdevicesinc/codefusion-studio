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

import {type CfsConfig} from 'cfs-types';
import {configurePreloadedStore} from '../../../state/store';
import {Dfg} from '../DFG';
import {DfgStreamTable} from '../dfg-stream-table/dfg-stream-table';

import {createStreamAddEvent} from '../stream-property-calculation.cy';

/**
 * A Utility function to create a stream with the given parameters.
 * @param source - The source gasket name.
 * @param destination - The destination gasket name.
 * @param alias - The alias/description for the stream.
 * @param sourceBufferSize - The buffer size for the source gasket. Use undefined if the source gasket has a fixed buffer size.
 * @param destinationsBufferSizes - The buffer size for the destination gasket. Use undefined if the destination gasket has a fixed buffer size.
 * @param customAssertions - A function to run custom assertions after the stream is created.
 */
function createStream(
	cy: Cypress.Chainable,
	streamParams: {
		source: string;
		destinations: string[];
		alias: string;
		sourceBufferSize?: number;
		destinationsBufferSizes: Array<number | undefined>;
	},
	customAssertions?: () => void
) {
	const {
		source,
		destinations,
		alias,
		sourceBufferSize,
		destinationsBufferSizes
	} = streamParams;

	cy.get('#create-stream-button').scrollIntoView().click();

	cy.get('[data-test="stream-source"]').click({force: true});

	cy.get(`#stream-source_${source}`)
		.scrollIntoView()
		.should('exist')
		.click({force: true});

	cy.get('[data-test="stream-destination"]')
		.should('exist')
		.children()
		.eq(0)
		.click({force: true});

	for (const destination of destinations) {
		cy.get(`[data-test="multiselect-option-${destination}"]`)
			.scrollIntoView()
			.should('exist')
			.click();
	}

	// Close the multiselect
	cy.get('[data-test="stream-destination"]')
		.should('exist')
		.children()
		.eq(0)
		.click({force: true});

	cy.get('[data-test="stream-alias-control-input"]')
		.shadow()
		.within(() => {
			cy.get('#control').type(alias);
		});

	if (sourceBufferSize) {
		cy.get('[data-test="Source-buffer-size-selector"]')
			.should('be.enabled')
			.should('not.be.disabled')
			.wait(100) // Wait for element to be fully ready
			.click({force: true})
			.find(`[data-value]`) // Wait for any options to be available
			.should('have.length.greaterThan', 0) // Ensure options are loaded
			.then(() => {
				cy.get('[data-test="Source-buffer-size-selector"]')
					.find(`[data-value="${sourceBufferSize}"]`)
					.should('exist') // Ensure the specific option exists
					.scrollIntoView()
					.click({force: true}); // Use force for clipped elements
			});
	}

	for (const [i, destination] of destinations.entries()) {
		if (destinationsBufferSizes[i]) {
			cy.get(
				`[data-test="${destination}-Destinations-buffer-size-selector"]`
			)
				.should('be.enabled')
				.should('not.be.disabled')
				.wait(100) // Wait for element to be fully ready
				.click({force: true})
				.find(`[data-value]`) // Wait for any options to be available
				.should('have.length.greaterThan', 0) // Ensure options are loaded
				.then(() => {
					cy.get(
						`[data-test="${destination}-Destinations-buffer-size-selector"]`
					)
						.find(`[data-value="${destinationsBufferSizes[i]}"]`)
						.should('exist') // Ensure the specific option exists
						.scrollIntoView()
						.click({force: true}); // Use force for clipped elements
				});
		}
	}

	cy.get('#sidepanel-create-stream').should('exist').click();

	// Wait for stream creation to complete
	cy.wait(150);

	if (customAssertions) {
		customAssertions();
	}
}

describe('Multi-Cast Feature tests', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);

		cy.fixture('dfgtest-dfg.json').as('soc');

		cy.clearLocalStorage().then(() => {
			localStorage.setItem(
				'DFGConfig',
				JSON.stringify({
					Soc: 'DFGTEST',
					BoardName: '',
					Package: 'WLP',
					projects: [
						{
							Description: 'DFG Project',
							FirmwarePlatform: 'zephyr',
							Name: 'DFG Project',
							PluginId: '',
							ProjectId: 'DFG-proj'
						}
					]
				})
			);
		});

		// Scroll to top to ensure consistent starting position for each test
		cy.scrollTo('top', {ensureScrollable: false});
	});

	it('Can create multi-cast streams, with proper display in accordions', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore)
			.then(() => {
				// Create first multicast stream manually, to test that the feature works through the UI
				createStream(cy, {
					source: 'ASS',
					destinations: ['BSS', 'DSS', 'ESS'],
					alias: 'stream #1',
					sourceBufferSize: 64,
					destinationsBufferSizes: [32, 32, undefined]
				});
			})
			.then(() => {
				createStream(cy, {
					source: 'BSS',
					destinations: ['ASS', 'DSS', 'GSS'],
					alias: 'stream #2',
					sourceBufferSize: 512,
					destinationsBufferSizes: [128, 128, 1024]
				});
			})
			.then(() => {
				createStream(cy, {
					source: 'FSS',
					destinations: ['ASS', 'BSS', 'DSS', 'GSS'],
					alias: 'stream #3',
					sourceBufferSize: 16384,
					destinationsBufferSizes: [8192, 512, 64, 2048]
				});
			})
			.then(() => {
				createStream(cy, {
					source: 'ASS',
					destinations: ['ASS'],
					alias: 'stream #4',
					sourceBufferSize: 2048,
					destinationsBufferSizes: [4096]
				});
			})
			.wrap({getState: () => reduxStore.getState()})
			.invoke('getState')
			.then(state => {
				const streams = state.gasketsReducer.Streams;
				cy.wrap(streams).should('have.length', 4);

				for (const [i, stream] of streams.entries()) {
					cy.wrap(stream.Description).should(
						'equal',
						`stream #${i + 1}`
					);
				}
			})
			.then(() => {
				// Verify accordion bubble displays correct number of streams
				cy.get('[data-test="inbound-streams-ASS"]').should(
					'contain',
					'3'
				);
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'2'
				);

				cy.get('[data-test="inbound-streams-BSS"]').should(
					'contain',
					'2'
				);
				cy.get('[data-test="outbound-streams-BSS"]').should(
					'contain',
					'1'
				);

				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'3'
				);
				cy.get('[data-test="outbound-streams-DSS"]').should(
					'contain',
					'0'
				);

				cy.get('[data-test="inbound-streams-ESS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-ESS"]').should(
					'contain',
					'0'
				);

				cy.get('[data-test="inbound-streams-FSS"]').should(
					'contain',
					'0'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'1'
				);

				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'2'
				);
				cy.get('[data-test="outbound-streams-GSS"]').should(
					'contain',
					'0'
				);
			})
			.then(() => {
				// Check ASS Streams
				cy.get('[data-test="accordion:ASS"]').click();
			})
			.wrap({
				getState: () => reduxStore.getState()
			})
			.invoke('getState')
			.then(state => {
				const inputs = state.gasketsReducer.GasketInputStreamMap;
				const outputs = state.gasketsReducer.GasketOutputStreamMap;

				for (const gasket of Object.keys(inputs)) {
					cy.log(`Checking ${gasket} streams`);
					cy.get(`[data-test="accordion:${gasket}"]`).click();

					if (inputs[gasket]?.length && inputs[gasket].length > 0) {
						for (const input of inputs[gasket]) {
							cy.get(
								`[data-test="stream-inbound-${input.StreamId}"]`
							).should('exist');
						}
					} else {
						// Only FSS should have no inbound streams
						cy.wrap(gasket).should('equal', 'FSS');
					}

					if (outputs[gasket]?.length && outputs[gasket].length > 0) {
						for (const output of outputs[gasket]) {
							cy.get(
								`[data-test="stream-outbound-${output.StreamId}"]`
							).should('exist');
						}
					}

					cy.log(`Closing ${gasket} accordion`);

					// Must click on the header of the accordion to close it, otherwise it clicks in the middle
					cy.get(`[data-test="accordion:${gasket}"]`)
						.children()
						.first()
						.click();
				}
			});
	});

	it('Can delete a multi-cast stream', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore)
			.then(() => {
				cy.wrap(
					reduxStore.dispatch(
						createStreamAddEvent(
							's1',
							'ASS',
							['BSS', 'DSS', 'ESS'],
							64,
							[32, 32, 4096]
						)
					)
				)
					.wrap(
						reduxStore.dispatch(
							createStreamAddEvent(
								's2',
								'BSS',
								['ASS', 'DSS', 'GSS'],
								512,
								[128, 128, 1024]
							)
						)
					)
					.wrap(
						reduxStore.dispatch(
							createStreamAddEvent(
								's3',
								'FSS',
								['ASS', 'BSS', 'DSS', 'GSS'],
								16384,
								[8192, 512, 64, 2048]
							)
						)
					)
					.wrap(
						reduxStore.dispatch(
							createStreamAddEvent('s4', 'ASS', ['ASS'], 2048, [4096])
						)
					);
			})
			.then(() => {
				// We want to delete stream #2, exiting from BSS:
				// Click the BSS accordion
				cy.get('[data-test="accordion:BSS"]').click();

				// That stream ID should be 225
				cy.get('[data-test="stream-outbound-225"]')
					.children()
					.eq(3)
					.click();

				// Delete the stream
				cy.get('[data-test="delete-stream-button"]').click();

				// Confirm the deletion
				cy.get('[data-test="confirm-delete-stream"]').click();
			})
			.wrap({getState: () => reduxStore.getState()})
			.invoke('getState')
			.then(state => {
				// Check for updated values
				const streams = state.gasketsReducer.Streams;
				cy.wrap(streams).should('have.length', 3);

				const newStreamDescriptions = ['s1', 's3', 's4'];

				for (const [i, stream] of streams.entries()) {
					cy.wrap(stream.Description).should(
						'equal',
						newStreamDescriptions[i]
					);
				}
			})
			.then(() => {
				// Verify accordion bubble displays correct number of streams
				cy.get('[data-test="inbound-streams-ASS"]').should(
					'contain',
					'2'
				);
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'2'
				);

				cy.get('[data-test="inbound-streams-BSS"]').should(
					'contain',
					'2'
				);
				cy.get('[data-test="outbound-streams-BSS"]').should(
					'contain',
					'0'
				);

				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'2'
				);
				cy.get('[data-test="outbound-streams-DSS"]').should(
					'contain',
					'0'
				);

				cy.get('[data-test="inbound-streams-ESS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-ESS"]').should(
					'contain',
					'0'
				);

				cy.get('[data-test="inbound-streams-FSS"]').should(
					'contain',
					'0'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'1'
				);

				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-GSS"]').should(
					'contain',
					'0'
				);
			});
	});

	it('Should display multicast streams properly in the table view', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<DfgStreamTable />, reduxStore)
			.wrap(
				reduxStore.dispatch(
					createStreamAddEvent(
						's1',
						'ASS',
						['BSS', 'DSS', 'ESS'],
						64,
						[32, 32, 4096]
					)
				)
			)
			.wrap(
				reduxStore.dispatch(
					createStreamAddEvent(
						's2',
						'BSS',
						['ASS', 'DSS', 'GSS'],
						512,
						[128, 128, 1024]
					)
				)
			)
			.wrap(
				reduxStore.dispatch(
					createStreamAddEvent(
						's3',
						'FSS',
						['ASS', 'BSS', 'DSS', 'GSS'],
						512,
						[8192, 512, 64, 2048]
					)
				)
			)
			.wrap(
				reduxStore.dispatch(
					createStreamAddEvent('s4', 'ASS', ['ASS'], 2048, [4096])
				)
			)
			.wrap({getState: () => reduxStore.getState()})
			.invoke('getState')
			.then(state => {
				const streams = state.gasketsReducer.Streams;
				cy.wrap(streams).should('have.length', 4);

				const expectedKeys = streams.flatMap(stream =>
					stream.Destinations.map(
						dest => `${stream.StreamId}-${dest.Gasket}`
					)
				);

				for (const key of expectedKeys) {
					cy.get(`[data-test="stream-table-row-${key}"]`).should(
						'exist'
					);
				}
			});
	});
});

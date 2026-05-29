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
import {assert} from 'chai';
import {configurePreloadedStore} from '../../state/store';
import {Dfg} from './DFG';
import {
	addNewStream,
	updateGasketOptions
} from '../../state/slices/gaskets/gasket.reducer';
import RegisterBody from '../registers/body/RegisterBody';
import {setActiveScreenSubscreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../../../common/constants/navigation';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';

/**
 * A Utility function to create a stream with the given parameters.
 * @param source - The source gasket name.
 * @param destination - The destination gasket name.
 * @param alias - The alias/description for the stream.
 * @param sourceBufferSize - The buffer size for the source gasket. Use undefined if the source gasket has a fixed buffer size.
 * @param destinationBufferSize - The buffer size for the destination gasket. Use undefined if the destination gasket has a fixed buffer size.
 * @param customAssertions - A function to run custom assertions after the stream is created.
 */
function createStream(
	cy: Cypress.Chainable,
	streamParams: {
		source: string;
		destination: string;
		alias: string;
		sourceBufferSize?: number;
		destinationBufferSize?: number;
	},
	customAssertions?: () => void
) {
	const {
		source,
		destination,
		alias,
		sourceBufferSize,
		destinationBufferSize
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

	cy.get(`[data-test="multiselect-option-${destination}"]`)
		.scrollIntoView()
		.should('exist')
		.click();

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
			.should('have.length.greaterThan', 0); // Ensure options are loaded

		cy.get('[data-test="Source-buffer-size-selector"]')
			.find(`[data-value="${sourceBufferSize}"]`)
			.should('exist') // Ensure the specific option exists
			.scrollIntoView()
			.click({force: true}); // Use force for clipped elements
	}

	if (destinationBufferSize) {
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
					.find(`[data-value="${destinationBufferSize}"]`)
					.should('exist') // Ensure the specific option exists
					.scrollIntoView()
					.click({force: true}); // Use force for clipped elements
			});
	}

	cy.get('#sidepanel-create-stream').should('exist').click();

	// Wait for stream creation to complete
	cy.wait(150);

	if (customAssertions) {
		customAssertions();
	}
}

// Flaky test causing CI failures - to be investigated
describe('DFG Configuration Screen', () => {
	beforeEach(() => {
		(window as any).__webview_localization_resources__ = {
			cfgtools: {
				dfg: {
					deleteConfirmation: {
						deleteButton: 'Delete',
						cancelButton: 'Cancel',
						title: 'Are you sure you want to delete this stream?',
						errorTitle: 'Error: Cannot delete stream',
						tiedErrorMessage:
							'Another stream is tied to the stream you are trying to delete. Please remove the tied stream before deleting this stream.'
					},
					streamConfigSidePanel: {
						'Select Destination DFG': 'Select Destination DFG',
						validationErrors: {
							sourceGasketRequired: 'Source gasket is required',
							sourceBufferSizeRequired:
								'Source buffer size is required',
							sourceTiedStreamRequired:
								'The corresponding input stream must be selected for this gasket. Please create it first if necessary.',
							destinationGasketRequired:
								'At least one destination gasket is required',
							destinationBufferSizeRequired:
								'Destination buffer size is required',
							destinationBufferSizeRequired_01:
								'Destination {destinationIndex} buffer size is required'
						}
					}
				}
			}
		};

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

	it('should render DFG configuration screen with sidebar containing gaskets', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore);

		const ASSGasket = cy.get('[data-test="accordion:ASS"]');
		ASSGasket.should('exist');

		ASSGasket.find('[class*="inOutBubble"]')
			.contains('0')
			.should('exist');
	});

	it('create stream works', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore);

		createStream(
			cy,
			{
				source: 'GSS',
				destination: 'ASS',
				alias: 'GSS_TO_ASS',
				sourceBufferSize: 32,
				destinationBufferSize: 512
			},
			() => {
				cy.get('[data-test="accordion:GSS"]').should('exist');

				// Wait for UI to update and ensure elements exist before asserting visibility
				cy.get('[data-test="accordion:ASS"]').should('exist');
				cy.get('[data-test="accordion:GSS"]').should('exist');

				// Wait for stream elements to be created and rendered
				cy.get('[data-test="inbound-streams-ASS"]', {timeout: 10000})
					.should('exist')
					.and('contain', '1');
				cy.get('[data-test="outbound-streams-ASS"]', {timeout: 10000})
					.should('exist')
					.and('contain', '0');
				cy.get('[data-test="inbound-streams-GSS"]', {timeout: 10000})
					.should('exist')
					.and('contain', '0');
				cy.get('[data-test="outbound-streams-GSS"]', {timeout: 10000})
					.should('exist')
					.and('contain', '1');

				const getStreamId = () => {
					const streamID = reduxStore
						.getState()
						.gasketsReducer.Streams.find(
							s => s.Description === 'GSS_TO_ASS'
						)?.StreamId;

					return streamID;
				};

				cy.wrap(null)
					.should(() => {
						const streamID = getStreamId();
						assert.exists(streamID, 'Stream ID should exist');
					})
					.then(() => getStreamId())
					.then(streamID => {
						cy.get('[data-test="accordion:ASS"]').click();
						cy.get(`[data-test="stream-inbound-${streamID}"]`)
							.should('exist')
							.find('h5')
							.should('have.text', 'GSS');
						cy.get(`[data-test="stream-inbound-${streamID}"]`)
							.find('span')
							.should('have.text', 'GSS_TO_ASS');

						cy.get('[data-test="accordion:GSS"]').click();
						cy.get(`[data-test="stream-outbound-${streamID}"]`)
							.should('exist')
							.find('h5')
							.should('have.text', 'ASS');
						cy.get(`[data-test="stream-outbound-${streamID}"]`)
							.find('span')
							.should('have.text', 'GSS_TO_ASS');
					});
			}
		);
	});

	it.skip('should show modified registers', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<RegisterBody />, reduxStore)
			.then(() => {
				cy.wrap(
					reduxStore.dispatch(
						addNewStream({
							StreamId: 28,
							Description: 'GSS_TO_ASS',
							Source: {
								Gasket: 'GSS',
								Index: 0,
								BufferSize: 32,
								BufferAddress: 0
							},
							Destinations: [
								{
									Gasket: 'ASS',
									Index: 0,
									BufferSize: 512,
									BufferAddress: 0
								}
							],
							Group: '',
							Uuid: `${Math.random()}-${Math.random()}`
						})
					)
				);
			})
			.then(() => {
				// Verify the 'Modified' chip is enabled and contains the correct count
				// Should contain: buffer end address for both source and destination of first stream (buffer start remains zero, so not modified)
				//                 buffer start addresses are zero so are unchanged
				//                 stream index for both source and destination
				//                 destination gasket ID in source registers
				cy.get('[data-test="Modified"]')
					.should('exist')
					.should('not.be.disabled')
					.and('contain.text', '5');
			})
			.then(() => {
				// Create another stream
				cy.wrap(
					reduxStore.dispatch(
						addNewStream({
							StreamId: 29,
							Description: 'GSS_TO_ASS_2',
							Source: {
								Gasket: 'GSS',
								Index: 1,
								BufferSize: 32,
								BufferAddress: 32
							},
							Destinations: [
								{
									Gasket: 'ASS',
									Index: 1,
									BufferSize: 512,
									BufferAddress: 512,
									Config: {
										PRIORITY: '2'
									}
								}
							],
							Group: '',
							Uuid: `${Math.random()}-${Math.random()}`
						})
					)
				);
			})
			.then(() => {
				// Verify the 'Modified' chip is enabled and contains the correct count
				// Should contain: buffer end address for both source and destination of first stream (buffer start remains zero, so not modified)
				//                 buffer start and end addresses for both source and destination of second stream
				//                 stream index for both source and destination
				//                 destination gasket ID in source registers
				//                 destination stream priority
				cy.get('[data-test="Modified"]')
					.should('exist')
					.should('not.be.disabled')
					.and('contain.text', '13');
			})
			.then(() => {
				cy.wrap(
					// Configure a gasket
					reduxStore.dispatch(
						updateGasketOptions({
							Name: 'ASS',
							Config: {
								STREAM_PRIO_DISABLE: 'TRUE'
							}
						})
					)
				);
			})
			.then(() => {
				// Verify the 'Modified' chip is enabled and contains the correct count
				// Should contain: all the above, plus a gasket control register
				cy.get('[data-test="Modified"]')
					.should('exist')
					.should('not.be.disabled')
					.and('contain.text', '14');
			});
	});

	it('Tests buffersize dropdown', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore);

		type GasketName = 'ASS' | 'BSS' | 'DSS' | 'ESS' | 'FSS' | 'GSS';
		/**
		 * Expected buffer sizes for each gasket, in terms of min/max buffer sizes
		 * If min == max, then the gasket has a fixed buffer size
		 */
		const expectedSourceBufferSizes: Record<
			GasketName,
			[number, number]
		> = {
			ASS: [32, 2048],
			BSS: [32, 1024],
			DSS: [32, 16384],
			ESS: [128, 128],
			FSS: [32, 16384],
			GSS: [32, 2048]
		};

		/**
		 * Same as above, but for destination gaskets
		 */
		const expecteBSSstinationBufferSizes: Record<
			GasketName,
			[number, number]
		> = {
			ASS: [32, 8192],
			BSS: [32, 1024],
			DSS: [32, 32768],
			ESS: [4096, 4096],
			FSS: [32, 32768],
			GSS: [32, 2048]
		};

		// Helper function to validate buffer sizes
		const validateBufferSizes =
			(expectedSizes: [number, number]) => (els: JQuery) => {
				// We expect the very first value to NOT be empty, as it should default to the first buffer size
				cy.wrap(els[0]).should(
					'have.text',
					expectedSizes[0].toString()
				);

				const values = Array.from(els).map(el =>
					parseInt(el.getAttribute('data-value') ?? '0', 10)
				);
				cy.wait(30);
				// We expect the values to be sorted
				const sortedValues = values.sort((a, b) => a - b);

				cy.wrap(sortedValues).should('deep.equal', values);

				// We expect the first value to be the minimum buffer size
				cy.wrap(sortedValues[0]).should('equal', expectedSizes[0]);

				// We expect the last value to be the maximum buffer size
				cy.wrap(sortedValues[sortedValues.length - 1]).should(
					'equal',
					expectedSizes[1]
				);

				// Check that each value is a power of 2
				values.forEach(v => {
					// eslint-disable-next-line no-bitwise
					const isPowerOf2 = v > 0 && (v & (v - 1)) === 0;
					cy.wrap(isPowerOf2).should('be.true');
				});

				// Check that all values are unique
				const uniqueValues = new Set(values);
				cy.wrap(uniqueValues.size).should('equal', values.length);
			};

		// 1. Click the create stream button!

		cy.get('#create-stream-button').click();

		for (const gasketName of Object.keys(
			expectedSourceBufferSizes
		) as GasketName[]) {
			cy.get('[data-test="stream-source"]')
				.should('exist')
				.click({force: true});
			cy.get(`#stream-source_${gasketName}`)
				.should('exist')
				.click({force: true});
			cy.get('[data-test="stream-destination"]')
				.should('exist')
				.children()
				.eq(0)
				.click({force: true});
			cy.get(`[data-test="multiselect-option-${gasketName}"]`)
				.should('exist')
				.click({
					force: true
				});

			// Check if we have a fixed buffer size
			if (
				expectedSourceBufferSizes[gasketName][0] ===
				expectedSourceBufferSizes[gasketName][1]
			) {
				// We expect the source option to be disabled
				cy.get('[data-test="Source-buffer-size-selector"]')
					.should('exist')
					.and('be.disabled');
			} else {
				cy.get('[data-test="Source-buffer-size-selector"]')
					.click({force: true})
					.find(`[data-value]`)
					.then(
						validateBufferSizes(
							expectedSourceBufferSizes[gasketName] as [
								number,
								number
							]
						)
					);
			}

			// Check if we have a fixed buffer size
			if (
				expecteBSSstinationBufferSizes[gasketName][0] ===
				expecteBSSstinationBufferSizes[gasketName][1]
			) {
				// We expect the destination option to be disabled
				cy.get(
					`[data-test="${gasketName}-Destinations-buffer-size-selector"]`
				)
					.should('exist')
					.and('be.disabled');
			} else {
				cy.get(
					`[data-test="${gasketName}-Destinations-buffer-size-selector"]`
				)
					.click({force: true})
					.find(`[data-value]`)
					.then(
						validateBufferSizes(
							expecteBSSstinationBufferSizes[gasketName] as [
								number,
								number
							]
						)
					);
			}
		}
	});

	it('sidepanel errors and button persists', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<div>
					<Dfg />
				</div>
			</LocalizationProvider>,
			reduxStore
		);

		createStream(
			cy,
			{
				source: 'ESS',
				destination: 'ASS',
				alias: 'ESS_TO_ASS',
				destinationBufferSize: 512
			},
			() => {
				cy.get('[data-test="accordion:ESS"]').should('exist');

				// Wait for UI to update and ensure elements exist before asserting visibility
				cy.get('[data-test="accordion:ASS"]').should('exist');
				cy.get('[data-test="accordion:ESS"]').should('exist');

				// Wait for stream elements to be created and rendered
				cy.get('[data-test="source-stream-error"]', {
					timeout: 10000
				})
					.should('exist')
					.and(
						'contain',
						'The corresponding input stream must be selected for this gasket. Please create it first if necessary.'
					);

				cy.wrap('anything').then(() => {
					reduxStore.dispatch(
						setActiveScreenSubscreen(navigationItems.dfgStreamList)
					);

					// The error is still present
					cy.get('[data-test="source-stream-error"]', {
						timeout: 10000
					})
						.should('exist')
						.and(
							'contain',
							'The corresponding input stream must be selected for this gasket. Please create it first if necessary.'
						);

					// The button is still enabled
					cy.get('[id="sidepanel-create-stream"]', {
						timeout: 10000
					}).should('be.enabled');
				});
			}
		);
	});
});

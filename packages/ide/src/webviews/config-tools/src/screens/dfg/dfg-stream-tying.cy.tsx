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

import {Dfg} from './DFG';
import type {CfsConfig} from 'cfs-lib';
import {configurePreloadedStore} from '../../state/store';
import {addNewStream} from '../../state/slices/gaskets/gasket.reducer';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';

const ESSStartID = 129;
const ASSStartID = 1;

function TestCfgtoolsTopBar() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<div>
				<Dfg />
			</div>
		</LocalizationProvider>
	);
}

describe('DFG Stream Tying Feature', () => {
	beforeEach(() => {
		(window as any).__webview_localization_resources__ = {
			cfgtools: {
				dfg: {
					title: 'DFG',
					description:
						'<p>This screen allows you to view the Data Flow Gaskets.</p>',
					help: {
						title: 'Data Flow Gaskets Help'
					},
					createStream: 'Create Stream',
					deleteConfirmation: {
						deleteButton: 'Delete',
						cancelButton: 'Cancel',
						title: 'Are you sure you want to delete this stream?',
						errorTitle: 'Error: Cannot delete stream',
						tiedErrorMessage:
							'Another stream is tied to the stream you are trying to delete. Please remove the tied stream before deleting this stream.'
					},
					noGasketPluginSettings:
						'No settings found for this gasket.',
					streamConfigSidePanel: {
						selectDestinationDFG: 'Select Destination DFG',
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

	it('should sort and display tied streams correctly', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<TestCfgtoolsTopBar />, reduxStore).then(() => {
			cy.wrap(reduxStore.dispatch(createTestInputStreamAddEvent(0)))
				.wrap(reduxStore.dispatch(createTestInputStreamAddEvent(1)))
				.wrap(reduxStore.dispatch(createTestInputStreamAddEvent(2)))
				// Stream to check it's not displayed in the select tied streams list
				.wrap(
					reduxStore.dispatch(
						createTestInputStreamAddEvent(0, 'FSS', 97)
					)
				);
			cy.dataTest('gasket-input-physical-connection-4').should(
				'exist'
			);

			// Create first tied stream
			createESSOutputStream(1);
			cy.wrap(StreamFinder)
				.invoke('getStream', reduxStore, ESSStartID)
				.should('not.be.undefined')
				.should(stream => {
					expect(stream).to.have.property('StreamId', ESSStartID);
					expect(stream).to.have.nested.property('Source.Index', 0);
				});

			createESSOutputStream(3, [1]);
			cy.wrap(StreamFinder)
				// + 2 since it's tied to the 3rd input stream (index 2)
				.invoke('getStream', reduxStore, ESSStartID + 2)
				.should('not.be.undefined')
				.should(stream => {
					expect(stream).to.have.property('StreamId', ESSStartID + 2);
					expect(stream).to.have.nested.property('Source.Index', 2);
				});
		});
	});
});

const StreamFinder = {
	getStream(
		reduxStore: ReturnType<typeof configurePreloadedStore>,
		streamId: number
	) {
		return reduxStore
			.getState()
			.gasketsReducer.Streams.find(
				stream => stream.StreamId === streamId
			);
	}
};

function createESSOutputStream(
	tiedStreamId: number,
	checkDisabledIds: number[] = []
) {
	cy.get('#create-stream-button').click();

	cy.dataTest('stream-source').should('exist').click({force: true});
	cy.get(`#stream-source_ESS`).should('exist').click();

	cy.get('[data-test="stream-destination"]')
		.should('exist')
		.children()
		.eq(0)
		.click({force: true});

	cy.get(`[data-test="multiselect-option-DSS"]`)
		.scrollIntoView()
		.should('exist')
		.click();

	cy.get('[data-test="stream-destination"]')
		.children()
		.eq(0)
		.click({force: true});

	cy.dataTest('DSS-Destinations-buffer-size-selector')
		.should('be.enabled')
		.should('not.be.disabled')
		.click({force: true})
		.get('#Destinations_32')
		.click();

	// Check error is working correctly
	cy.get('#sidepanel-create-stream').click();
	cy.dataTest('source-stream-error').should('exist');

	cy.dataTest('tied-stream-dropdown')
		.should('exist')
		.click()
		.within(() => {
			cy.get('[data-test^="tied-stream-option-"]').should(
				'have.length',
				3
			);

			checkDisabledIds.forEach(id => {
				cy.get(`[data-test="tied-stream-option-${id}"]`)
					.should('have.attr', 'class')
					.should('contain', 'disabled');
			});

			cy.get(
				`[data-test="tied-stream-option-${tiedStreamId}"]`
			).click();
		});

	cy.get('#sidepanel-create-stream').click();
}

function createTestInputStreamAddEvent(
	index: number,
	destination = 'ESS',
	id?: number
) {
	return addNewStream({
		Description: `input ${index + 1}`,
		StreamId: id ?? ASSStartID + index,
		Group: '',
		Source: {
			Gasket: 'ASS',
			BufferAddress: index * 32,
			BufferSize: 32,
			Index: index
		},
		Destinations: [
			{
				Gasket: destination,
				BufferAddress: index * 4096,
				BufferSize: 4096,
				Index: index
			}
		],
		Uuid: `${Math.random()}-${Math.random()}`
	});
}

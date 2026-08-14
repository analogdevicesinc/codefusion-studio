/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {
	addNewStream,
	setEditingStream
} from '../../state/slices/gaskets/gasket.reducer';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';

const l10n = await import(
	'../../../../../../l10n/bundle.l10n.en.json'
).then(module => module.default);

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
		(window as any).__webview_localization_resources__ = l10n;

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

	it('blocks removing a destination used by a tied output stream', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		reduxStore.dispatch(createTestInputStreamAddEvent(0));
		reduxStore.dispatch(
			addNewStream({
				Description: 'tied ESS output',
				StreamId: ESSStartID,
				Group: '',
				Source: {
					Gasket: 'ESS',
					BufferAddress: 0,
					BufferSize: 128,
					Index: 0
				},
				Destinations: [
					{
						Gasket: 'DSS',
						BufferAddress: 0,
						BufferSize: 32,
						Index: 0
					}
				],
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(<TestCfgtoolsTopBar />, reduxStore).then(() => {
			const inputStream = reduxStore
				.getState()
				.gasketsReducer.Streams.find(
					stream => stream.Description === 'input 1'
				);

			if (!inputStream) {
				throw new Error('Expected input stream to be available');
			}

			reduxStore.dispatch(setEditingStream(inputStream));
		});

		cy.get('[data-test="stream-destination"]')
			.children()
			.eq(0)
			.click({force: true});
		cy.get('[data-test="multiselect-option-ESS"]').click();
		cy.get('[data-test="multiselect-option-FSS"]').click();
		cy.get('[data-test="stream-destination"]')
			.children()
			.eq(0)
			.click({force: true});

		cy.get('#sidepanel-edit-stream').click();
		cy.contains(
			l10n.cfgtools.dfg.streamConfigSidePanel.validationErrors
				.destinationGasketTiedStreamRequired
		).should('be.visible');

		cy.then(() => {
			const streams = reduxStore.getState().gasketsReducer.Streams;
			const inputStream = streams.find(
				stream => stream.Description === 'input 1'
			);
			const outputStream = streams.find(
				stream => stream.Description === 'tied ESS output'
			);

			expect(inputStream?.Destinations[0].Gasket).to.equal('ESS');
			expect(outputStream?.Source).to.include({
				Gasket: 'ESS',
				Index: 0
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

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
import {
	addNewStream,
	setSearchQuery,
	setStreamView
} from '../../../state/slices/gaskets/gasket.reducer';
import {configurePreloadedStore} from '../../../state/store';
import {GasketListView} from './gasket-listview';
import {initializeDfg} from '../../../utils/dfg';
import {createStreamAddEvent} from '../stream-property-calculation.cy';
import {StreamSidebar} from './stream-sidebar';

describe('StreamGroupListView Tests', () => {
	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json').as('soc');

		cy.clearLocalStorage().then(() => {
			localStorage.setItem(
				'DFGConfig',
				JSON.stringify({
					Soc: 'MAX32690',
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
	});

	it('should display errors in specific locations', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		// Important: set the stream view to Group before mounting the component
		reduxStore.dispatch(setStreamView('Group'));

		// Create streams in different groups
		// Group "AudioProcessing" - 3 streams
		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 's1',
				Source: {
					Gasket: 'ASS',
					Index: 0,
					BufferSize: 2048,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'GSS',
						Index: 0,
						BufferSize: 1024,
						BufferAddress: 0
					}
				],
				Group: 'g1',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);
		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 's2',
				Source: {
					Gasket: 'ASS',
					Index: 0,
					BufferSize: 2048,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ESS',
						Index: 0,
						BufferSize: 4096,
						BufferAddress: 0
					}
				],
				Group: 'g1',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(
			<GasketListView
				gasket={this.soc.Gaskets.find(
					(g: {Name: string}) => g.Name === 'ASS'
				)}
			/>,
			reduxStore
		);

		cy.get('[data-test="gasket-ASS-error"]').should('exist');

		/**
		 * Mount other gaskets and make sure we
		 */
		for (const gasket of this.soc.Gaskets) {
			if (gasket.Name === 'ASS') {
				continue;
			}

			cy.mount(<GasketListView gasket={gasket} />, reduxStore);

			cy.get(`[data-test="gasket-${gasket.Name}-error"]`).should(
				'not.exist'
			);
		}
	});

	it('should display stream errors in the gasket listview', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		reduxStore.dispatch(setStreamView('Gasket'));

		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 's1',
				Source: {
					Gasket: 'ASS',
					Index: 0,
					BufferSize: 31, // Faulty buffer size
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ESS',
						Index: 0,
						BufferSize: 4096,
						BufferAddress: 0
					}
				],
				Group: 'g1',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(
			<GasketListView
				gasket={this.soc.Gaskets.find(
					(g: {Name: string}) => g.Name === 'ASS'
				)}
			/>,
			reduxStore
		);

		cy.get('[data-test="gasket-ASS-error"]').should('exist');

		cy.get('[data-test="accordion:ASS"]').click();

		cy.get('[data-test="stream-outbound-1-error"]').should('exist');
	});

	it('should display filtered streams in the gasket listview', function () {
		/**
		 * Scenario:
		 * Create 2 streams, `stream #1` (stream id 1) and `stream #2` (stream id 97)
		 * At first, verify both streams are displayed in the UNGROUPED group
		 * Then, set a query and make sure only `stream #1` is displayed
		 * Then change the query to make sure `stream #2` is displayed
		 * Then change the query to `stream ` to make sure no streams are displayed
		 *
		 * We need to expand the following accordions:
		 * - ASS has outbound stream to DSS stream #1
		 * - DSS has inbound stream from ASS stream #1
		 * - GSS has inbound stream from FSS stream #2
		 * - FSS has outbound stream to GSS stream #2
		 */
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		cy.mount(<StreamSidebar />, reduxStore)
			.then(() => {
				initializeDfg(this.soc.Gaskets);
			})
			.then(() => {
				initializeDfg(this.soc.Gaskets);
			})
			.then(() => {
				cy.wrap(reduxStore.dispatch(setSearchQuery('')));
			})
			.then(() =>
				cy.wrap(reduxStore.dispatch(setStreamView('Gasket')))
			)
			.then(() =>
				cy.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('stream #1', 'ASS', ['DSS'], 64, [
							32
						])
					)
				)
			)
			.then(() =>
				cy.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('stream #2', 'FSS', ['GSS'], 64, [
							32
						])
					)
				)
			)
			.then(() => {
				/** Expand the accordions */
				cy.get('[data-test="accordion:ASS"]')
					.children()
					.first()
					.click({force: true});
				cy.get('[data-test="accordion:DSS"]')
					.children()
					.first()
					.click({force: true});
				cy.get('[data-test="accordion:GSS"]')
					.children()
					.first()
					.click({force: true});
				cy.get('[data-test="accordion:FSS"]')
					.children()
					.first()
					.click({force: true});

				/** Now we make sure all outbout streams are visible, in total we expect 4 ui streams: */
				cy.get('[data-test="stream-outbound-1"]').should('exist');
				cy.get('[data-test="stream-inbound-1"]').should('exist');
				cy.get('[data-test="stream-outbound-97"]').should('exist');
				cy.get('[data-test="stream-inbound-97"]').should('exist');

				/**
				 * All bubbles should contain 1
				 */
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'1'
				);
			})
			.then(() => {
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream #1')));
			})
			.then(() => {
				cy.get('[data-test="stream-outbound-1"]').should('exist');
				cy.get('[data-test="stream-inbound-1"]').should('exist');
				cy.get('[data-test="stream-outbound-97"]').should(
					'not.exist'
				);
				cy.get('[data-test="stream-inbound-97"]').should('not.exist');

				/**
				 * Stream #1 bubbles remain 1
				 * Stream #2 bubbles should be 0/1
				 */
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'0/1'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'0/1'
				);
			})
			.then(() => {
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream #2')));
			})
			.then(() => {
				cy.get('[data-test="stream-outbound-1"]').should('not.exist');
				cy.get('[data-test="stream-inbound-1"]').should('not.exist');
				cy.get('[data-test="stream-outbound-97"]').should('exist');
				cy.get('[data-test="stream-inbound-97"]').should('exist');

				/**
				 * Stream #1 bubbles should be 0/1
				 * Stream #2 bubbles should be 1
				 */
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'0/1'
				);
				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'0/1'
				);
				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'1'
				);
			})
			.then(() => {
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream ')));
			})
			.then(() => {
				cy.get('[data-test="stream-outbound-1"]').should('exist');
				cy.get('[data-test="stream-inbound-1"]').should('exist');
				cy.get('[data-test="stream-outbound-97"]').should('exist');
				cy.get('[data-test="stream-inbound-97"]').should('exist');

				/**
				 * All bubbles should be 1
				 */
				cy.get('[data-test="outbound-streams-ASS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-DSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="inbound-streams-GSS"]').should(
					'contain',
					'1'
				);
				cy.get('[data-test="outbound-streams-FSS"]').should(
					'contain',
					'1'
				);
			});
	});
});

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
import {configurePreloadedStore} from '../../../../state/store';
import {StreamGroupSelector} from './stream-groups-select';
import {
	addNewStream,
	setEditingStream
} from '../../../../state/slices/gaskets/gasket.reducer';

describe('StreamGroupSelector Component', () => {
	let onSelectSpy: Cypress.Agent<sinon.SinonSpy>;

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

		onSelectSpy = cy.spy().as('onSelectSpy');
	});

	it('should show existing groups with stream counts when dropdown is opened', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		// Add streams with different groups
		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 'Stream 1',
				Source: {
					Gasket: 'ASS',
					Index: 0,
					BufferSize: 32,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'BSS',
						Index: 0,
						BufferSize: 32,
						BufferAddress: 0
					}
				],
				Group: 'GroupA',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 2,
				Description: 'Stream 2',
				Source: {
					Gasket: 'ESS',
					Index: 0,
					BufferSize: 32,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ASS',
						Index: 0,
						BufferSize: 32,
						BufferAddress: 0
					}
				],
				Group: 'GroupA',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 3,
				Description: 'Stream 3',
				Source: {
					Gasket: 'BSS',
					Index: 0,
					BufferSize: 32,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ESS',
						Index: 0,
						BufferSize: 32,
						BufferAddress: 0
					}
				],
				Group: 'GroupB',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(
			<StreamGroupSelector onSelect={onSelectSpy} />,
			reduxStore
		);

		// Find a button and click it
		cy.get('button').click();

		// Should show existing groups with counts
		cy.get('[data-test="group-name:GroupA"]').should('be.visible');

		cy.get('[data-test="group-count:GroupA"]').should(
			'have.text',
			'2'
		);

		cy.get('[data-test="group-name:GroupB"]').should('be.visible');

		cy.get('[data-test="group-count:GroupB"]').should(
			'have.text',
			'1'
		);
	});

	it('Should display the group as in the state', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		reduxStore.dispatch(
			setEditingStream({
				Group: 'GroupA'
			})
		);

		cy.mount(
			<StreamGroupSelector onSelect={onSelectSpy} />,
			reduxStore
		);

		/**
		 * Select the button element -> 2nd child should contain the group name
		 */
		cy.get('button').children().eq(1).should('have.text', 'GroupA');
	});
});

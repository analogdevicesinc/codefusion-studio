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
import {StreamSidebar} from './stream-sidebar';
import {addNewStream} from '../../../state/slices/gaskets/gasket.reducer';

describe('Disabling Add Stream Buttons When Gaskets IO are full', () => {
	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json')
			.as('soc')
			.then(soc => {
				// A precondition to catch model changes
				const bssGasket = soc.Gaskets.find(
					(g: {Name: string}) => g.Name === 'BSS'
				);

				if (!bssGasket || bssGasket.InputStreams.length !== 2) {
					throw new Error(
						'BSS gasket has changed in the data model, this test will fail.'
					);
				}
			});

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

	it('should disable add inbound stream button when gasket is full', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 'ASS_TO_BSS_1',
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
				Group: 'ASS',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(<StreamSidebar />, reduxStore);

		cy.get('[data-test="accordion:BSS"]')
			.children()
			.first()
			.click({force: true});
		cy.get('[data-test="inbound-stream-header-BSS"]')
			.find('vscode-button')
			.should('not.have.class', 'disabled');

		cy.wrap(null)
			.then(() => {
				reduxStore.dispatch(
					addNewStream({
						StreamId: 2,
						Description: 'ASS_TO_BSS_2',
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
						Group: 'ASS',
						Uuid: `${Math.random()}-${Math.random()}`
					})
				);
			})
			.then(() => {
				cy.get('[data-test="inbound-stream-header-BSS"]')
					.find('vscode-button')
					.should('have.class', 'disabled');
			});
	});

	it('should disable add outbound stream button when gasket is full', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 1,
				Description: 'BSS_TO_ASS_1',
				Source: {
					Gasket: 'BSS',
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
				Group: 'BSS',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(<StreamSidebar />, reduxStore);

		cy.get('[data-test="accordion:BSS"]')
			.children()
			.first()
			.click({force: true});
		cy.get('[data-test="outbound-stream-header-BSS"]')
			.find('vscode-button')
			.should('not.have.class', 'disabled');

		cy.wrap(null)
			.then(() => {
				reduxStore.dispatch(
					addNewStream({
						StreamId: 2,
						Description: 'BSS_TO_ASS_2',
						Source: {
							Gasket: 'BSS',
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
						Group: 'BSS',
						Uuid: `${Math.random()}-${Math.random()}`
					})
				);
			})
			.then(() => {
				cy.get('[data-test="outbound-stream-header-BSS"]')
					.find('vscode-button')
					.should('have.class', 'disabled');
			});
	});
});

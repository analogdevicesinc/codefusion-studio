/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
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
import {
	addNewStream,
	setEditingStream
} from '../../../state/slices/gaskets/gasket.reducer';
import {StreamConfigSidePanel} from './stream-config-sidepanel';

describe('DFG source option tooltip', () => {
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

	it('preserves the tooltip when a source becomes disabled', function () {
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

		cy.mount(<StreamConfigSidePanel />, reduxStore);
		reduxStore.dispatch(
			setEditingStream(
				reduxStore.getState().gasketsReducer.Streams[0]
			)
		);

		cy.get('[data-test="stream-source"]')
			.click({force: true})
			.get('#stream-source_BSS')
			.should('not.have.class', 'disabled')
			.and('have.attr', 'title', 'BSS');

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
				reduxStore.dispatch(
					setEditingStream({
						StreamId: 100,
						Description: 'random',
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
						Group: 'ESS'
					})
				);

				cy.get('[data-test="stream-source"]')
					.click({force: true})
					.get('#stream-source_BSS')
					.should('have.class', 'disabled')
					.and('have.attr', 'title', 'BSS');
			});
	});
});

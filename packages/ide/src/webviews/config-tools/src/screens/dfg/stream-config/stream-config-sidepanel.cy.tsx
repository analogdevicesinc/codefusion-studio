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
import {StreamConfigSidePanel} from './stream-config-sidepanel';
import {
	addNewStream,
	setEditingStream
} from '../../../state/slices/gaskets/gasket.reducer';
import {Dfg} from '../DFG';

describe('Disabling Add Stream Buttons When Gaskets IO are full', () => {
	// A precondition to catch model changes

	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json')
			.as('soc')
			.then(soc => {
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

	it('should disable BSS as destination when BSS is out of inbound streams', function () {
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

		cy.mount(<StreamConfigSidePanel />, reduxStore);

		reduxStore.dispatch(
			setEditingStream(
				reduxStore.getState().gasketsReducer.Streams[0]
			)
		);

		// Check if BSS is disabled
		cy.get('[data-test="stream-destination"]')
			.click({force: true})
			.get(`#stream-destination_BSS`)
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

				cy.get('[data-test="stream-destination"]')
					.click({force: true})
					.get(`#stream-destination_BSS`)
					.should('have.class', 'disabled');
			});
	});

	it('should disable BSS as source when BSS is out of outbound streams', function () {
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

		// Check if BSS is disabled
		cy.get('[data-test="stream-source"]')
			.click({force: true})
			.get(`#stream-source_BSS`)
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
				// Check if BSS is disabled
				cy.get('[data-test="stream-source"]')
					.click({force: true})
					.get(`#stream-source_BSS`)
					.should('have.class', 'disabled');
			});
	});

	it('Tests editing a stream with a group name', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);

		// Add a stream without a group name
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
				Group: '',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		cy.mount(<StreamConfigSidePanel />, reduxStore);

		// Mark the stream as being edited
		reduxStore.dispatch(
			setEditingStream(
				reduxStore.getState().gasketsReducer.Streams[0]
			)
		);

		// Find the label with text group, its parent, its 2nd child
		cy.get('label')
			.contains('Group')
			.parent()
			.children()
			.eq(1)
			.find('button')
			.click({force: true})
			.then(() => {
				cy.get('[data-test="new-group-name-input-control-input"]')
					.shadow()
					.find('input')
					.type('Noise Suppression', {force: true});
			})
			.then(() => {
				cy.get('[data-test="create-group-action"]').click({
					force: true
				});
			})
			.then(() => {
				cy.get('#sidepanel-edit-stream').click({force: true});
			})
			.then(() => {
				cy.wrap(null).then(() => {
					const stream =
						reduxStore.getState().gasketsReducer.Streams[0];
					cy.wrap(stream.Group).should('equal', 'Noise Suppression');
				});
			});
	});
});

describe('Tests regarding Stream Config Fields', () => {
	const configDict = {
		BoardName: '',
		Package: 'WLP',
		Soc: 'MAX32690',
		Projects: [
			{
				Description: 'ARM Cortex-M4',
				ExternallyManaged: false,
				FirmwarePlatform: '',
				CoreId: 'CM4',
				Name: 'ARM Cortex-M4',
				PluginId: '',
				ProjectId: 'CM4-proj'
			}
		]
	} as unknown as CfsConfig;

	const controls = {
		'ESS DFGStreamConfig': [
			{
				Id: 'ALIAS',
				Description: 'Stream Alias',
				Hint: 'ess-stream',
				Type: 'text',
				Pattern: '([a-z][a-z0-9-]*)?'
			}
		]
	};

	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json').as('soc');
	});

	it('Create Stream With Individual Config Fields', function () {
		const reduxStore = configurePreloadedStore(this.soc, configDict);
		localStorage.setItem(
			'pluginControls:CM4-proj',
			JSON.stringify(controls)
		);

		cy.mount(<Dfg />, reduxStore);

		// 1. Click the create stream button!
		cy.get('#create-stream-button').click();

		// 2. Select the source gasket
		cy.get('[data-test="stream-source"]').click({force: true});
		cy.get(`#stream-source_ESS`).click({force: true});

		cy.wait(1000);

		// 3. Select the destination gasket
		cy.get('[data-test="stream-destination"]').click({force: true});
		cy.get(`#stream-destination_ESS`).click({force: true});

		cy.wait(1000);

		// 4. Check that additional fields are rendered
		cy.get(
			`[data-test="Source-additionalControls:control-ALIAS-control-input"]`
		)
			.should('exist')
			.should('have.value', '');

		cy.get(
			`[data-test="Destinations-additionalControls:control-ALIAS-control-input"]`
		)
			.should('exist')
			.should('have.value', '');

		// 5. Set the values of the alias fields
		cy.get(
			'[data-test="Source-additionalControls:control-ALIAS-control-input"]'
		).then($el => {
			($el[0] as HTMLInputElement).value = 'ess source test-alias';
			$el[0].dispatchEvent(new Event('change', {bubbles: true}));
			$el[0].dispatchEvent(new Event('input', {bubbles: true}));
		});

		cy.wait(1000);

		cy.get(
			'[data-test="Destinations-additionalControls:control-ALIAS-control-input"]'
		).then($el => {
			($el[0] as HTMLInputElement).value =
				'ess destination test-alias';
			$el[0].dispatchEvent(new Event('change', {bubbles: true}));
			$el[0].dispatchEvent(new Event('input', {bubbles: true}));
		});

		// 6. Verify the value was set
		cy.get(
			'[data-test="Source-additionalControls:control-ALIAS-control-input"]'
		).should('have.value', 'ess source test-alias');

		cy.get(
			'[data-test="Destinations-additionalControls:control-ALIAS-control-input"]'
		).should('have.value', 'ess destination test-alias');

		// 7. Click the save button
		cy.get('#sidepanel-create-stream').click();

		cy.wait(1000).then(() => {
			// 8. Check that the value of the alias field is changed
			const sourceConfig =
				reduxStore.getState().gasketsReducer.Streams[0].Source.Config;

			const destinationConfig =
				reduxStore.getState().gasketsReducer.Streams[0]
					.Destinations[0].Config;

			expect(sourceConfig?.ALIAS).to.equal('ess source test-alias');
			expect(destinationConfig?.ALIAS).to.equal(
				'ess destination test-alias'
			);
		});
	});
});

describe.only('Streams are getting deleted and everything recalculated', () => {
	const configDict = {
		BoardName: '',
		Package: 'DFG',
		Soc: 'MAX32690',
		Projects: [
			{
				Description: 'ARM Cortex-M4',
				ExternallyManaged: false,
				FirmwarePlatform: '',
				CoreId: 'CM4',
				Name: 'ARM Cortex-M4',
				PluginId: '',
				ProjectId: 'CM4-proj'
			}
		]
	} as unknown as CfsConfig;

	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json').as('soc');
	});

	it('deletes a streams from a bunch of streams with different sizes and recalculates everything', function () {
		const reduxStore = configurePreloadedStore(this.soc, configDict);

		// Add 5 streams from GSS to FSS
		const gssStreamSizes = [256, 32, 128, 64, 32];
		const fssStreamSizes = [32, 256, 512, 64, 32];

		for (let i = 0; i < 5; i++) {
			reduxStore.dispatch(
				addNewStream({
					StreamId: i,
					Description: `GSS_DSS_${i}`,
					Source: {
						Gasket: 'GSS',
						Index: i,
						BufferSize: gssStreamSizes[i],
						BufferAddress: 0
					},
					Destinations: [
						{
							Gasket: 'FSS',
							Index: i,
							BufferSize: fssStreamSizes[i],
							BufferAddress: 0
						}
					],
					Group: '',
					Uuid: `${Math.random()}-${Math.random()}`
				})
			);
		}

		cy.log('########################');
		cy.log('Streams before deletion:');
		cy.log('########################');
		const streams1 = reduxStore.getState().gasketsReducer.Streams;

		// Verify streams length
		cy.log('########################');
		cy.log('Streams length');
		cy.log('########################');
		cy.wrap(streams1).should('have.length', 5);

		// Verify Source Buffer Addresses
		cy.log('########################');
		cy.log('Source Buffer Addresses');
		cy.log('########################');
		cy.wrap(streams1[0])
			.its('Source.BufferAddress')
			.should('equal', 0);
		cy.wrap(streams1[1])
			.its('Source.BufferAddress')
			.should('equal', 448);
		cy.wrap(streams1[2])
			.its('Source.BufferAddress')
			.should('equal', 256);
		cy.wrap(streams1[3])
			.its('Source.BufferAddress')
			.should('equal', 384);
		cy.wrap(streams1[4])
			.its('Source.BufferAddress')
			.should('equal', 480);

		// Verify Destination Buffer Addresses
		cy.log('############################');
		cy.log('Destination Buffer Addresses');
		cy.log('############################');
		cy.wrap(streams1[0])
			.its('Destinations.0.BufferAddress')
			.should('equal', 832);
		cy.wrap(streams1[1])
			.its('Destinations.0.BufferAddress')
			.should('equal', 512);
		cy.wrap(streams1[2])
			.its('Destinations.0.BufferAddress')
			.should('equal', 0);
		cy.wrap(streams1[3])
			.its('Destinations.0.BufferAddress')
			.should('equal', 768);
		cy.wrap(streams1[4])
			.its('Destinations.0.BufferAddress')
			.should('equal', 864);

		// Verify Stream IDs
		cy.log('##########');
		cy.log('Stream IDs');
		cy.log('##########');
		cy.wrap(streams1[0]).its('StreamId').should('equal', 161);
		cy.wrap(streams1[1]).its('StreamId').should('equal', 162);
		cy.wrap(streams1[2]).its('StreamId').should('equal', 163);
		cy.wrap(streams1[3]).its('StreamId').should('equal', 164);
		cy.wrap(streams1[4]).its('StreamId').should('equal', 165);

		cy.mount(<Dfg />, reduxStore);
		reduxStore.subscribe(() => {
			console.log(reduxStore.getState().gasketsReducer.Streams);
		});
		cy.log('Edit stream 3...');
		reduxStore.dispatch(setEditingStream(streams1[3]));

		cy.log('...and delete it');
		cy.get('[data-test="delete-stream-button"]')
			.should('be.visible')
			.click();

		cy.dataTest('confirm-delete-stream').should('exist').click();

		cy.log('########################');
		cy.log('Streams after deletion:');
		cy.log('########################');
		cy.wrap(null).then(() => {
			const streams2 = reduxStore.getState().gasketsReducer.Streams;

			cy.log('########################');
			cy.log('Streams length');
			cy.log('########################');
			cy.wrap(streams2).should('have.length', 4);
			cy.log('########################');
			cy.log('Source Buffer Addresses');
			cy.log('########################');
			cy.wrap(streams2[0])
				.its('Source.BufferAddress')
				.should('equal', 0);
			cy.wrap(streams2[1])
				.its('Source.BufferAddress')
				.should('equal', 384);
			cy.wrap(streams2[2])
				.its('Source.BufferAddress')
				.should('equal', 256);
			cy.wrap(streams2[3])
				.its('Source.BufferAddress')
				.should('equal', 416);
			cy.log('############################');
			cy.log('Destination Buffer Addresses');
			cy.log('############################');
			cy.wrap(streams2[0])
				.its('Destinations.0.BufferAddress')
				.should('equal', 768);
			cy.wrap(streams2[1])
				.its('Destinations.0.BufferAddress')
				.should('equal', 512);
			cy.wrap(streams2[2])
				.its('Destinations.0.BufferAddress')
				.should('equal', 0);
			cy.wrap(streams2[3])
				.its('Destinations.0.BufferAddress')
				.should('equal', 800);
			cy.log('########################');
			cy.log('Stream IDs');
			cy.log('########################');
			cy.wrap(streams2[0]).its('StreamId').should('equal', 161);
			cy.wrap(streams2[1]).its('StreamId').should('equal', 162);
			cy.wrap(streams2[2]).its('StreamId').should('equal', 163);
			cy.wrap(streams2[3]).its('StreamId').should('equal', 164);
		});
	});
});

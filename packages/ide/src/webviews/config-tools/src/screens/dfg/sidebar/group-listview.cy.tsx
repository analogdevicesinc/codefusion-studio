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
import {
	addNewStream,
	setSearchQuery,
	setStreamView
} from '../../../state/slices/gaskets/gasket.reducer';
import {initializeDfg} from '../../../utils/dfg';
import {createStreamAddEvent} from '../stream-property-calculation.cy';

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

	it('should display groups with correct stream counts and handle groupless streams', function () {
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
				Description: 'Audio_Input_Stream',
				Source: {
					Gasket: 'GSS',
					Index: 0,
					BufferSize: 128,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ASS',
						Index: 0,
						BufferSize: 256,
						BufferAddress: 0
					}
				],
				Group: 'AudioProcessing',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 2,
				Description: 'Audio_Output_Stream',
				Source: {
					Gasket: 'ASS',
					Index: 0,
					BufferSize: 256,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'BSS',
						Index: 0,
						BufferSize: 512,
						BufferAddress: 0
					}
				],
				Group: 'AudioProcessing',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 3,
				Description: 'Audio_Filter_Stream',
				Source: {
					Gasket: 'ESS',
					Index: 0,
					BufferSize: 128,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ASS',
						Index: 1,
						BufferSize: 256,
						BufferAddress: 0
					}
				],
				Group: 'AudioProcessing',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		// Group "DataTransfer" - 2 streams
		reduxStore.dispatch(
			addNewStream({
				StreamId: 4,
				Description: 'Data_Upload_Stream',
				Source: {
					Gasket: 'FSS',
					Index: 0,
					BufferSize: 64,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'GSS',
						Index: 0,
						BufferSize: 128,
						BufferAddress: 0
					}
				],
				Group: 'DataTransfer',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 5,
				Description: 'Data_Download_Stream',
				Source: {
					Gasket: 'ASS',
					Index: 1,
					BufferSize: 256,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'FSS',
						Index: 0,
						BufferSize: 512,
						BufferAddress: 0
					}
				],
				Group: 'DataTransfer',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		// Group "Preprocessing" - 1 stream
		reduxStore.dispatch(
			addNewStream({
				StreamId: 6,
				Description: 'Preprocess_Stream',
				Source: {
					Gasket: 'GSS',
					Index: 1,
					BufferSize: 32,
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
				Group: 'Preprocessing',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		// Group "NoiseSuppression" - 4 streams (largest group)
		reduxStore.dispatch(
			addNewStream({
				StreamId: 7,
				Description: 'NoiseSuppression_Input_Stream_1',
				Source: {
					Gasket: 'BSS',
					Index: 0,
					BufferSize: 512,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ASS',
						Index: 2,
						BufferSize: 1024,
						BufferAddress: 0
					}
				],
				Group: 'NoiseSuppression',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 8,
				Description: 'NoiseSuppression_Input_Stream_2',
				Source: {
					Gasket: 'GSS',
					Index: 2,
					BufferSize: 256,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'BSS',
						Index: 1,
						BufferSize: 512,
						BufferAddress: 0
					}
				],
				Group: 'NoiseSuppression',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 9,
				Description: 'NoiseSuppression_Output_Stream_1',
				Source: {
					Gasket: 'ASS',
					Index: 2,
					BufferSize: 1024,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'FSS',
						Index: 1,
						BufferSize: 2048,
						BufferAddress: 0
					}
				],
				Group: 'NoiseSuppression',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 10,
				Description: 'NoiseSuppression_Filter_Stream',
				Source: {
					Gasket: 'FSS',
					Index: 1,
					BufferSize: 2048,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ESS',
						Index: 1,
						BufferSize: 4096,
						BufferAddress: 0
					}
				],
				Group: 'NoiseSuppression',
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		// Ungrouped streams (no Group property or empty Group) - 2 streams
		reduxStore.dispatch(
			addNewStream({
				StreamId: 11,
				Description: 'Ungrouped_Stream_1',
				Source: {
					Gasket: 'ASS',
					Index: 3,
					BufferSize: 128,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'GSS',
						Index: 2,
						BufferSize: 256,
						BufferAddress: 0
					}
				],
				Group: '', // Empty group
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		reduxStore.dispatch(
			addNewStream({
				StreamId: 12,
				Description: 'Ungrouped_Stream_2',
				Source: {
					Gasket: 'BSS',
					Index: 1,
					BufferSize: 64,
					BufferAddress: 0
				},
				Destinations: [
					{
						Gasket: 'ASS',
						Index: 4,
						BufferSize: 128,
						BufferAddress: 0
					}
				],
				Group: '', // Empty group,
				Uuid: `${Math.random()}-${Math.random()}`
			})
		);

		// Mount the component with Group view
		cy.wrap(reduxStore).then(() => {
			reduxStore.dispatch({
				type: 'gasketsReducer/setDfgUI',
				payload: {streamView: 'Group'}
			});
		});

		cy.mount(<StreamSidebar />, reduxStore);

		// Verify the header shows correct view mode
		cy.get('[data-test="sidebar-header"]').should('contain', 'TOTAL');

		// Verify all groups are displayed with correct stream counts
		// Groups should be sorted by number of streams (ascending) according to the sidebar logic

		// Preprocessing (1 stream) - should appear first
		cy.get('[data-test="accordion:Preprocessing"]').should('exist');
		cy.get(
			'[data-test="accordion-group-length:Preprocessing"]'
		).should('contain', '1');

		// DataTransfer (2 streams) - should appear second
		cy.get('[data-test="accordion:DataTransfer"]').should('exist');
		cy.get(
			'[data-test="accordion-group-length:DataTransfer"]'
		).should('contain', '2');

		// UNGROUPED (2 streams) - should appear third (ungrouped streams)
		cy.get('[data-test="accordion:UNGROUPED"]').should('exist');
		cy.get('[data-test="accordion-group-length:UNGROUPED"]').should(
			'contain',
			'2'
		);

		// AudioProcessing (3 streams) - should appear fourth
		cy.get('[data-test="accordion:AudioProcessing"]').should('exist');
		cy.get(
			'[data-test="accordion-group-length:AudioProcessing"]'
		).should('contain', '3');

		// NoiseSuppression (4 streams) - should appear last (largest group)
		cy.get('[data-test="accordion:NoiseSuppression"]').should(
			'exist'
		);
		cy.get(
			'[data-test="accordion-group-length:NoiseSuppression"]'
		).should('contain', '4');

		// Helper function to find stream ID by description
		const getStreamIdByDescription = (description: string) => {
			const streams = reduxStore.getState().gasketsReducer.Streams;
			const stream = streams.find(s => s.Description === description);

			return stream?.StreamId;
		};

		// Test expanding groups and verifying individual streams
		// Expand AudioProcessing group and verify streams
		cy.get('[data-test="accordion:AudioProcessing"]').click();

		cy.wrap(null).then(() => {
			const audioInputId = getStreamIdByDescription(
				'Audio_Input_Stream'
			);
			const audioOutputId = getStreamIdByDescription(
				'Audio_Output_Stream'
			);
			const audioFilterId = getStreamIdByDescription(
				'Audio_Filter_Stream'
			);

			cy.get(`[data-test="stream-${audioInputId}"]`)
				.should('exist')
				.and('contain', 'Audio_Input_Stream');
			cy.get(`[data-test="stream-${audioOutputId}"]`)
				.should('exist')
				.and('contain', 'Audio_Output_Stream');
			cy.get(`[data-test="stream-${audioFilterId}"]`)
				.should('exist')
				.and('contain', 'Audio_Filter_Stream');
		});

		// Expand NoiseSuppression group and verify streams
		cy.get('[data-test="accordion:NoiseSuppression"]').click();

		cy.wrap(null).then(() => {
			const nsInput1Id = getStreamIdByDescription(
				'NoiseSuppression_Input_Stream_1'
			);
			const nsInput2Id = getStreamIdByDescription(
				'NoiseSuppression_Input_Stream_2'
			);
			const nsOutput1Id = getStreamIdByDescription(
				'NoiseSuppression_Output_Stream_1'
			);
			const nsFilterId = getStreamIdByDescription(
				'NoiseSuppression_Filter_Stream'
			);

			cy.get(`[data-test="stream-${nsInput1Id}"]`)
				.should('exist')
				.and('contain', 'NoiseSuppression_Input_Stream_1');
			cy.get(`[data-test="stream-${nsInput2Id}"]`)
				.should('exist')
				.and('contain', 'NoiseSuppression_Input_Stream_2');
			cy.get(`[data-test="stream-${nsOutput1Id}"]`)
				.should('exist')
				.and('contain', 'NoiseSuppression_Output_Stream_1');
			cy.get(`[data-test="stream-${nsFilterId}"]`)
				.should('exist')
				.and('contain', 'NoiseSuppression_Filter_Stream');
		});

		// Expand UNGROUPED group and verify ungrouped streams
		cy.get('[data-test="accordion:UNGROUPED"]').click();

		cy.wrap(null).then(() => {
			const ungrouped1Id = getStreamIdByDescription(
				'Ungrouped_Stream_1'
			);
			const ungrouped2Id = getStreamIdByDescription(
				'Ungrouped_Stream_2'
			);

			cy.get(`[data-test="stream-${ungrouped1Id}"]`)
				.should('exist')
				.and('contain', 'Ungrouped_Stream_1');
			cy.get(`[data-test="stream-${ungrouped2Id}"]`)
				.should('exist')
				.and('contain', 'Ungrouped_Stream_2');
		});

		// Test stream details display (source -> destination format)
		cy.wrap(null).then(() => {
			const audioInputId = getStreamIdByDescription(
				'Audio_Input_Stream'
			);

			// Test individual stream elements using data-test attributes
			cy.get(
				`[data-test="stream-${audioInputId}-source-gasket"]`
			).should('contain', 'GSS');
			cy.get(
				`[data-test="stream-${audioInputId}-destination-gasket"]`
			).should('contain', 'ASS');
			cy.get(
				`[data-test="stream-${audioInputId}-description"]`
			).should('contain', `Audio_Input_Stream`);
		});
	});

	it('should display filtered streams', function () {
		/**
		 * Scenario:
		 * Create 2 streams, `stream #1` ASS -> DSS (stream id 1) and
		 * `stream #2` FSS -> GSS (stream id 97)
		 * At first, verify both streams are displayed in the UNGROUPED group
		 * Then, set a query and make sure only `stream #1` is displayed
		 * Then change the query to make sure `stream #2` is displayed
		 * Then change the query to `stream ` to make sure no streams are displayed
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
				cy.wrap(reduxStore.dispatch(setSearchQuery('')));
			})
			.then(() =>
				cy.wrap(reduxStore.dispatch(setStreamView('Group')))
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
				cy.get('[data-test="accordion:UNGROUPED"]').click();
			})
			.then(() => {
				cy.get('[data-test="stream-1"]').should('exist');
				cy.get('[data-test="stream-97"]').should('exist');

				// Group bubbles should be 2
				cy.get(
					'[data-test="accordion-group-length:UNGROUPED"]'
				).should('contain', '2');
			})
			.then(() =>
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream #1')))
			)
			.then(() => {
				cy.get('[data-test="stream-1"]').should('exist');
				cy.get('[data-test="stream-97"]').should('not.exist');

				// Group bubbles should be 1/2
				cy.get(
					'[data-test="accordion-group-length:UNGROUPED"]'
				).should('contain', '1/2');
			})
			.then(() =>
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream #2')))
			)
			.then(() => {
				cy.get('[data-test="stream-1"]').should('not.exist');
				cy.get('[data-test="stream-97"]').should('exist');

				// Group bubbles should be 1/2
				cy.get(
					'[data-test="accordion-group-length:UNGROUPED"]'
				).should('contain', '1/2');
			})
			.then(() =>
				cy.wrap(reduxStore.dispatch(setSearchQuery('stream ')))
			)
			.then(() => {
				cy.get('[data-test="stream-1"]').should('exist');
				cy.get('[data-test="stream-97"]').should('exist');

				// Group bubbles should be 2
				cy.get(
					'[data-test="accordion-group-length:UNGROUPED"]'
				).should('contain', '2');
			});
	});
});

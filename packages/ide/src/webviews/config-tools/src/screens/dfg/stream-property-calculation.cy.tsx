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

import {type CfsConfig} from 'cfs-lib';
import {configurePreloadedStore} from '../../state/store';
import {Dfg} from './DFG';
import {
	addNewStream,
	type DFGStreamUI
} from '../../state/slices/gaskets/gasket.reducer';
import {getGasketDictionary, initializeDfg} from '../../utils/dfg';
import {DfgStreamTable} from './dfg-stream-table/dfg-stream-table';

describe('DFG Stream Property Calculation', () => {
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

	it('should compute stream properties correctly for single destination str', function () {
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore).then(() => {
			initializeDfg(this.soc.Gaskets);
			cy.wrap(
				reduxStore.dispatch(
					createStreamAddEvent('s1', 'ASS', ['DSS'], 64, [32])
				)
			)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('s2', 'ASS', ['DSS'], 32, [64])
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('s3', 'ASS', ['GSS'], 128, [32])
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('s4', 'ASS', ['ESS'], 1024, [4096])
					)
				)
				.wrap(
					// Since ESS has tied streams we need to set index and streamId manually here
					reduxStore.dispatch(
						createStreamAddEvent(
							's5',
							'ESS',
							['GSS'],
							128,
							[64],
							0,
							129
						)
					)
				)
				.wrap({
					getState: () => reduxStore.getState()
				})
				.invoke('getState')
				.then(state => {
					const streams = state.gasketsReducer.Streams;
					/**
					 * Assumptions to be validated:
					 * - streams should be in the same order they were created
					 * - stream indices should also be in the same order but 0 based for each gasket
					 * - streamId should equal the index of the output stream in the gasket
					 * - stream source and destination addresses should be sourted by buffer size
					 */
					validateStreamProperties(streams[0], 's1', 1152, [
						{gasket: 'DSS', bufferAddress: 64}
					]);
					validateStreamProperties(streams[1], 's2', 1216, [
						{gasket: 'DSS', bufferAddress: 0}
					]);
					validateStreamProperties(streams[2], 's3', 1024, [
						{gasket: 'GSS', bufferAddress: 64}
					]);
					validateStreamProperties(streams[3], 's4', 0, [
						{gasket: 'ESS', bufferAddress: 0}
					]);
					validateStreamProperties(streams[4], 's5', 0, [
						{gasket: 'GSS', bufferAddress: 0}
					]);
				});
		});
	});

	it('should compute stream properties correctly for multi-cast streams', function () {
		/**
		 * Test scenario:
		 * stream 1: ASS(64) -> BSS (32), DSS(32), ESS(4096)
		 * stream 2: BSS(512) -> ASS(128), DSS(128), GSS(1024)
		 * stream 3: FSS(16384) -> ASS(8192), BSS(512), DSS(64), GSS(2048)
		 * stream 4: ASS(2048) -> ASS(4096)
		 *
		 * Here is what is expected per gasket:
		 *
		 *                      |-> 4096 is from strean s4
		 * ASS: Inputs [8192, 4096, 128]
		 *      Outputs: [2048, 64]
		 * BSS: Inputs [512, 32]
		 *      Outputs: [512]
		 *                    |-> 64 is from stream s3
		 * DSS: Inputs [128, 64, 32]
		 *      Outputs: []
		 * ESS: Inputs [4096]
		 *      Outputs: [0]
		 * FSS: Inputs []
		 *      Outputs: [16384]
		 * GSS: Inputs [2048, 1024]
		 *      Outputs: []
		 *
		 * Inputs translates to destinations buffer addresses
		 * Outputs translates to source buffer addresses
		 */
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore).then(() => {
			initializeDfg(this.soc.Gaskets);
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
							32,
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
							128,
							[8192, 512, 64, 2048]
						)
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('s4', 'ASS', ['ASS'], 2048, [4096])
					)
				)
				.wrap({
					getState: () => reduxStore.getState()
				})
				.invoke('getState')
				.then(state => {
					const streams = state.gasketsReducer.Streams;
					/**
					 * How this test works:
					 * Expect streamId to be properly assigned for each stream
					 * Expect index to be properly assigned for each gasket in the stream's destinations
					 * 	-> The index is simply the count of previous destinations of that gasket
					 */

					validateStreamProperties(
						streams[0],
						's1',
						2048,
						[
							{gasket: 'BSS', bufferAddress: 512, index: 0},
							{gasket: 'DSS', bufferAddress: 192, index: 0},
							{gasket: 'ESS', bufferAddress: 0, index: 0}
						],
						1
					);
					validateStreamProperties(
						streams[1],
						's2',
						0,
						[
							{gasket: 'ASS', bufferAddress: 12288, index: 0},
							{gasket: 'DSS', bufferAddress: 0, index: 1},
							{gasket: 'GSS', bufferAddress: 2048, index: 0}
						],
						225
					);
					validateStreamProperties(
						streams[2],
						's3',
						0,
						[
							{gasket: 'ASS', bufferAddress: 0, index: 1},
							{gasket: 'BSS', bufferAddress: 0, index: 1},
							{gasket: 'DSS', bufferAddress: 128, index: 2},
							{gasket: 'GSS', bufferAddress: 0, index: 1}
						],
						97
					);
					validateStreamProperties(
						streams[3],
						's4',
						0,
						[{gasket: 'ASS', bufferAddress: 8192, index: 2}],
						2
					);
				});
		});
	});

	it('should compute stream properties correctly after stream remove', function () {
		/**
		 * Test scenario:
		 * stream 1: ASS(64) -> ESS(4096)
		 * stream 2: ESS(128) -> ESS(4096)
		 * stream 3: FSS(64) -> ESS(4096)
		 * stream 4: ESS(128) -> GSS(128)
		 * stream 5: FSS(256) -> ESS(4096)
		 * stream 6: ESS(128) -> FSS(128), ESS(4096)
		 *
		 * After stream 2 delete, here is what is expected:
		 *
		 * stream 6 has streamId 131
		 *      FSS output has index: 2 → 0
		 * 			ESS output has index: 2 → 3
		 */
		const reduxStore = configurePreloadedStore(
			this.soc,
			{} as CfsConfig
		);
		cy.mount(<Dfg />, reduxStore).then(() => {
			initializeDfg(this.soc.Gaskets);
			cy.wrap(
				reduxStore.dispatch(
					createStreamAddEvent(
						's1',
						'ASS',
						['ESS'],
						64,
						[4096],
						undefined,
						1
					)
				)
			)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent(
							's2',
							'ESS',
							['ESS'],
							128,
							[4096],
							undefined,
							129
						)
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent(
							's3',
							'FSS',
							['ESS'],
							64,
							[4096],
							undefined,
							97
						)
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent(
							's4',
							'ESS',
							['GSS'],
							128,
							[128],
							2,
							131
						)
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent('s5', 'FSS', ['ESS'], 256, [4096]),
						undefined,
						98
					)
				)
				.wrap(
					reduxStore.dispatch(
						createStreamAddEvent(
							's6',
							'ESS',
							['FSS', 'ESS'],
							128,
							[128, 4096],
							3,
							132
						)
					)
				)
				.wrap({
					getState: () => reduxStore.getState()
				})
				.invoke('getState')
				.then(state => {
					const streams = state.gasketsReducer.Streams;
					/**
					 * How this test works:
					 * Expect streamId to be properly assigned for each stream
					 * Expect index to be properly assigned for each gasket in the stream's destinations
					 * 	-> The index is simply the count of previous destinations of that gasket
					 */

					validateStreamProperties(
						streams[0],
						's1',
						0,
						[{gasket: 'ESS', bufferAddress: 0, index: 0}],
						1
					);
					validateStreamProperties(
						streams[1],
						's2',
						0,
						[{gasket: 'ESS', bufferAddress: 4096, index: 1}],
						129
					);
					validateStreamProperties(
						streams[2],
						's3',
						256,
						[{gasket: 'ESS', bufferAddress: 8192, index: 2}],
						97
					);
					validateStreamProperties(
						streams[3],
						's4',
						128,
						[{gasket: 'GSS', bufferAddress: 0, index: 0}],
						131
					);
					validateStreamProperties(
						streams[4],
						's5',
						0,
						[{gasket: 'ESS', bufferAddress: 12288, index: 3}],
						98
					);
					validateStreamProperties(
						streams[5],
						's6',
						256,
						[
							{gasket: 'FSS', bufferAddress: 0, index: 0},
							{gasket: 'ESS', bufferAddress: 16384, index: 4}
						],
						132
					);
				})
				.then(() => {
					cy.get(
						'[data-test="gasket-output-physical-connection-129"]'
					).click();

					// Delete the stream
					cy.get('[data-test="delete-stream-button"]').click();

					// Confirm the deletion
					cy.get('[data-test="confirm-delete-stream"]').click();

					cy.mount(<DfgStreamTable />, reduxStore).then(() => {
						cy.get('[data-test="stream-table-row-131-FSS"]').contains(
							'2 → 0'
						);
						cy.get('[data-test="stream-table-row-131-ESS"]').contains(
							'2 → 3'
						);
					});
				});
		});
	});
});

// eslint-disable-next-line max-params
export function createStreamAddEvent(
	desc: string,
	source: string,
	dests: string[],
	sourceBufferSize: number,
	destinationBufferSizes: number[],
	sourceIndex = 0,
	streamId = 0
) {
	const destinations = dests.map((dest, index) => ({
		BufferSize: destinationBufferSizes[index],
		BufferAddress: 0,
		Gasket: dest,
		Index: index
	}));

	return addNewStream({
		Description: desc,
		Source: {
			BufferSize: sourceBufferSize,
			BufferAddress: 0,
			Gasket: source,
			Index: sourceIndex
		},
		Destinations: destinations,
		StreamId: streamId,
		Group: '',
		Uuid: `${Math.random()}-${Math.random()}`
	});
}

// eslint-disable-next-line max-params
function validateStreamProperties(
	stream: DFGStreamUI,
	description: string,
	expectedSourceBufferAddress: number,
	expecteDestinationValues: Array<{
		gasket: string;
		bufferAddress: number;
		index?: number;
	}>,
	streamId?: number
) {
	const gasketsMap = getGasketDictionary();
	expect(stream.Description).to.equal(description);

	expect(stream.StreamId).to.equal(
		gasketsMap[stream.Source.Gasket].OutputStreams[
			stream.Source.Index
		].Index
	);

	// Source
	expect(stream.Source.BufferAddress).to.equal(
		expectedSourceBufferAddress
	);

	stream.Destinations.forEach(destination => {
		if (
			expecteDestinationValues.some(
				dest => dest.gasket === destination.Gasket
			)
		) {
			expect(destination.BufferAddress).to.equal(
				expecteDestinationValues.find(
					address =>
						address.gasket === destination.Gasket &&
						(address.index
							? address.index === destination.Index
							: true)
				)?.bufferAddress
			);
		}
	});

	if (streamId) {
		expect(stream.StreamId).to.equal(streamId);
	}

	expect(stream.Uuid).to.be.a('string');
}

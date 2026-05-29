/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {Provider} from 'react-redux';
import {configureTestStore} from '../../state/test-utils';
import MemoryGrid from './memory-grid';

describe('MemoryGrid', () => {
	it('displays addresses based on memory data', () => {
		const mockData = new Array(64).fill(0).map((_, i) => i);
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0x1000,
					data: mockData
				},
				sessions: [],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<MemoryGrid />
			</Provider>
		);

		cy.get('[data-test="address-row-0x00001000"]').should(
			'be.visible'
		);
		cy.get('[data-test="address-row-0x00001010"]').should(
			'be.visible'
		);
		cy.get('[data-test="address-row-0x00001020"]').should(
			'be.visible'
		);
		cy.get('[data-test="address-row-0x00001030"]').should(
			'be.visible'
		);
	});

	it('displays hex and ascii data based on memory data', () => {
		// Create mock data, ASCII alphabet starts at 0x41 (65 in decimal)
		const mockData = new Array(64).fill(0).map((_, i) => i + 64);
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0x1000,
					data: mockData
				},
				sessions: [],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<MemoryGrid />
			</Provider>
		);

		// Hex row will have children with hex values from 40 to 7F
		cy.get('[data-test^="hex-cell-0x00001000-"]').each(
			(cell, index) => {
				const expectedHex = (index + 64)
					.toString(16)
					.padStart(2, '0');
				cy.wrap(cell).should('have.text', expectedHex);
			}
		);
		cy.get('[data-test="ascii-cell-0x00001000"]').should(
			'contain',
			'@ABCDEFGHIJKLMNO'
		);
	});
});

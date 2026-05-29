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
import Footer from './footer';
import MemoryGrid from '../memory-grid/memory-grid';

const DEFAULT_NUM_COLUMNS = 16;
const DEFAULT_NUM_CELLS = DEFAULT_NUM_COLUMNS + 2;

// Create test memory data - 64 bytes
const TEST_MEMORY_DATA = Array.from({length: 64}, (_, i) => i);

const selectColumnOption = (value: number) => {
	cy.dataTest('footer-test-root').dataTest('memory-columns').click();
	cy.dataTest('footer-test-root')
		.dataTest('memory-columns')
		.find(`vscode-option[value="${value}"]`)
		.click();
};

describe('Footer', () => {
	describe('Columns dropdown', () => {
		beforeEach(() => {
			const store = configureTestStore({
				appContextReducer: {
					numColumns: DEFAULT_NUM_COLUMNS,
					activeSessionId: undefined,
					byteGrouping: 1,
					endianness: 'big',
					displayFormat: 'hex'
				},
				memoryReducer: {
					memoryBytes: {
						address: 0x1000,
						data: TEST_MEMORY_DATA
					},
					sessions: [],
					loading: false,
					error: undefined,
					reachedEndOfMemory: false
				}
			});

			cy.mount(
				<Provider store={store}>
					<div data-test='footer-test-root'>
						<MemoryGrid />
						<Footer />
					</div>
				</Provider>
			);
		});
		it('should update table when a column count is selected', () => {
			cy.dataTest('footer-test-root')
				.dataTest('address-row-0x00001000')
				.should('have.length', 1)
				.find('span')
				.should('have.length', DEFAULT_NUM_CELLS);

			selectColumnOption(8);

			cy.dataTest('footer-test-root')
				.dataTest('address-row-0x00001000')
				.should('have.length', 1)
				.find('span')
				.should('have.length', 10);
		});
	});
});

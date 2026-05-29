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
import {configureTestStore} from '../../../state/test-utils';
import AddressInput from './address-input';

describe('AddressInput', () => {
	it('displays an error for invalid hex input', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},

				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: true,
						isLive: true
					}
				],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});
		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0xZZZZ{enter}');
		cy.dataTest('address-error-invalidAddress').should('be.visible');
	});

	it('displays an error for invalid decimal input', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: true,
						isLive: true
					}
				],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});
		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('abc{enter}');
		cy.dataTest('address-error-invalidAddress').should('be.visible');
	});

	it('displays an error when the data is loading', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: false,
						isLive: true
					}
				],
				loading: true,
				error: undefined,
				reachedEndOfMemory: false
			}
		});
		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x1000{enter}');
		cy.dataTest('address-error-loadingData').should('be.visible');
	});

	it('is disabled when there are no active debug sessions', () => {
		const store = configureTestStore({
			appContextReducer: {
				numColumns: 16,
				activeSessionId: undefined,
				byteGrouping: 1,
				endianness: 'big',
				displayFormat: 'hex'
			},
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},
				sessions: [],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);
		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.should('be.disabled');
	});

	it('displays an error when the target is not halted', () => {
		const store = configureTestStore({
			appContextReducer: {
				numColumns: 16,
				activeSessionId: '1',
				byteGrouping: 1,
				endianness: 'big',
				displayFormat: 'hex'
			},
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: true,
						isLive: true
					}
				],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);
		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x0000{enter}');
		cy.dataTest('address-error-notHalted').should('be.visible');
	});
	it('does not display an error when a valid address is entered and there is a halted session', () => {
		const store = configureTestStore({
			appContextReducer: {
				numColumns: 16,
				activeSessionId: '1',
				byteGrouping: 1,
				endianness: 'big',
				displayFormat: 'hex'
			},
			memoryReducer: {
				memoryBytes: {
					address: undefined,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: false,
						isLive: true
					}
				],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);
		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x0000{enter}');
		cy.dataTest('address-error-invalidAddress').should('not.exist');
		cy.dataTest('address-error-noSessions').should('not.exist');
		cy.dataTest('address-error-notHalted').should('not.exist');
	});

	it('should not display an error when the session is not halted and the address is in memory', () => {
		const store = configureTestStore({
			appContextReducer: {
				numColumns: 16,
				activeSessionId: '1',
				byteGrouping: 1,
				endianness: 'big',
				displayFormat: 'hex'
			},
			memoryReducer: {
				memoryBytes: {
					address: 0x0000,
					data: Array(64).fill(0)
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Test Session',
						isRunning: true,
						isLive: true
					}
				],
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<AddressInput />
			</Provider>
		);
		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x0010{enter}');
		cy.dataTest('address-error-invalidAddress').should('not.exist');
		cy.dataTest('address-error-noSessions').should('not.exist');
		cy.dataTest('address-error-notHalted').should('not.exist');
	});
});

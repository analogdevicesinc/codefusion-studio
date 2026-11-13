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
import Toolbar from './toolbar';
import {mockVsCodeApi} from '../../../../common/api';
import type {SymbolsDataResponse} from '../../types/debug';

const MOCK_ADDRESS = 0x2000;
const MOCK_DATA_LENGTH = 32 * 1024;

function mountToolbar() {
	const store = configureTestStore({
		memoryReducer: {
			memoryBytes: {
				address: MOCK_ADDRESS,
				data: Array.from({length: MOCK_DATA_LENGTH}, () => 0),
				symbols: Array.from({length: 1}, () => ({
					id: 0,
					name: 'symbol',
					demangled: undefined,
					type: '',
					address: 0,
					section: undefined,
					size: 1,
					localstack: undefined,
					stack: undefined,
					bind: '',
					visibility: '',
					recursive: undefined,
					path: '',
					stackdepth: undefined
				}))
			},
			sessions: [
				{
					sessionId: 'current',
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
			<Toolbar />
		</Provider>
	);

	return store;
}

describe('Toolbar', () => {
	let postMessageStub: any;

	beforeEach(() => {
		postMessageStub = cy
			.stub()
			.as('postMessage')
			.callsFake((message: any) => {
				if (message.type === 'get-memory-data') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: {
									sessionId: message.body.sessionId,
									address: message.body.address,
									data: Array.from(
										{length: message.body.length},
										() => 255
									)
								}
							}
						})
					);
				}

				if (message.type === 'get-memory-at-symbol') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: {
									sessionId: message.body.sessionId,
									address: 0x5000,
									data: Array.from(
										{length: message.body.length},
										() => 255
									)
								},
								error: undefined
							}
						})
					);
				}

				if (message.type === 'get-symbol-data') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: [{name: 'name', address: 0}]
							}
						})
					);
				}

				if (message.type === 'get-symbols-at-symbol') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: [{name: 'name', address: 0}]
							}
						})
					);
				}
			});

		mockVsCodeApi({
			postMessage: postMessageStub,
			getState: cy.stub(),
			setState: cy.stub()
		});
	});

	it('sends the correct API request on refresh', () => {
		mountToolbar();

		cy.get('[data-test="refresh-button"]').click();

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-data',
				body: {
					sessionId: 'current',
					address: MOCK_ADDRESS,
					length: MOCK_DATA_LENGTH
				}
			})
		);
	});

	it('updates state with API response data after refresh', () => {
		const store = mountToolbar();

		cy.get('[data-test="refresh-button"]').click();

		// Use cy.should callback to retry until async thunk completes
		cy.wrap(store).should(() => {
			const {memoryBytes} = store.getState().memoryReducer;
			expect(memoryBytes.address).to.equal(MOCK_ADDRESS);
			expect(memoryBytes.data).to.have.length(MOCK_DATA_LENGTH);
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(memoryBytes.data.every((byte: number) => byte === 255))
				.to.be.true;
			expect(memoryBytes.symbols).to.have.length(1);
			expect(memoryBytes.symbols?.[0]).to.deep.equal({
				name: 'name',
				address: 0
			});
		});
	});

	it('fetches memory data when user enters hex address and presses enter', () => {
		mountToolbar();

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x1000{enter}');

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-data',
				body: {
					sessionId: 'current',
					address: 0x1000,
					length: 16 * 1024
				}
			})
		);
	});

	it('fetches memory data when user enters decimal address and presses enter', () => {
		const store = mountToolbar();

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('4096{enter}'); // 4096 decimal is 0x1000 hex

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-data',
				body: {
					sessionId: 'current',
					address: 0x1000,
					length: 16 * 1024
				}
			})
		);

		cy.wrap(store).should(() => {
			const {memoryBytes} = store.getState().memoryReducer;
			expect(memoryBytes.symbols).to.have.length(1);
			expect(memoryBytes.symbols?.[0]).to.deep.equal({
				name: 'name',
				address: 0
			});
		});
	});

	it('does not fetch memory data when user enters address with no halted sessions', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: MOCK_ADDRESS,
					data: Array.from({length: MOCK_DATA_LENGTH}, () => 0),
					symbols: [{name: 'name', address: 0} as SymbolsDataResponse]
				},
				sessions: [
					{
						sessionId: 'current',
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
				<Toolbar />
			</Provider>
		);

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x1000{enter}');

		cy.get('@postMessage').should('not.have.been.called');
	});

	it('does not fetch memory data when address is already in memory', () => {
		mountToolbar();
		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('0x3000{enter}');

		cy.get('@postMessage').should('not.have.been.called');
	});

	it('fetches memory at symbol when user enters non-numeric address', () => {
		const store = mountToolbar();

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('myVariable{enter}');

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-at-symbol',
				body: {
					sessionId: 'current',
					expression: 'myVariable',
					length: 16 * 1024
				}
			})
		);

		// Verify symbols are stored from API response
		cy.wrap(store).should(() => {
			const {memoryBytes} = store.getState().memoryReducer;
			expect(memoryBytes.symbols).to.have.length(1);
			expect(memoryBytes.symbols?.[0]).to.deep.equal({
				name: 'name',
				address: 0
			});
		});
	});

	it('disables refresh when active session is running even if another session is halted', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: MOCK_ADDRESS,
					data: Array.from({length: MOCK_DATA_LENGTH}, () => 0),
					symbols: [{name: 'name', address: 0} as SymbolsDataResponse]
				},
				sessions: [
					{
						sessionId: 'running-session',
						name: 'Running Session',
						isRunning: true,
						isLive: true
					},
					{
						sessionId: 'halted-session',
						name: 'Halted Session',
						isRunning: false,
						isLive: true
					}
				],
				activeSessionId: 'running-session',
				loading: false,
				error: undefined,
				reachedEndOfMemory: false
			}
		});

		cy.mount(
			<Provider store={store}>
				<Toolbar />
			</Provider>
		);

		cy.get('[data-test="refresh-button"]')
			.should('be.disabled')
			.click({force: true});

		cy.get('@postMessage').should('not.have.been.called');
	});

	it('displays error when symbol lookup fails', () => {
		// Override the stub to return an error for this test
		postMessageStub.callsFake((message: any) => {
			if (message.type === 'get-memory-at-symbol') {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							error: 'No symbol "invalidSymbol" in current context'
						}
					})
				);
			}
		});

		mountToolbar();

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('invalidSymbol{enter}');

		cy.dataTest('address-error-symbolNotFound').should('exist');
	});

	it('stores memory data with empty symbols when symbol request fails', () => {
		postMessageStub.callsFake((message: any) => {
			if (message.type === 'get-memory-data') {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: {
								sessionId: message.body.sessionId,
								address: message.body.address,
								data: Array.from(
									{length: message.body.length},
									() => 255
								)
							}
						}
					})
				);
			}

			if (message.type === 'get-symbol-data') {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							error: 'Symbol lookup failed'
						}
					})
				);
			}
		});

		const store = mountToolbar();

		cy.get('[data-test="refresh-button"]').click();

		// Memory data should be stored even when symbol request fails
		cy.wrap(store).should(() => {
			const {memoryBytes, error} = store.getState().memoryReducer;
			expect(memoryBytes.address).to.equal(MOCK_ADDRESS);
			expect(memoryBytes.data).to.have.length(MOCK_DATA_LENGTH);
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(memoryBytes.data.every((byte: number) => byte === 255))
				.to.be.true;
			// Symbols should fall back to empty array, not cause failure
			expect(memoryBytes.symbols).to.deep.equal([]);
			// No error should be set since memory fetch succeeded
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			expect(error).to.be.undefined;
		});
	});
});

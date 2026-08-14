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
import {mockVsCodeApi} from '../../../../../common/api';

describe('AddressInput', () => {
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
									data: new Array(message.body.length).fill(255)
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
									data: new Array(message.body.length).fill(255)
								},
								error: undefined
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

	it('displays read failed error when symbol lookup fails for non look up related reasons', () => {
		postMessageStub.callsFake((message: any) => {
			if (message.type === 'get-memory-at-symbol') {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							error: 'Error message'
						}
					})
				);
			}
		});

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
			.type('symbol{enter}');

		cy.dataTest('address-error-readFailed').should('be.visible');
	});

	it('displays error when symbol lookup fails', () => {
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
			.type('invalidSymbol{enter}');

		cy.dataTest('address-error-symbolNotFound').should('be.visible');
	});

	it('treats invalid hex input as symbol lookup', () => {
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

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-at-symbol',
				body: {
					sessionId: '1',
					expression: '0xZZZZ'
				}
			})
		);
	});

	it('treats non-numeric input as symbol lookup', () => {
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

		cy.get('@postMessage').should(
			'have.been.calledWithMatch',
			Cypress.sinon.match({
				type: 'get-memory-at-symbol',
				body: {
					sessionId: '1',
					expression: 'abc'
				}
			})
		);
	});

	it('treats valid decimal address strings with a preceding + as a valid address', () => {
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
			.type('+0{enter}');
		cy.dataTest('address-error-invalidAddress').should('not.exist');
		cy.dataTest('address-error-noSessions').should('not.exist');
		cy.dataTest('address-error-notHalted').should('not.exist');
	});

	it('treats decimal input with a preceding - as an invalid address', () => {
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
			.type('-1{enter}');

		cy.dataTest('address-error-invalidAddress').should('be.visible');
	});

	it('treats valid hex address strings with a preceding + as a valid address', () => {
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
			.type('+0x0000{enter}');
		cy.dataTest('address-error-invalidAddress').should('not.exist');
		cy.dataTest('address-error-noSessions').should('not.exist');
		cy.dataTest('address-error-notHalted').should('not.exist');
	});

	it('treats hex input with a preceding - as an invalid address', () => {
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
			.type('-0x1{enter}');

		cy.dataTest('address-error-invalidAddress').should('be.visible');
	});

	describe('API error handling', () => {
		const errorTestCases = [
			{
				errorCode: 'NoRequestBody',
				errorKey: 'noRequestBody',
				messageType: 'get-memory-at-symbol',
				input: 'symbol'
			},
			{
				errorCode: 'InvalidAddressSize',
				errorKey: 'invalidAddressSize',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'InvalidSessionId',
				errorKey: 'invalidSessionId',
				messageType: 'get-memory-at-symbol',
				input: 'symbol'
			},
			{
				errorCode: 'InvalidLength',
				errorKey: 'invalidLength',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'NoSessionIdFound',
				errorKey: 'noSessionIdFound',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'CannotReadMemory',
				errorKey: 'cannotReadMemory',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'NoRequestSessionId',
				errorKey: 'noRequestSessionId',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'SessionNotFound',
				errorKey: 'sessionNotFound',
				messageType: 'get-memory-data',
				input: '0x0000'
			},
			{
				errorCode: 'InvalidExpression',
				errorKey: 'invalidExpression',
				messageType: 'get-memory-at-symbol',
				input: 'symbol'
			},
			{
				errorCode: 'MalformedExpression',
				errorKey: 'malformedExpression',
				messageType: 'get-memory-at-symbol',
				input: '"symbol"'
			},
			{
				errorCode: 'SymbolNotFound',
				errorKey: 'symbolNotFound',
				messageType: 'get-memory-at-symbol',
				input: 'symbol'
			},
			{
				errorCode: 'SymbolQueryTimeout',
				errorKey: 'symbolQueryTimeout',
				messageType: 'get-memory-at-symbol',
				input: 'symbol'
			},
			{
				errorCode: 'MemoryReadTimeout',
				errorKey: 'memoryReadTimeout',
				messageType: 'get-memory-data',
				input: '0x0000'
			}
		];

		const createErrorStore = () =>
			configureTestStore({
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

		const setupErrorResponse = (
			messageType: string,
			errorCode: string
		) => {
			postMessageStub.callsFake((message: any) => {
				if (message.type === messageType) {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: undefined,
								error: errorCode
							}
						})
					);
				}
			});
		};

		errorTestCases.forEach(
			({errorCode, errorKey, messageType, input}) => {
				it(`displays ${errorKey} error when error code ${errorCode} is returned`, () => {
					setupErrorResponse(messageType, errorCode);

					const store = createErrorStore();

					cy.mount(
						<Provider store={store}>
							<AddressInput />
						</Provider>
					);

					cy.dataTest('address-control-input')
						.shadow()
						.find('input')
						.type(`${input}{enter}`);

					cy.dataTest(`address-error-${errorKey}`).should(
						'be.visible'
					);
				});
			}
		);
	});
});

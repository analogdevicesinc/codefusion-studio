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

const MOCK_ADDRESS = 0x2000;
const MOCK_DATA_LENGTH = 32 * 1024;

function mountToolbar() {
	const store = configureTestStore({
		memoryReducer: {
			memoryBytes: {
				address: MOCK_ADDRESS,
				data: new Array(MOCK_DATA_LENGTH).fill(0)
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
									data: new Array(message.body.length).fill(255)
								}
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
		mountToolbar();

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
	});

	it('does not fetch memory data when user enters invalid address', () => {
		mountToolbar();

		cy.dataTest('address-control-input')
			.shadow()
			.find('input')
			.type('invalid{enter}');

		cy.get('@postMessage').should('not.have.been.called');
	});

	it('does not fetch memory data when user enters address with no halted sessions', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: MOCK_ADDRESS,
					data: new Array(MOCK_DATA_LENGTH).fill(0)
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
});

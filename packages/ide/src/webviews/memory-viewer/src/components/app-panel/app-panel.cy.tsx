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
import AppPanel from './app-panel';

describe('AppPanel', () => {
	it('renders empty state when there are no debug sessions', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0,
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
				<AppPanel />
			</Provider>
		);
		cy.dataTest('empty-state:no-sessions').should('be.visible');
	});

	it('renders empty state when no session is halted', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Session 1',
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
				<AppPanel />
			</Provider>
		);
		cy.dataTest('empty-state:not-halted').should('be.visible');
	});

	it('renders empty state when memory data is empty', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Session 1',
						isRunning: false,
						isLive: true
					},
					{
						sessionId: '2',
						name: 'Session 2',
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
				<AppPanel />
			</Provider>
		);
		cy.dataTest('empty-state:no-data').should('be.visible');
	});

	it('renders memory grid when session is halted and memory data is available', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0,
					data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Session 1',
						isRunning: false,
						isLive: true
					},
					{
						sessionId: '2',
						name: 'Session 2',
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
				<AppPanel />
			</Provider>
		);
		cy.dataTest('memory-grid').should('be.visible');
	});

	it('renders error empty state when a read error occurs and no data is loaded', () => {
		const store = configureTestStore({
			memoryReducer: {
				memoryBytes: {
					address: 0,
					data: []
				},
				sessions: [
					{
						sessionId: '1',
						name: 'Session 1',
						isRunning: false,
						isLive: true
					}
				],
				loading: false,
				error: 'Cannot access memory at address 0xdeadbeef',
				reachedEndOfMemory: false
			}
		});
		cy.mount(
			<Provider store={store}>
				<AppPanel />
			</Provider>
		);
		cy.dataTest('empty-state:read-error').should('be.visible');
	});

});

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

import App from './App';
import {setupMessengerMock, sendMockMessage} from '../../common/test-utils/messenger-mock';
import {
 getProfilingViewData,
 updateProfilingConfiguration,
 applicationStatusUpdate
} from '../../../constants/messages/ai-hardware-profiling-messages';
import type {
	ApplicationStatus,
	HardwareResources,
	ProfilingConfiguration
} from '../../../types/ai-hardware-profiling-types';

let applicationStatus: ApplicationStatus;
let hardwareResources: HardwareResources;
let profilingConfig: ProfilingConfiguration;
let updateProfilingConfigCalls: number;

const l10n = await import('../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

describe('AiHardwareProfiling', () => {
	before(() => {
		setupMessengerMock({
			[getProfilingViewData.method]() {
				return {
				hardwareResources,
				profilingConfig,
				applicationStatus
				};
			},
			[updateProfilingConfiguration.method]() {
				updateProfilingConfigCalls += 1;
			}
		});
	});

	beforeEach(() => {
		applicationStatus = {
			buildStatus: 'idle',
			deployStatus: 'undeployed'
		};

		hardwareResources = {
			usbPorts: ['COM3', 'COM4'],
			debuggers: ['CMSIS-DAP', 'J-Link']
		};

		profilingConfig = {};
		updateProfilingConfigCalls = 0;
	});

	it('should render and update the two profiling dropdowns', () => {
		cy.mount(<App />);

		cy.get('#usb-port-controlDropdown').should('exist');
		cy.get('#debugger-select-controlDropdown').should('exist');

		cy.get('#usb-port-controlDropdown').click();
		cy.get('#usb-port-controlDropdown')
			.find('> vscode-option')
			.contains('COM3')
			.click();
		cy.get('#usb-port-controlDropdown').should('have.value', 'COM3');

		cy.get('#debugger-select-controlDropdown').click();
		cy.get('#debugger-select-controlDropdown')
			.find('> vscode-option')
			.contains('J-Link')
			.click();
		cy.get('#debugger-select-controlDropdown').should(
			'have.value',
			'J-Link'
		);

		cy.wrap(null).should(() => {
			expect(updateProfilingConfigCalls).to.equal(2);
		});
	});

	it('should update the header bar status when a notification is received', () => {
		cy.mount(<App />);

		cy.contains('Idle').should('exist');
		cy.contains('Undeployed').should('exist');

		cy.then(() => {
			sendMockMessage(applicationStatusUpdate.method, {
				buildStatus: 'built',
				deployStatus: 'running'
			});
		});

		cy.contains('Built').should('exist');
		cy.contains('Running').should('exist');

		cy.then(() => {
			sendMockMessage(applicationStatusUpdate.method, {
				buildStatus: 'built',
				deployStatus: 'stopped'
			});
		});

		cy.contains('Built').should('exist');
		cy.contains('Stopped').should('exist');
	});

});

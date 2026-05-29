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

import App from '../App';
import {
	setupMessengerMock,
	sendMockMessage
} from '../../../common/test-utils/messenger-mock';
import {
	traceConfigRequest,
	traceRecordingStateRequest,
	traceRecordingStateChangedNotification,
	traceConfigChangedNotification
} from '../../../../constants/messages/trace-messages';
import {getAvailableAiModelsRequest} from '../../../../constants/messages/global-cfs-messages';
import type {TraceConfiguration, TraceRecordingState} from '../../../../types/trace-types';
import type {AIModel} from 'cfs-types';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

let traceConfiguration: TraceConfiguration;
let recordingState: TraceRecordingState;
let availableAiModels: AIModel[];

describe('TraceConfiguration', () => {
	before(() => {
		setupMessengerMock({
			[traceConfigRequest.method]() {
				return traceConfiguration;
			},
			[traceRecordingStateRequest.method]() {
				return recordingState;
			},
			[getAvailableAiModelsRequest.method]() {
				return availableAiModels;
			}
		});
	});

	beforeEach(() => {
		traceConfiguration = {
			interfaceType: 'uart',
			serialPort: '/dev/ttyUSB0',
			baudRate: 115200,
			outputDirectory: '/tmp/trace',
			autoReset: false,
			elfFile: '/path/to/firmware.elf',
			buildDir: '/path/to/build',
			aiModels: []
		};

		recordingState = {isRecording: false};
		availableAiModels = [{Name: 'model-a'}, {Name: 'model-b'}] as AIModel[];
	});

	it('should render all form fields', () => {
		cy.mount(<App />);

		// Source Options - dropdowns use ID
		cy.get('#interface-type-controlDropdown').should('exist');
		cy.get('#serial-port-controlDropdown').should('exist');
		cy.dataTest('baud-rate-control-input').should('exist');

		// General Settings
		cy.dataTest('output-directory-control-input').should('exist');
		cy.dataTest('elf-file-control-input').should('exist');
		cy.dataTest('build-dir-control-input').should('exist');
	});

	it('should update the form when a configuration changed notification is received', () => {
		cy.mount(<App />);

		cy.dataTest('baud-rate-control-input').should('have.value', '115200');
		cy.dataTest('output-directory-control-input').should('have.value', '/tmp/trace');

		cy.then(() => {
			sendMockMessage(traceConfigChangedNotification.method, {
				...traceConfiguration,
				baudRate: 9600,
				outputDirectory: '/tmp/new-trace'
			} satisfies TraceConfiguration);
		});

		cy.dataTest('baud-rate-control-input').should('have.value', '9600');
		cy.dataTest('output-directory-control-input').should('have.value', '/tmp/new-trace');
	});

	it('should reflect recording state when a recording state changed notification is received', () => {
		cy.mount(<App />);

		cy.dataTest('active-recording-banner').should('not.exist');
		cy.dataTest('source-options-section').should('have.css', 'pointer-events', 'auto');
		cy.dataTest('general-settings-section').should('have.css', 'pointer-events', 'auto');

		cy.then(() => {
			sendMockMessage(traceRecordingStateChangedNotification.method, {
				isRecording: true,
				startTime: Date.now()
			} satisfies TraceRecordingState);
		});

		cy.dataTest('active-recording-banner').should('exist');
		cy.dataTest('source-options-section').should('have.css', 'pointer-events', 'none');
		cy.dataTest('general-settings-section').should('have.css', 'pointer-events', 'none');
	});
});


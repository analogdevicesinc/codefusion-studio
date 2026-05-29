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

import {
	exampleCompatReport,
	exampleProfileReport
} from './test-fixtures.cy';
import App from './App';
import type { Report } from "@ide-types/report-view-types";
import {setupMessengerMock} from '../../common/test-utils/messenger-mock';
import {
	reportRequestMessage,
	layerDataRequestMessage
} from '@constants/messages/report-view-messages';

let currentReport: Report;

describe('Report', () => {
	before(() => {
		setupMessengerMock({
			[reportRequestMessage.method]: () => currentReport,
			[layerDataRequestMessage.method]: {
				columns: Object.keys(
					exampleProfileReport.layer_performance[0]
				),
				rows: exampleProfileReport.layer_performance
			}
		});
	});

	it('should render profiling report correctly', () => {
		currentReport = exampleProfileReport;
		cy.mount(<App />);

		cy.dataTest('compatibility-report').should('not.exist');

		cy.dataTest('profile-summary-section')
			.should('exist')
			.should('contain.text', '9/12 Accelerated')
			.should('contain.text', '/models/mnist_cnn_int8.tflite');

		// Collapsing summary
		cy.dataTest('summary-expand-button').click();
		cy.dataTest('profile-summary-section').should(
			'not.contain.text',
			'9/12 Accelerated'
		);

		cy.dataTest('model-layers-section').should('exist');
		cy.dataTest('row-expand-button-0').should('exist');
		cy.dataTest('row-expand-button-0').click();

		cy.dataTest('layer-row-0').should('contain.text', '[16, 16, 16]');
		cy.dataTest('layer-row-0').should(
			'contain.text',
			'Try smaller kernel size or depthwise separation'
		);
	});

	it('should render compatibility report correctly', () => {
		currentReport = exampleCompatReport;
		cy.mount(<App />);
		cy.dataTest('profile-summary-section').should('not.exist');

		cy.dataTest('compatibility-report').should('exist');

		cy.dataTest('memory-issues').should('exist');
		cy.dataTest('memory-issues-no-issues').should('exist');
		cy.dataTest('memory-issues-issue-list').should('not.exist');

		cy.dataTest('operator-issues').should('exist');
		cy.dataTest('operator-issues-list')
			.should('exist')
			.should('not.contain.text', '0, 1, 2')
			.within(() => {
				cy.dataTest('collapse-toggle').click();
			})
			.should('contain.text', '0, 1, 2');

		cy.dataTest('unsupported-types').should('exist');
		cy.dataTest('unsupported-types-list').should('exist');
	});
});

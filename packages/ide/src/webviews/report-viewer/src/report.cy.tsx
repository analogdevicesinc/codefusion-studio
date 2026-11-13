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
	exampleProfileReport,
	exampleRuntimeProfileReport
} from './test-fixtures.cy';
import App from './App';
import type {Report} from '@ide-types/report-view-types';
import {setupMessengerMock} from '../../common/test-utils/messenger-mock';
import {
	reportRequestMessage,
	layerDataRequestMessage
} from '@constants/messages/report-view-messages';

const l10n = await import('../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

let currentReport: Report;

describe('Report', () => {
	before(() => {
		setupMessengerMock({
			[reportRequestMessage.method]: () => currentReport,
			[layerDataRequestMessage.method]() {
				const isRuntime = currentReport.type === 'runtime-profile';
				const layerPerformance = isRuntime
					? exampleRuntimeProfileReport.layer_performance
					: exampleProfileReport.layer_performance;

				return {
					kind: isRuntime ? 'runtime-profile' : 'profile',
					columns: Object.keys(layerPerformance[0]),
					rows: layerPerformance
				};
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

	it('should render runtime profiling report correctly', () => {
		currentReport = exampleRuntimeProfileReport;
		cy.mount(<App />);

		cy.dataTest('compatibility-report').should('not.exist');
		cy.contains('Runtime Profile Report').should('exist');

		cy.dataTest('profile-summary-section')
			.should('exist')
			.should('contain.text', '2/3 Accelerated')
			.should('contain.text', '/models/keyword_spotting_int8.tflite');

		// Runtime-specific footer/columns - only render correctly if the
		// extension-side layer data handler propagates `kind` so
		// DataInfoFooter can tell this apart from a static profile report.
		cy.dataTest('model-layers-section')
			.should('exist')
			.should('contain.text', 'avg_latency')
			.should('contain.text', 'Total Layers Latency')
			.should('contain.text', '6 ms')
			.should('contain.text', 'Peak Memory')
			.should('contain.text', '20kb')
			.should('not.contain.text', 'Peak Memory Usage');
	});

	it('should strip a long model path on the left side, keeping the file name visible', () => {
		const longModelPath =
			'/very/long/nested/directory/structure/that/does/not/fit/into/the/available/space/models/mnist_cnn_int8.tflite';

		currentReport = {
			...exampleProfileReport,
			model_summary: {
				...exampleProfileReport.model_summary,
				model_path: longModelPath
			}
		};
		cy.mount(<App />);

		cy.dataTest('model-path-value')
			.should('have.css', 'direction', 'rtl')
			.should(([element]) => {
				expect(
					element.scrollWidth,
					'text should overflow its container so the truncation is actually exercised'
				).to.be.greaterThan(element.clientWidth);
			})
			.invoke('text')
			.should('equal', longModelPath);

		cy.dataTest('model-path-value')
			.find('span')
			.should('have.attr', 'dir', 'ltr');
	});

	it('should strip a long runtime model path on the left side, keeping the file name visible', () => {
		const longModelPath =
			'/very/long/nested/directory/structure/that/does/not/fit/into/the/available/space/models/keyword_spotting_int8.tflite';

		currentReport = {
			...exampleRuntimeProfileReport,
			model_summary: {
				...exampleRuntimeProfileReport.model_summary,
				model_path: longModelPath
			}
		};
		cy.mount(<App />);

		cy.dataTest('model-path-value')
			.should('have.css', 'direction', 'rtl')
			.should(([element]) => {
				expect(
					element.scrollWidth,
					'text should overflow its container so the truncation is actually exercised'
				).to.be.greaterThan(element.clientWidth);
			})
			.invoke('text')
			.should('equal', longModelPath);

		cy.dataTest('model-path-value')
			.find('span')
			.should('have.attr', 'dir', 'ltr');
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

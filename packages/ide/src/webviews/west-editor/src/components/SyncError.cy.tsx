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
import type {WestYamlProblem} from '@west-editor/types';
import {westEditorRevealRequest} from '@west-editor/messages';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {MessengerProvider} from '@common/contexts/MessengerContext';
import {setupMessengerMock} from '@common/test-utils/messenger-mock';
import {WestEditorContext} from '../contexts/WestEditorContext';
import SyncError from './SyncError';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

const problems: WestYamlProblem[] = [
	{
		message: 'Bad key',
		line: 9,
		column: 5,
		frame: ' 9|     zcbor\n        ^^^^^',
		start: 120,
		end: 125
	},
	// Errors can share a start offset
	{
		message: 'Other',
		line: 9,
		column: 5,
		frame: ' 9|     zcbor\n        ^',
		start: 120,
		end: 121
	}
];

function mountError(
	{error, problems}: {error?: string; problems?: WestYamlProblem[]},
	onReveal: (message: any) => unknown = () => undefined
) {
	setupMessengerMock({[westEditorRevealRequest.method]: onReveal});
	cy.mount(
		<MessengerProvider>
			<WestEditorContext.Provider
				value={{
					groups: [],
					loading: false,
					error,
					problems,
					updateManifest: cy.stub()
				}}
			>
				<LocalizationProvider namespace='west-editor'>
					<SyncError />
				</LocalizationProvider>
			</WestEditorContext.Provider>
		</MessengerProvider>
	);
}

describe('SyncError', () => {
	it('renders nothing while the manifest is in sync', () => {
		mountError({});

		cy.dataTest('west-editor:error').should('not.exist');
	});

	it('shows an error without problems as its message, line breaks kept', () => {
		mountError({
			error: 'Invalid west.yml structure:\nprojects.0.name: Required'
		});

		cy.dataTest('west-editor:error')
			.should('contain.text', 'Could not sync west.yml:')
			.find('pre')
			.should(
				'have.text',
				'Invalid west.yml structure:\nprojects.0.name: Required'
			)
			.and('have.css', 'white-space', 'pre-wrap');
		cy.get('[data-test^="west-editor:error-reveal-"]').should(
			'not.exist'
		);
	});

	it('shows each YAML problem in its own block, its location as the link', () => {
		mountError({error: 'Invalid YAML', problems});

		cy.dataTest('west-editor:error').should(
			'contain.text',
			'Could not sync west.yml: Invalid YAML:'
		);
		cy.dataTest('west-editor:error')
			.find('pre')
			.should('have.length', 2)
			.first()
			.should(
				'have.text',
				`Bad key at line 9, column 5:\n\n${problems[0].frame}`
			);
		cy.dataTest('west-editor:error-reveal-0')
			.should('have.text', 'at line 9, column 5')
			.and(
				'have.attr',
				'aria-label',
				'at line 9, column 5, show in text editor'
			);
		cy.dataTest('west-editor:error-reveal-1').should('exist');
	});

	it('asks the host to select the span of the clicked problem', () => {
		const onReveal = cy.stub().as('onReveal');
		mountError({error: 'Invalid YAML', problems}, onReveal);

		cy.dataTest('west-editor:error-reveal-1').click();

		cy.get('@onReveal')
			.should('have.been.calledOnce')
			.and('have.been.calledWithMatch', {
				params: {start: 120, end: 121}
			});
	});

	it('leaves logging a failed reveal to the host', () => {
		const onReveal = cy
			.stub()
			.as('onReveal')
			.throws(new Error('cannot open'));
		mountError({error: 'Invalid YAML', problems}, onReveal);
		cy.window().then(win => {
			cy.stub(win.console, 'error').as('consoleError');
		});

		cy.dataTest('west-editor:error-reveal-0').click();

		cy.get('@onReveal').should('have.been.calledOnce');
		cy.get('@consoleError').should('not.have.been.called');
	});
});

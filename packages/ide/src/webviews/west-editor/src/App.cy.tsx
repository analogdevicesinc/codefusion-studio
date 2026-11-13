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
import {
	NO_RESPONSE,
	sendMockErrorResponse,
	sendMockMessage,
	setupMessengerMock
} from '../../common/test-utils/messenger-mock';
import {
	westEditorChangedNotification,
	westEditorImportsRequest,
	westEditorOpenManifestRequest,
	westEditorProjectStatusRequest,
	westEditorRequestMessage,
	westEditorRevealRequest,
	westEditorStatusChangedNotification,
	westEditorUpdateRequest
} from '@west-editor/messages';
import type {WestManifest} from '@west-editor/types';

const l10n = await import('../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

const manifest: WestManifest = {
	version: '0.13',
	remotes: [
		{name: 'origin', 'url-base': 'https://example.com'},
		{name: 'upstream', 'url-base': 'https://example.org'}
	],
	projects: [
		{name: 'app', remote: 'origin', path: 'app'},
		{
			name: 'hal_nordic',
			remote: 'origin',
			path: 'modules/hal/nordic',
			import: 'submanifests/west.yml'
		}
	]
};

describe('WestEditor navigation bar', () => {
	beforeEach(() => {
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => manifest,
			// Stands in for the host's disk lookup: the directory import of
			// `self` has already been expanded to the file inside it.
			[westEditorImportsRequest.method]: () => [
				{path: 'app/submanifests/extra.yml'},
				{
					projectName: 'hal_nordic',
					path: 'modules/hal/nordic/submanifests/west.yml'
				}
			]
		});
		cy.mount(<App />);
	});

	it('shows the four section tabs, with Projects selected', () => {
		cy.get('[role="tab"]').should(
			'have.text',
			'ProjectsRemotesManifestsGroups'
		);
		cy.get('[role="tab"][aria-selected="true"]').should(
			'have.text',
			'Projects'
		);
	});

	it('swaps the section below the bar when a tab is selected', () => {
		cy.dataTest('west-editor:navigation-bar:tab-remotes').click();
		cy.dataTest('west-editor:remote-name-0').should(
			'have.text',
			'origin'
		);
		cy.dataTest('west-editor:project-name-0').should('not.exist');

		cy.dataTest('west-editor:navigation-bar:tab-manifests').click();
		cy.dataTest('west-editor:manifests-count').should(
			'have.text',
			'2 Manifests'
		);
		cy.dataTest('west-editor:manifest-path-0').should(
			'have.text',
			'app/submanifests/extra.yml'
		);
		cy.dataTest('west-editor:manifest-project-0').should(
			'have.text',
			'self'
		);
		cy.dataTest('west-editor:manifest-project-1').should(
			'have.text',
			'hal_nordic'
		);
	});

	it('heads the remotes list with the number of remotes', () => {
		cy.dataTest('west-editor:navigation-bar:tab-remotes').click();

		cy.dataTest('west-editor:remotes-count').should(
			'have.text',
			'2 Remotes'
		);
		cy.dataTest('west-editor:remote-card-0').should('exist');
		cy.dataTest('west-editor:remote-card-1').should('exist');
		cy.dataTest('west-editor:remote-card-2').should('not.exist');
	});

	it('copies the url-base of the remote whose button was clicked', () => {
		cy.window().then(win => {
			// Defined defensively: navigator.clipboard is only exposed in a
			// secure context, so there is not always an object to stub.
			if (!win.navigator.clipboard) {
				Object.defineProperty(win.navigator, 'clipboard', {
					configurable: true,
					value: {writeText: async () => undefined}
				});
			}

			// `as` before `resolves`: `resolves` returns a bare SinonStub, which
			// no longer carries Cypress's aliasing.
			cy.stub(win.navigator.clipboard, 'writeText')
				.as('writeText')
				.resolves();
		});

		cy.dataTest('west-editor:navigation-bar:tab-remotes').click();
		// The second card on purpose: copying the first remote regardless of
		// which button was pressed is the mistake this guards against.
		cy.dataTest('west-editor:remote-copy-1').click();

		cy.get('@writeText').should(
			'have.been.calledOnceWith',
			'https://example.org'
		);
	});

	it('opens the help modal from the Help button and closes it', () => {
		cy.get('dialog').should('not.be.visible');

		cy.dataTest('west-editor:navigation-bar:help').click();
		cy.get('dialog')
			.should('be.visible')
			.and('contain.text', 'West Editor Help')
			.and('contain.text', 'Search Projects');

		cy.get('dialog [aria-label="Close"]').click();
		cy.get('dialog').should('not.be.visible');
	});
});

describe('WestEditor groups tab', () => {
	const groupsManifest: WestManifest = {
		projects: [
			{name: 'app', groups: ['tools', 'hal']},
			{name: 'sim', groups: ['babblesim']}
		],
		'group-filter': ['-optional', '+babblesim']
	};

	beforeEach(() => {
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => groupsManifest,
			[westEditorImportsRequest.method]: () => [],
			[westEditorUpdateRequest.method]: cy.stub().as('onUpdate')
		});
		cy.mount(<App />);
		cy.dataTest('west-editor:navigation-bar:tab-groups').click();
	});

	it('lists project and filter-only groups alphabetically', () => {
		cy.dataTest('west-editor:groups-count').should(
			'have.text',
			'4 Groups'
		);
		cy.dataTest('west-editor:group-name-0').should(
			'have.text',
			'babblesim'
		);
		cy.dataTest('west-editor:group-name-1').should(
			'have.text',
			'hal'
		);
		cy.dataTest('west-editor:group-name-2').should(
			'have.text',
			'optional'
		);
		cy.dataTest('west-editor:group-name-3').should(
			'have.text',
			'tools'
		);
	});

	it('shows the state of each group from the group filter', () => {
		cy.dataTest('west-editor:group-state-0').should(
			'have.value',
			'enabled'
		);
		cy.dataTest('west-editor:group-state-1').should(
			'have.value',
			'none'
		);
		cy.dataTest('west-editor:group-state-2').should(
			'have.value',
			'disabled'
		);
	});

	it('writes a changed state back to the group filter', () => {
		cy.dataTest('west-editor:group-state-3').click();
		cy.dataTest('west-editor:group-state-3')
			.find('> vscode-option')
			.contains('Disabled')
			.click();

		cy.get('@onUpdate').should('have.been.calledWithMatch', {
			params: {'group-filter': ['-optional', '+babblesim', '-tools']}
		});
	});
});

describe('WestEditor failed write', () => {
	it('keeps the tabs, since the manifest is still loaded', () => {
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => ({
				'group-filter': ['-optional']
			}),
			[westEditorImportsRequest.method]: () => [],
			[westEditorUpdateRequest.method]() {
				throw new Error('Failed to apply changes to west.yml.');
			}
		});
		cy.mount(<App />);
		cy.dataTest('west-editor:navigation-bar:tab-groups').click();

		cy.dataTest('west-editor:group-state-0').click();
		cy.dataTest('west-editor:group-state-0')
			.find('> vscode-option')
			.contains('Enabled')
			.click();

		cy.dataTest('west-editor:error').should(
			'contain.text',
			'Failed to apply changes to west.yml.'
		);
		cy.get('[role="tab"]').should('have.length', 4);
	});
});

describe('WestEditor project groups', () => {
	let current: WestManifest;

	beforeEach(() => {
		current = {projects: [{name: 'app', groups: ['hal']}]};
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => current,
			[westEditorImportsRequest.method]: () => [],
			[westEditorUpdateRequest.method]: cy.stub().as('onUpdate')
		});
		cy.mount(<App />);
	});

	it('writes a created group to the project', () => {
		cy.dataTest('west-editor:project-group-add-0').click();
		cy.dataTest('west-editor:project-group-create-0').click();
		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('tools{enter}');

		cy.dataTest('west-editor:project-group-0-tools').should('exist');
		cy.get('@onUpdate').should('have.been.calledWithMatch', {
			params: {projects: [{name: 'app', groups: ['hal', 'tools']}]}
		});
	});

	it('shows the groups of a manifest edited outside the editor', () => {
		cy.dataTest('west-editor:project-group-0-hal').should('exist');

		cy.then(() => {
			current = {projects: [{name: 'app', groups: ['babblesim']}]};
			sendMockMessage(westEditorChangedNotification.method);
		});

		cy.dataTest('west-editor:project-group-0-babblesim').should(
			'exist'
		);
		cy.dataTest('west-editor:project-group-0-hal').should(
			'not.exist'
		);
	});
});

describe('WestEditor manifests tab', () => {
	function mountWithImports(onOpen: (message: any) => void) {
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => manifest,
			[westEditorImportsRequest.method]: () => [
				{
					projectName: 'zephyr',
					path: 'zephyr/west.yml',
					absolutePath: '/ws/zephyr/west.yml'
				},
				// Outside a workspace a project import cannot be located.
				{projectName: 'hal_nordic', path: 'hal_nordic/west.yml'}
			],
			[westEditorOpenManifestRequest.method]: onOpen
		});
		cy.mount(<App />);
		cy.dataTest('west-editor:navigation-bar:tab-manifests').click();
	}

	it('asks the host to open the manifest by its absolute path', () => {
		const onOpen = cy.stub().as('onOpen');
		mountWithImports(onOpen);

		cy.dataTest('west-editor:manifest-open-0').click();

		cy.get('@onOpen').should('have.been.calledWithMatch', {
			params: '/ws/zephyr/west.yml'
		});
	});

	it('disables opening a manifest that cannot be located', () => {
		mountWithImports(() => undefined);

		cy.dataTest('west-editor:manifest-open-1').should(
			'have.attr',
			'disabled'
		);
	});

	it('leaves logging a failed open to the host', () => {
		const onOpen = cy
			.stub()
			.as('onOpen')
			.throws(new Error('missing'));
		mountWithImports(onOpen);
		cy.window().then(win => {
			cy.stub(win.console, 'error').as('consoleError');
		});

		cy.dataTest('west-editor:manifest-open-0').click();

		cy.get('@onOpen').should('have.been.calledOnce');
		// The rejection is settled in the webview without a console entry;
		// Cypress would also fail the test on an unhandled rejection.
		cy.get('@consoleError').should('not.have.been.called');
	});
});

describe('WestEditor project statuses', () => {
	it('shows the status the host reports, and asks again when told to', () => {
		const onStatus = cy
			.stub()
			.as('onStatus')
			.returns({
				statuses: {app: 'in-sync', hal_nordic: 'modified-files'}
			});
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => manifest,
			[westEditorImportsRequest.method]: () => [],
			[westEditorProjectStatusRequest.method]: onStatus
		});
		cy.mount(<App />);

		cy.dataTest('west-editor:project-status-0').should(
			'have.text',
			'In Sync'
		);
		cy.dataTest('west-editor:project-status-1').should(
			'have.text',
			'Modified Files'
		);
		cy.get('@onStatus').should('have.been.calledOnce');

		cy.then(() => {
			sendMockMessage(westEditorStatusChangedNotification.method);
		});

		cy.get('@onStatus').should('have.been.calledTwice');
	});
});

describe('WestEditor project statuses when the host fails', () => {
	it('stops loading and shows no badge', () => {
		setupMessengerMock({
			[westEditorRequestMessage.method]: () => manifest,
			[westEditorImportsRequest.method]: () => [],
			[westEditorProjectStatusRequest.method]: () => {
				throw new Error('engine failed');
			}
		});
		cy.mount(<App />);

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-status-0').should('not.exist');
	});
});

describe('WestEditor YAML errors', () => {
	const problems = [
		{
			message: 'Bad key',
			line: 9,
			column: 5,
			frame: ' 9|     zcbor\n        ^',
			start: 120,
			end: 125
		},
		{
			message: 'Bad value',
			line: 12,
			column: 3,
			frame: ' 12|   @x\n       ^',
			start: 200,
			end: 201
		}
	];

	beforeEach(() => {
		const onReveal = cy.stub().as('onReveal');
		setupMessengerMock({
			// The host rejects with a plain response error carrying the problems.
			[westEditorRequestMessage.method](message: any) {
				setTimeout(() => {
					sendMockErrorResponse(message, {
						message: 'Invalid YAML',
						data: problems
					});
				});

				return NO_RESPONSE;
			},
			[westEditorRevealRequest.method]: onReveal
		});
		cy.mount(<App />);
	});

	it('shows each error with its location as a link', () => {
		cy.dataTest('west-editor:error').should(
			'contain.text',
			'Bad key at line 9, column 5:'
		);
		cy.dataTest('west-editor:error-reveal-0').should(
			'have.text',
			'at line 9, column 5'
		);
		cy.dataTest('west-editor:error-reveal-1').should(
			'have.text',
			'at line 12, column 3'
		);
	});

	it('shows only the error while the manifest cannot be read', () => {
		cy.dataTest('west-editor:error').should('be.visible');
		cy.get('[role="tab"]').should('not.exist');
		cy.get('[role="tabpanel"]').should('not.exist');
	});

	it('asks the host to select the span of the clicked error', () => {
		cy.dataTest('west-editor:error-reveal-1').click();

		cy.get('@onReveal').should('have.been.calledWithMatch', {
			params: {start: 200, end: 201}
		});
	});
});

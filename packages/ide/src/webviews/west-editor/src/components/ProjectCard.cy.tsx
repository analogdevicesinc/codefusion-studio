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

import type {
	WestProject,
	WestProjectStatus
} from '@west-editor/types';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import ProjectCard from './ProjectCard';
import type {BadgeStatus} from './StatusBadge';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

type CardOverrides = {
	project?: WestProject;
	resolvedUrl?: string;
	effectivePath?: string;
	inheritedRevision?: string;
	searchTerm?: string;
	status?: BadgeStatus;
};

function mountCard(overrides: CardOverrides = {}) {
	// Spread rather than destructuring defaults, so a test can override
	// `resolvedUrl` back to `undefined`.
	const props = {
		project: {name: 'zephyr', revision: 'main'},
		resolvedUrl: 'https://github.com/zephyrproject-rtos/zephyr',
		effectivePath: 'zephyr',
		inheritedRevision: undefined,
		searchTerm: undefined,
		status: undefined,
		...overrides
	};

	cy.mount(
		<LocalizationProvider namespace='west-editor'>
			<ProjectCard
				project={props.project}
				resolvedUrl={props.resolvedUrl}
				effectivePath={props.effectivePath}
				inheritedRevision={props.inheritedRevision}
				index={0}
				searchTerm={props.searchTerm}
				availableGroups={['hal']}
				status={props.status}
				onRevisionChange={cy.stub().as('onRevisionChange')}
				onGroupsChange={cy.stub().as('onGroupsChange')}
				onDelete={cy.stub().as('onDelete')}
			/>
		</LocalizationProvider>
	);
}

describe('ProjectCard', () => {
	it('shows a pill for each of the project groups', () => {
		mountCard({project: {name: 'zephyr', groups: ['hal', 'tools']}});

		cy.dataTest('west-editor:project-group-0-hal').should(
			'contain.text',
			'hal'
		);
		cy.dataTest('west-editor:project-group-0-tools').should(
			'contain.text',
			'tools'
		);
		cy.dataTest('west-editor:project-group-remove-0-tools').click();
		cy.get('@onGroupsChange').should('have.been.calledOnceWith', [
			'hal'
		]);
	});

	it('renders the project name as the card heading', () => {
		mountCard();

		cy.dataTest('west-editor:project-name-0')
			.should('have.prop', 'tagName', 'H2')
			.and('have.text', 'zephyr');
	});

	it('highlights every occurrence of the search term in the name', () => {
		mountCard({
			project: {name: 'test_esim'},
			searchTerm: 'es'
		});

		cy.dataTest('west-editor:project-name-0')
			.should('have.text', 'test_esim')
			.find('mark')
			.should('have.length', 2)
			.each($mark => {
				expect($mark.text()).to.equal('es');
			});
	});

	it('leaves the name unmarked without a search term', () => {
		mountCard();

		cy.dataTest('west-editor:project-name-0')
			.should('have.text', 'zephyr')
			.find('mark')
			.should('not.exist');
	});

	it('renders the resolved path and URL', () => {
		mountCard();

		cy.dataTest('west-editor:project-path-0').should(
			'have.text',
			'zephyr'
		);
		cy.dataTest('west-editor:project-url-0').should(
			'have.text',
			'https://github.com/zephyrproject-rtos/zephyr'
		);
	});

	it('omits the URL row when no URL resolves', () => {
		mountCard({resolvedUrl: undefined});

		cy.dataTest('west-editor:project-path-0').should('exist');
		cy.dataTest('west-editor:project-url-0').should('not.exist');
	});

	it('shows an inherited revision as a placeholder rather than a value', () => {
		mountCard({project: {name: 'zephyr'}, inheritedRevision: 'main'});

		cy.dataTest('west-editor:project-revision-0-control-input')
			.should('have.value', '')
			.and('have.attr', 'placeholder', 'main');
	});

	it('reports a typed revision', () => {
		mountCard({project: {name: 'zephyr', revision: ''}});

		cy.dataTest('west-editor:project-revision-0-control-input')
			.shadow()
			.find('input')
			.type('v');

		cy.get('@onRevisionChange').should('have.been.calledWith', 'v');
	});

	it('reports a delete', () => {
		mountCard();

		cy.dataTest('west-editor:project-remove-0').click();

		cy.get('@onDelete').should('have.been.called');
	});

	it('shows no status badge without a status', () => {
		mountCard();

		cy.dataTest('west-editor:project-status-0').should('not.exist');
	});

	// The icon's selector: a codicon class, or svg for the badges' own icons.
	const badges: Array<[WestProjectStatus, string, string]> = [
		['in-sync', 'In Sync', '.codicon-pass'],
		['different-revision', 'Different Revision', '.codicon-warning'],
		['not-cloned', 'Not Cloned', '.codicon-warning'],
		['modified-files', 'Modified Files', 'svg'],
		['untracked-files', 'Untracked Files', 'svg'],
		['disabled', 'Disabled', '.codicon-circle-slash']
	];

	it('shows a spinner and Loading while the status is read', () => {
		mountCard({status: 'loading'});

		cy.dataTest('west-editor:project-status-0')
			.should('have.text', 'Loading')
			.find('vscode-progress-ring')
			.should('exist');
	});

	it('colors the Modified and Untracked Files icons in the warning yellow', () => {
		for (const status of [
			'modified-files',
			'untracked-files'
		] as const) {
			mountCard({status});

			// #CCA700: the chart-yellow fallback, as no VS Code theme is loaded here.
			cy.dataTest('west-editor:project-status-0')
				.find('svg')
				.should('have.css', 'color', 'rgb(204, 167, 0)');
		}
	});

	for (const [status, label, icon] of badges) {
		it(`shows the ${label} badge beside the name`, () => {
			mountCard({status});

			cy.dataTest('west-editor:project-status-0')
				.should('have.text', label)
				.find(icon)
				.should('exist');
		});
	}
});

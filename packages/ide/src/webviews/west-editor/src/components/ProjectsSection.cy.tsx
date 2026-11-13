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

import {useState} from 'react';
import type {
	WestManifest,
	WestProjectStatus
} from '@west-editor/types';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {WestEditorContext} from '../contexts/WestEditorContext';
import {collectGroups} from '../utils/group-filter';
import ProjectsSection from './ProjectsSection';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

const manifest: WestManifest = {
	defaults: {remote: 'origin'},
	remotes: [{name: 'origin', 'url-base': 'https://example.com/org'}],
	projects: [
		{name: 'zephyr'},
		{name: 'babblesim_base'},
		{name: 'hal_adi'}
	]
};

const SEARCH_INPUT = 'west-editor:project-search-control-input';

function mountSection(
	overrides: Partial<WestManifest> = {},
	{
		groups = [],
		statuses = {}
	}: {
		groups?: string[];
		/** `null` while the first statuses are loading. */
		statuses?: Record<string, WestProjectStatus> | null;
	} = {}
) {
	cy.mount(
		<WestEditorContext.Provider
			value={{
				manifest: {...manifest, ...overrides},
				groups,
				loading: false,
				statuses: statuses ?? undefined,
				updateManifest: cy.stub().as('updateManifest')
			}}
		>
			<LocalizationProvider namespace='west-editor'>
				<ProjectsSection />
			</LocalizationProvider>
		</WestEditorContext.Provider>
	);
}

function typeSearch(text: string) {
	cy.dataTest(SEARCH_INPUT).shadow().find('input').type(text);
}

describe('ProjectsSection search', () => {
	it('shows every project and the placeholder before anything is typed', () => {
		mountSection();

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-2').should('exist');

		cy.dataTest(SEARCH_INPUT)
			.should('have.value', '')
			.and('have.attr', 'placeholder', 'Search Projects');
	});

	it('matches a substring in the middle of a name', () => {
		mountSection();
		typeSearch('esim');

		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-0').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');
	});

	it('ignores case', () => {
		mountSection();
		typeSearch('HAL');

		cy.dataTest('west-editor:project-card-2').should('exist');
		cy.dataTest('west-editor:project-card-0').should('not.exist');
	});

	it('highlights the matched text in the surviving card', () => {
		mountSection();
		typeSearch('esim');

		cy.dataTest('west-editor:project-name-1')
			.should('have.text', 'babblesim_base')
			.find('mark')
			.should('have.text', 'esim');
	});

	// The delete closure addresses the manifest by index, so a filtered card
	// has to keep the index it had in the unfiltered list.
	it('deletes the entry the filtered card actually points at', () => {
		mountSection();
		typeSearch('hal');

		cy.dataTest('west-editor:project-remove-2').click();

		cy.get('@updateManifest').should('have.been.calledWithMatch', {
			projects: [{name: 'zephyr'}, {name: 'babblesim_base'}]
		});
	});

	it('shows the no-results state with the query echoed back', () => {
		mountSection();
		typeSearch('abcdef');

		cy.dataTest('west-editor:project-card-0').should('not.exist');
		cy.dataTest('west-editor:projects-no-results')
			.should('contain.text', 'No Results')
			.and('contain.text', 'No matching results for “abcdef”.');
	});

	it('keeps the text and the filtered list after clicking away', () => {
		mountSection();
		typeSearch('esim');

		cy.dataTest(SEARCH_INPUT).shadow().find('input').blur();

		cy.dataTest(SEARCH_INPUT).should('have.value', 'esim');
		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-0').should('not.exist');
	});

	it('restores every project when the text is cleared', () => {
		mountSection();
		typeSearch('esim');

		cy.dataTest(SEARCH_INPUT).shadow().find('input').clear();

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-2').should('exist');
		cy.dataTest(SEARCH_INPUT)
			.should('have.value', '')
			.and('have.attr', 'placeholder', 'Search Projects');
		cy.dataTest('west-editor:project-name-1')
			.find('mark')
			.should('not.exist');
	});

	it('keeps the manifest-is-empty message distinct from no search results', () => {
		mountSection({projects: undefined});

		cy.contains('No projects defined.').should('exist');
		cy.dataTest('west-editor:projects-no-results').should(
			'not.exist'
		);
	});
});

describe('ProjectsSection groups', () => {
	it('adds a known group to the project the filtered card points at', () => {
		mountSection({}, {groups: ['hal', 'tools']});
		typeSearch('hal');

		cy.dataTest('west-editor:project-group-add-2').click();
		cy.dataTest('west-editor:project-group-option-2-tools').click();

		cy.get('@updateManifest').should('have.been.calledWithMatch', {
			projects: [
				{name: 'zephyr'},
				{name: 'babblesim_base'},
				{name: 'hal_adi', groups: ['tools']}
			]
		});
	});

	it('drops the groups key when the last group is removed', () => {
		mountSection(
			{projects: [{name: 'zephyr', groups: ['hal']}]},
			{groups: ['hal']}
		);

		cy.dataTest('west-editor:project-group-remove-0-hal').click();

		cy.get('@updateManifest')
			.its('lastCall.args.0.projects.0')
			.should(project => {
				expect(project.name).to.equal('zephyr');
				expect(project.groups).to.equal(undefined);
			});
	});
});

describe('ProjectsSection filters', () => {
	const filterManifest: Partial<WestManifest> = {
		remotes: [
			{name: 'origin', 'url-base': 'https://example.com/org'},
			{name: 'upstream', 'url-base': 'https://example.com/upstream'}
		],
		projects: [
			{name: 'zephyr', groups: ['core']},
			{
				name: 'babblesim_base',
				groups: ['babblesim'],
				remote: 'upstream'
			},
			{name: 'hal_adi', url: 'git@host:hal_adi.git'}
		]
	};

	// A group-filter can name a group no project is in.
	const groups = ['babblesim', 'core', 'unused'];

	const statuses: Record<string, WestProjectStatus> = {
		zephyr: 'different-revision',
		babblesim_base: 'modified-files',
		hal_adi: 'different-revision'
	};

	const mountFiltered = () => {
		mountSection(filterManifest, {groups, statuses});
	};

	const openDropdown = (name: 'groups' | 'remotes') => {
		cy.dataTest(`west-editor:project-filter-${name}`)
			.find('button')
			.first()
			.click();
	};

	it('offers only the status chips some project is in', () => {
		mountFiltered();

		cy.dataTest(
			'west-editor:project-filter-different-revision'
		).should('exist');
		cy.dataTest('west-editor:project-filter-modified-files').should(
			'exist'
		);
		cy.dataTest('west-editor:project-filter-not-cloned').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-filter-untracked-files').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-filter-disabled').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-filter-in-sync').should(
			'not.exist'
		);
	});

	it('offers an in sync chip that keeps the projects in sync', () => {
		mountSection(filterManifest, {
			groups,
			statuses: {...statuses, zephyr: 'in-sync'}
		});

		cy.dataTest('west-editor:project-filter-in-sync')
			.should('contain.text', 'In sync')
			.click()
			.should('have.attr', 'appearance', 'primary');

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');
	});

	it('offers no status chip while statuses are loading', () => {
		mountSection(filterManifest, {groups, statuses: null});

		cy.dataTest(
			'west-editor:project-filter-different-revision'
		).should('not.exist');
		cy.dataTest('west-editor:project-filter-groups').should('exist');
		cy.dataTest('west-editor:project-filter-remotes').should('exist');
	});

	it('ignores the status of a workspace project the manifest does not list', () => {
		mountSection(filterManifest, {
			groups,
			statuses: {...statuses, 'imported-hal': 'not-cloned'}
		});

		cy.dataTest(
			'west-editor:project-filter-different-revision'
		).should('exist');
		cy.dataTest('west-editor:project-filter-not-cloned').should(
			'not.exist'
		);
	});

	it('keeps a status chip offered while other filters hide its projects', () => {
		mountFiltered();

		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();

		// Only zephyr remains, yet babblesim_base still has modified files.
		cy.dataTest('west-editor:project-card-1').should('not.exist');
		cy.dataTest('west-editor:project-filter-modified-files').should(
			'exist'
		);
	});

	it('highlights a status chip and keeps the projects with that status', () => {
		mountFiltered();

		cy.dataTest('west-editor:project-filter-different-revision')
			.should('have.attr', 'appearance', 'secondary')
			.click()
			.should('have.attr', 'appearance', 'primary');

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('exist');

		cy.dataTest('west-editor:project-filter-different-revision')
			.click()
			.should('have.attr', 'appearance', 'secondary');
		cy.dataTest('west-editor:project-card-1').should('exist');
	});

	it('keeps only the projects matching both a status chip and a group', () => {
		mountFiltered();

		cy.dataTest(
			'west-editor:project-filter-different-revision'
		).click();
		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();

		// hal_adi is on a different revision too, but not in core.
		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');
	});

	it('lets a selection the manifest no longer has be cleared', () => {
		// Applies edits, so removing a group from its card updates the list.
		function Editable() {
			const [current, setCurrent] = useState<WestManifest>({
				projects: [{name: 'zephyr', groups: ['core']}]
			});

			return (
				<WestEditorContext.Provider
					value={{
						manifest: current,
						groups: collectGroups(current),
						loading: false,
						statuses: {},
						updateManifest: setCurrent
					}}
				>
					<LocalizationProvider namespace='west-editor'>
						<ProjectsSection />
					</LocalizationProvider>
				</WestEditorContext.Provider>
			);
		}

		cy.mount(<Editable />);

		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();
		cy.dataTest('west-editor:project-group-remove-0-core').click();

		// The group is gone from the manifest, so the filter hides zephyr...
		cy.dataTest('west-editor:project-card-0').should('not.exist');

		// ...but stays clearable, its stale entry included.
		openDropdown('groups');
		cy.dataTest('multiselect-option-core').should('exist');
		cy.dataTest('west-editor:project-filter-groups')
			.contains('button', 'Clear All')
			.click();

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-filter-groups')
			.find('button')
			.first()
			.should('be.disabled');
	});

	it('shows the filters empty state when no project matches', () => {
		mountFiltered();

		openDropdown('groups');
		cy.dataTest('multiselect-option-unused').click();

		cy.dataTest('west-editor:projects-no-results')
			.should('exist')
			.and('contain.text', 'No projects match the selected filters.');
		cy.dataTest('west-editor:project-card-0').should('not.exist');
	});

	it('narrows the list to the selected group and shows the count', () => {
		mountFiltered();

		openDropdown('groups');
		cy.dataTest('multiselect-option-babblesim').click();

		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-0').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');
		cy.dataTest('west-editor:project-filter-groups')
			.find('button p')
			.should('contain.text', '1');
	});

	it('keeps only the projects matching both a group and a remote', () => {
		mountFiltered();

		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();
		openDropdown('remotes');
		cy.dataTest('multiselect-option-origin').click();

		// zephyr is in core and inherits the default remote, origin.
		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('not.exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');

		// babblesim_base is in babblesim but uses upstream.
		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();
		cy.dataTest('multiselect-option-babblesim').click();

		cy.dataTest('west-editor:project-card-0').should('not.exist');
		cy.dataTest('west-editor:projects-no-results').should(
			'contain.text',
			'No projects match the selected filters.'
		);
	});

	it('keeps the projects matching any selection within a category', () => {
		mountFiltered();

		openDropdown('groups');
		cy.dataTest('multiselect-option-core').click();
		cy.dataTest('multiselect-option-babblesim').click();

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-2').should('not.exist');
	});

	it('restores the list when the selection is cleared', () => {
		mountFiltered();

		openDropdown('remotes');
		cy.dataTest('multiselect-option-upstream').click();
		cy.dataTest('west-editor:project-card-0').should('not.exist');

		cy.dataTest('west-editor:project-filter-remotes')
			.contains('button', 'Clear All')
			.click();

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('exist');
		cy.dataTest('west-editor:project-card-2').should('exist');
	});

	it('applies the search on top of the filters', () => {
		mountFiltered();

		openDropdown('remotes');
		cy.dataTest('multiselect-option-origin').click();
		cy.dataTest('multiselect-option-upstream').click();
		typeSearch('zeph');

		cy.dataTest('west-editor:project-card-0').should('exist');
		cy.dataTest('west-editor:project-card-1').should('not.exist');
	});
});

describe('ProjectsSection status badges', () => {
	it('shows Loading on every card until the first statuses arrive', () => {
		mountSection({}, {statuses: null});

		for (const index of [0, 1, 2]) {
			cy.dataTest(`west-editor:project-status-${index}`).should(
				'have.text',
				'Loading'
			);
		}
	});

	it('gives each card the status of its project, by name', () => {
		mountSection(
			{},
			{
				statuses: {
					zephyr: 'in-sync',
					hal_adi: 'disabled',
					unrelated: 'not-cloned'
				}
			}
		);

		cy.dataTest('west-editor:project-status-0').should(
			'have.text',
			'In Sync'
		);
		// babblesim_base has no status here, so it shows no badge.
		cy.dataTest('west-editor:project-status-1').should('not.exist');
		cy.dataTest('west-editor:project-status-2').should(
			'have.text',
			'Disabled'
		);
	});

	it('keeps a badge on its project when the search filters cards out', () => {
		mountSection({}, {statuses: {hal_adi: 'disabled'}});

		typeSearch('hal');

		cy.dataTest('west-editor:project-status-2').should(
			'have.text',
			'Disabled'
		);
	});
});

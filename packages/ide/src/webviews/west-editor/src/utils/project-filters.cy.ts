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
import {expect} from 'chai';
import type {WestManifest, WestProject} from '@west-editor/types';
import {
	EMPTY_PROJECT_FILTERS,
	hasActiveFilters,
	matchesFilters,
	visibleStatusFilters
} from './project-filters';

const manifest: WestManifest = {
	defaults: {remote: 'origin'},
	remotes: [
		{name: 'origin', 'url-base': 'https://example.com/org'},
		{name: 'upstream', 'url-base': 'https://example.com/upstream'}
	]
};

const hal: WestProject = {
	name: 'hal',
	remote: 'upstream',
	groups: ['hal']
};
const zephyr: WestProject = {
	name: 'zephyr',
	groups: ['core', 'babblesim']
};
const pinned: WestProject = {
	name: 'pinned',
	url: 'git@host:pinned.git'
};

describe('hasActiveFilters', () => {
	it('is false for the empty filters', () => {
		expect(hasActiveFilters(EMPTY_PROJECT_FILTERS)).to.equal(false);
	});

	it('is true once any filter is set', () => {
		expect(
			hasActiveFilters({
				...EMPTY_PROJECT_FILTERS,
				statuses: ['disabled']
			})
		).to.equal(true);
		expect(
			hasActiveFilters({
				...EMPTY_PROJECT_FILTERS,
				remotes: ['origin']
			})
		).to.equal(true);
	});
});

describe('matchesFilters', () => {
	it('matches every project when no filter is set', () => {
		for (const project of [hal, zephyr, pinned]) {
			expect(
				matchesFilters(project, manifest, EMPTY_PROJECT_FILTERS)
			).to.equal(true);
		}
	});

	it('matches a project in any selected group', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			groups: ['babblesim', 'x']
		};

		expect(matchesFilters(zephyr, manifest, filters)).to.equal(true);
		expect(matchesFilters(hal, manifest, filters)).to.equal(false);
		expect(matchesFilters(pinned, manifest, filters)).to.equal(false);
	});

	it('matches a remote inherited from the manifest default', () => {
		const filters = {...EMPTY_PROJECT_FILTERS, remotes: ['origin']};

		expect(matchesFilters(zephyr, manifest, filters)).to.equal(true);
		expect(matchesFilters(hal, manifest, filters)).to.equal(false);
	});

	it('never matches a remote for a project with its own url', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			remotes: ['origin', 'upstream']
		};

		expect(matchesFilters(pinned, manifest, filters)).to.equal(false);
	});

	it('matches a status chip only on the equal status', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			statuses: ['modified-files'] as const
		};

		expect(
			matchesFilters(hal, manifest, filters, 'modified-files')
		).to.equal(true);
		expect(
			matchesFilters(hal, manifest, filters, 'different-revision')
		).to.equal(false);
		expect(
			matchesFilters(hal, manifest, filters, 'in-sync')
		).to.equal(false);
	});

	it('matches the in sync chip on in sync projects', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			statuses: ['in-sync'] as const
		};

		expect(
			matchesFilters(hal, manifest, filters, 'in-sync')
		).to.equal(true);
		expect(
			matchesFilters(hal, manifest, filters, 'disabled')
		).to.equal(false);
	});

	it('matches no status chip while the status is unknown', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			statuses: ['not-cloned', 'disabled'] as const
		};

		expect(matchesFilters(hal, manifest, filters)).to.equal(false);
	});

	it('matches any selected status', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			statuses: ['not-cloned', 'disabled'] as const
		};

		expect(
			matchesFilters(hal, manifest, filters, 'not-cloned')
		).to.equal(true);
		expect(
			matchesFilters(hal, manifest, filters, 'disabled')
		).to.equal(true);
		expect(
			matchesFilters(hal, manifest, filters, 'in-sync')
		).to.equal(false);
	});

	it('requires every category that is set to match', () => {
		const filters = {
			...EMPTY_PROJECT_FILTERS,
			groups: ['core'],
			remotes: ['upstream']
		};

		// zephyr is in core but uses the default remote, origin.
		expect(matchesFilters(zephyr, manifest, filters)).to.equal(false);
		expect(
			matchesFilters(zephyr, manifest, {
				...filters,
				remotes: ['origin']
			})
		).to.equal(true);
	});

	it('ignores a category with nothing selected', () => {
		const filters = {...EMPTY_PROJECT_FILTERS, remotes: ['upstream']};

		// hal is in no selected group, but no group is selected at all.
		expect(matchesFilters(hal, manifest, filters)).to.equal(true);
	});

	it('fails a status filter while the status is unknown, even if the group matches', () => {
		const filters = {
			statuses: ['different-revision'] as const,
			groups: ['hal'],
			remotes: []
		};

		expect(matchesFilters(hal, manifest, filters)).to.equal(false);
		expect(
			matchesFilters(hal, manifest, filters, 'different-revision')
		).to.equal(true);
	});
});

describe('visibleStatusFilters', () => {
	it('offers nothing while statuses are loading', () => {
		expect(
			visibleStatusFilters([undefined, undefined], [])
		).to.deep.equal([]);
	});

	it('offers the statuses some project is in, in chip order', () => {
		expect(
			visibleStatusFilters(
				['disabled', 'in-sync', 'not-cloned', undefined, 'disabled'],
				[]
			)
		).to.deep.equal(['in-sync', 'not-cloned', 'disabled']);
	});

	it('keeps an active status that no project is in any more', () => {
		expect(
			visibleStatusFilters(['not-cloned'], ['modified-files'])
		).to.deep.equal(['not-cloned', 'modified-files']);
	});
});

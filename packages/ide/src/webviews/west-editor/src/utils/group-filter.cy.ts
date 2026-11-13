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
import {
	collectGroups,
	getGroupState,
	setGroupState,
	validateGroupName
} from './group-filter';

describe('collectGroups', () => {
	it('lists the groups of every project once, sorted', () => {
		expect(
			collectGroups({
				projects: [
					{name: 'a', groups: ['tools', 'hal']},
					{name: 'b', groups: ['hal', 'babblesim']},
					{name: 'c'}
				]
			})
		).to.deep.equal(['babblesim', 'hal', 'tools']);
	});

	it('includes groups named only by the group filter', () => {
		expect(
			collectGroups({
				projects: [{name: 'a', groups: ['hal']}],
				'group-filter': ['-optional', '+ci']
			})
		).to.deep.equal(['ci', 'hal', 'optional']);
	});

	it('ignores filter entries without a + or - prefix', () => {
		expect(
			collectGroups({'group-filter': ['optional', '+', '-ci']})
		).to.deep.equal(['ci']);
	});

	it('is empty for a manifest without groups', () => {
		expect(collectGroups({})).to.deep.equal([]);
	});
});

describe('getGroupState', () => {
	it('reads + as enabled and - as disabled', () => {
		const filter = ['+ci', '-optional'];

		expect(getGroupState(filter, 'ci')).to.equal('enabled');
		expect(getGroupState(filter, 'optional')).to.equal('disabled');
	});

	it('is none for a group the filter does not list', () => {
		expect(getGroupState(['+ci'], 'hal')).to.equal('none');
		expect(getGroupState(undefined, 'hal')).to.equal('none');
	});

	it('lets the last entry for a group win', () => {
		expect(getGroupState(['+ci', '-ci'], 'ci')).to.equal('disabled');
		expect(getGroupState(['-ci', '+ci'], 'ci')).to.equal('enabled');
	});

	it('does not match an entry without a prefix', () => {
		expect(getGroupState(['ci'], 'ci')).to.equal('none');
	});
});

describe('setGroupState', () => {
	it('appends a group the filter does not list yet', () => {
		expect(
			setGroupState(['-optional'], 'ci', 'enabled')
		).to.deep.equal(['-optional', '+ci']);
	});

	it('creates the filter when there is none', () => {
		expect(setGroupState(undefined, 'ci', 'disabled')).to.deep.equal([
			'-ci'
		]);
	});

	it('changes an entry in place', () => {
		expect(
			setGroupState(['+a', '-ci', '+b'], 'ci', 'enabled')
		).to.deep.equal(['+a', '+ci', '+b']);
	});

	it('collapses repeated entries into one at the first position', () => {
		expect(
			setGroupState(['+ci', '+a', '-ci'], 'ci', 'disabled')
		).to.deep.equal(['-ci', '+a']);
	});

	it('removes every entry of a group set to none', () => {
		expect(
			setGroupState(['+ci', '+a', '-ci'], 'ci', 'none')
		).to.deep.equal(['+a']);
	});

	it('is undefined once the filter is empty', () => {
		expect(setGroupState(['+ci'], 'ci', 'none')).to.equal(undefined);
		expect(setGroupState(undefined, 'ci', 'none')).to.equal(
			undefined
		);
	});

	it('keeps entries without a prefix untouched', () => {
		expect(
			setGroupState(['ci', '+a'], 'ci', 'enabled')
		).to.deep.equal(['ci', '+a', '+ci']);
	});
});

describe('validateGroupName', () => {
	it('accepts a plain name', () => {
		expect(validateGroupName('babblesim')).to.equal(undefined);
		expect(validateGroupName('my-group_2')).to.equal(undefined);
	});

	it('rejects an empty name', () => {
		expect(validateGroupName('')).to.equal('empty');
	});

	it('rejects whitespace, commas and colons', () => {
		for (const name of ['my group', 'a,b', 'a:b', 'a\tb']) {
			expect(validateGroupName(name)).to.equal('invalidCharacter');
		}
	});

	it('rejects a leading dash or plus', () => {
		expect(validateGroupName('-hal')).to.equal('invalidPrefix');
		expect(validateGroupName('+hal')).to.equal('invalidPrefix');
	});
});

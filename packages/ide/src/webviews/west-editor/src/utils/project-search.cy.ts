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
import {matchesSearch, splitOnMatches} from './project-search';

describe('matchesSearch', () => {
	it('matches at the start of the name', () => {
		expect(matchesSearch('babblesim_base', 'babb')).to.equal(true);
	});

	it('matches in the middle of the name', () => {
		expect(matchesSearch('babblesim_base', 'esim')).to.equal(true);
	});

	it('matches at the end of the name', () => {
		expect(matchesSearch('babblesim_base', 'base')).to.equal(true);
	});

	it('ignores case on both sides', () => {
		expect(matchesSearch('Babblesim_Base', 'ESIM')).to.equal(true);
	});

	it('is false when the name does not contain the term', () => {
		expect(matchesSearch('babblesim_base', 'abcdef')).to.equal(false);
	});

	it('matches everything for an empty or whitespace-only term', () => {
		expect(matchesSearch('babblesim_base', '')).to.equal(true);
		expect(matchesSearch('babblesim_base', '   ')).to.equal(true);
	});

	it('trims the term before matching', () => {
		expect(matchesSearch('babblesim_base', '  esim  ')).to.equal(
			true
		);
	});
});

describe('splitOnMatches', () => {
	it('brackets a match with the text around it', () => {
		expect(splitOnMatches('babblesim_base', 'esim')).to.deep.equal([
			{value: 'babbl', isMatch: false},
			{value: 'esim', isMatch: true},
			{value: '_base', isMatch: false}
		]);
	});

	it('marks every occurrence, not just the first', () => {
		expect(splitOnMatches('test_esim', 'es')).to.deep.equal([
			{value: 't', isMatch: false},
			{value: 'es', isMatch: true},
			{value: 't_', isMatch: false},
			{value: 'es', isMatch: true},
			{value: 'im', isMatch: false}
		]);
	});

	it('preserves the original casing of a matched run', () => {
		expect(splitOnMatches('Babblesim', 'BABB')).to.deep.equal([
			{value: 'Babb', isMatch: true},
			{value: 'lesim', isMatch: false}
		]);
	});

	it('omits an empty leading or trailing run', () => {
		expect(splitOnMatches('zephyr', 'zephyr')).to.deep.equal([
			{value: 'zephyr', isMatch: true}
		]);
	});

	it('returns the whole text unmatched for an empty term', () => {
		expect(splitOnMatches('zephyr', '   ')).to.deep.equal([
			{value: 'zephyr', isMatch: false}
		]);
	});

	it('returns the whole text unmatched when nothing matches', () => {
		expect(splitOnMatches('zephyr', 'abcdef')).to.deep.equal([
			{value: 'zephyr', isMatch: false}
		]);
	});

	it('always reproduces the input when the segments are rejoined', () => {
		const name = 'babblesim_esim_base';

		for (const term of ['', 'esim', 'b', 'BASE', 'nope', '_']) {
			expect(
				splitOnMatches(name, term)
					.map(segment => segment.value)
					.join('')
			).to.equal(name);
		}
	});
});

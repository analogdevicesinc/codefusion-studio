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
import {getErrorMessage, getYamlProblems} from './error-message';

describe('getErrorMessage', () => {
	it('reads the message of an Error', () => {
		expect(getErrorMessage(new Error('failure'))).to.equal('failure');
	});

	it('reads the message of a plain-object rejection', () => {
		expect(getErrorMessage({message: 'failure'})).to.equal('failure');
	});

	it('falls back to the string form', () => {
		expect(getErrorMessage('failure')).to.equal('failure');
		expect(getErrorMessage(null)).to.equal('null');
	});
});

describe('getYamlProblems', () => {
	it('reads the problems of a YAML error', () => {
		const problems = [{text: 'failure', line: 1, start: 0, end: 1}];

		expect(
			getYamlProblems({message: 'failure', data: problems})
		).to.equal(problems);
	});

	it('ignores other errors', () => {
		expect(getYamlProblems(new Error('failure'))).to.equal(undefined);
		expect(
			getYamlProblems({message: 'failure', data: 'stack'})
		).to.equal(undefined);
		expect(getYamlProblems(null)).to.equal(undefined);
	});
});

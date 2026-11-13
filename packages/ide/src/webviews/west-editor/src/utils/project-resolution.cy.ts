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
import type {WestManifest} from '@west-editor/types';
import {
	resolveProjectPath,
	resolveProjectRemote,
	resolveProjectUrl
} from './project-resolution';

const manifest: WestManifest = {
	defaults: {remote: 'origin'},
	remotes: [
		{name: 'origin', 'url-base': 'https://example.com/org'},
		{
			name: 'upstream',
			'url-base': 'https://github.com/zephyrproject-rtos/'
		}
	]
};

describe('resolveProjectRemote', () => {
	it('uses the project remote', () => {
		expect(
			resolveProjectRemote(
				{name: 'app', remote: 'upstream'},
				manifest
			)
		).to.equal('upstream');
	});

	it('falls back to the manifest default', () => {
		expect(resolveProjectRemote({name: 'app'}, manifest)).to.equal(
			'origin'
		);
	});

	it('has no remote when the project sets its own url', () => {
		expect(
			resolveProjectRemote(
				{name: 'app', remote: 'origin', url: 'git@host:app.git'},
				manifest
			)
		).to.equal(undefined);
	});
});

describe('resolveProjectUrl', () => {
	it('prefers an explicit url over any remote', () => {
		expect(
			resolveProjectUrl(
				{name: 'app', remote: 'origin', url: 'git@host:app.git'},
				manifest
			)
		).to.equal('git@host:app.git');
	});

	it("joins the remote's url-base to the project name", () => {
		expect(
			resolveProjectUrl({name: 'app', remote: 'origin'}, manifest)
		).to.equal('https://example.com/org/app');
	});

	it('uses repo-path in place of the name when present', () => {
		expect(
			resolveProjectUrl(
				{
					name: 'acpica',
					remote: 'origin',
					'repo-path': 'vendor/acpica'
				},
				manifest
			)
		).to.equal('https://example.com/org/vendor/acpica');
	});

	it('falls back to defaults.remote when the project omits one', () => {
		expect(resolveProjectUrl({name: 'app'}, manifest)).to.equal(
			'https://example.com/org/app'
		);
	});

	it('trims a trailing slash from url-base', () => {
		expect(
			resolveProjectUrl(
				{name: 'zephyr', remote: 'upstream'},
				manifest
			)
		).to.equal('https://github.com/zephyrproject-rtos/zephyr');
	});

	it('is undefined when the named remote is not defined', () => {
		expect(
			resolveProjectUrl({name: 'app', remote: 'missing'}, manifest)
		).to.equal(undefined);
	});

	it('is undefined when neither the project nor the defaults name a remote', () => {
		expect(
			resolveProjectUrl({name: 'app'}, {remotes: manifest.remotes})
		).to.equal(undefined);
	});
});

describe('resolveProjectPath', () => {
	it('uses an explicit path', () => {
		expect(
			resolveProjectPath({name: 'app', path: 'apps/app'})
		).to.equal('apps/app');
	});

	it("falls back to the project name, west's own default", () => {
		expect(resolveProjectPath({name: 'app'})).to.equal('app');
	});
});

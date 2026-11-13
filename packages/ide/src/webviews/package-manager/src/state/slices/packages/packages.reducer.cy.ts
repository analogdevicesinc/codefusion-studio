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
import type {
	GetPackageListResponse,
	PackageListEntry
} from '@constants/messages/package-manager-messages';
import {entry} from '../../../test-utils/package-manager-mock';
import {
	changeSelectedVersion,
	fetchPackageList,
	packagesReducer,
	setPackageSelected,
	toggleSelectAllPackages
} from './packages.reducer';

type State = ReturnType<typeof packagesReducer>;

let requestCount = 0;

/** Runs a list fetch through the reducer, as the thunk would. */
const receiveList = (
	state: State,
	packageList: PackageListEntry[]
): State => {
	const requestId = `request-${++requestCount}`;
	const response: GetPackageListResponse = {
		packageList,
		missingRequiredPackages: []
	};

	return packagesReducer(
		packagesReducer(state, fetchPackageList.pending(requestId)),
		fetchPackageList.fulfilled(response, requestId)
	);
};

describe('packages reducer: list refresh', () => {
	const initial = [
		entry('package1', {versions: ['2.0.0', '1.0.0']}),
		entry('package2', {versions: ['1.0.0']})
	];

	const withSelection = (): State => {
		let state = receiveList(
			packagesReducer(undefined, {type: 'init'}),
			initial
		);
		state = packagesReducer(
			state,
			changeSelectedVersion({name: 'package1', newVersion: '2.0.0'})
		);
		state = packagesReducer(
			state,
			setPackageSelected({
				pkg: {name: 'package1', version: '2.0.0'},
				selected: true
			})
		);

		return packagesReducer(
			state,
			setPackageSelected({
				pkg: {name: 'package2', version: '1.0.0'},
				selected: true
			})
		);
	};

	it('keeps selections and picked versions that are still listed', () => {
		const state = receiveList(withSelection(), initial);

		expect(state.selectedPackages).to.deep.equal([
			{name: 'package1', version: '2.0.0'},
			{name: 'package2', version: '1.0.0'}
		]);
		expect(state.selectedVersions).to.deep.equal({package1: '2.0.0'});
	});

	it('drops selections and picked versions that are no longer listed', () => {
		const state = receiveList(withSelection(), [
			entry('package1', {versions: ['1.0.0']})
		]);

		expect(state.selectedPackages).to.be.empty;
		expect(state.selectedVersions).to.deep.equal({});
	});

	it('select-all then picks a listed version, not the removed one', () => {
		const refreshed = [entry('package1', {versions: ['1.0.0']})];
		const state = packagesReducer(
			receiveList(withSelection(), refreshed),
			toggleSelectAllPackages(refreshed)
		);

		expect(state.selectedPackages).to.deep.equal([
			{name: 'package1', version: '1.0.0'}
		]);
	});
});

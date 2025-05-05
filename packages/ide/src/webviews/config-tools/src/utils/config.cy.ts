/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {Soc} from '../../../common/types/soc';
import {getPrimaryProjectId, resetConfigDict} from './config';
import {resetCoreDict} from './soc-cores';

const max32690wlp = (await import(
	'../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const normalProjectDict = {
	Soc: 'MAX32690',
	BoardName: '',
	Package: 'WLP',
	projects: [
		{
			CoreId: 'RV',
			ProjectId: 'Project2'
		},
		{
			CoreId: 'CM4',
			ProjectId: 'primary'
		}
	]
};

describe('Config Utilities', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
	});

	afterEach(() => {
		resetConfigDict();
		resetCoreDict();
	});

	it('getPrimaryProjectId should return the primary project id for configuration without secure projects', () => {
		localStorage.setItem(
			'configDict',
			JSON.stringify(normalProjectDict)
		);

		localStorage.setItem('Cores', JSON.stringify(max32690wlp.Cores));

		const primaryProjectId = getPrimaryProjectId();

		expect(primaryProjectId).to.equal('primary');
	});
});

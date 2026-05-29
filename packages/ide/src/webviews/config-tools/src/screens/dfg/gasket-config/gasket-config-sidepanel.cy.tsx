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

import {type CfsConfig} from 'cfs-types';
import {configurePreloadedStore} from '../../../state/store';
import {Dfg} from '../DFG';

describe('Gasket Config Sidepanel', () => {
	const configDict = {
		BoardName: '',
		Package: 'WLP',
		Soc: 'DFGTEST',
		Projects: [
			{
				Description: 'ARMCMxx',
				ExternallyManaged: false,
				FirmwarePlatform: '',
				CoreId: 'CMxx',
				Name: 'ARMCMxx',
				PluginId: '',
				ProjectId: 'CMxx-proj'
			}
		]
	} as unknown as CfsConfig;

	const controls = {
		'FSS DFGGasketConfig': [
			{
				Id: 'ALIAS',
				Description: 'Zephyr Alias',
				// eslint-disable-next-line no-template-curly-in-string
				Hint: '${String:fss-dfg}',
				Type: 'text',
				Pattern: '([a-z][a-z0-9-]*)?'
			}
		]
	};

	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json').as('soc');
	});

	it('Edit Gasket With Individual Config Fields', function () {
		// Edit soc so FSS supports the ALIAS field
		this.soc.Gaskets.find(
			(g: {Name: string}) => g.Name === 'FSS'
		)!.Config!.ALIAS = {};

		const reduxStore = configurePreloadedStore(this.soc, configDict);
		localStorage.setItem(
			'pluginControls:CMxx-proj',
			JSON.stringify(controls)
		);
		localStorage.setItem('www', 'http');

		cy.viewport(1280, 720); // So that FSS is visible
		cy.mount(<Dfg />, reduxStore);

		// 1. Click the FSS gasket box!
		cy.get('[data-test="gasket-box-FSS"]').click();

		// 2. Check that the field exists
		cy.get(
			'[data-test="gasket-config-controls:control-ALIAS-control-input"]'
		).should('exist');

		// 3. Set the value using the component's property
		cy.get(
			'[data-test="gasket-config-controls:control-ALIAS-control-input"]'
		).then($el => {
			($el[0] as HTMLInputElement).value = 'test-alias';
			$el[0].dispatchEvent(new Event('change', {bubbles: true}));
			$el[0].dispatchEvent(new Event('input', {bubbles: true}));
		});

		// 4. Verify the value was set
		cy.get(
			'[data-test="gasket-config-controls:control-ALIAS-control-input"]'
		).should('have.value', 'test-alias');

		// 5. Click the save button
		cy.get('#sidepanel-edit-gasket')
			.click()
			.then(() => {
				// 6. Check that the value of the alias field is changed
				const gasketOptions =
					reduxStore.getState().gasketsReducer.GasketOptions;

				expect(gasketOptions[0].Config?.ALIAS).to.equal('test-alias');
			});
	});
});

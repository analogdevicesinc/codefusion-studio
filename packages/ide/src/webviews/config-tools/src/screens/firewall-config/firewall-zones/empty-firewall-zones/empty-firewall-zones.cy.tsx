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

import type {Soc} from '../../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import EmptyFirewallZones from './empty-firewall-zones';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestEmptyFirewallZones() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<EmptyFirewallZones />
		</LocalizationProvider>
	);
}

describe('EmptyFirewallZones', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the empty state with an add button', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestEmptyFirewallZones />, reduxStore);

		cy.dataTest('firewall-zones:empty-firewall-zones').should(
			'exist'
		);
		cy.dataTest('empty-firewall-zones:add-zone').should('exist');
	});
});

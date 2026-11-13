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

import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../../common/constants/navigation';
import {setupMessengerMock} from '../../../../../common/test-utils/messenger-mock';
import {selectFileRequest} from '@constants/messages/vscode-api-messages';
import FirewallSettings from './firewall-settings';
import {logTelemetryRequest} from '@constants/messages/telemetry-messages';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestFirewallSettings() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallSettings />
		</LocalizationProvider>
	);
}

describe('Firewall settings behavior', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('renders all three status options (Enabled, Override - All Blocked, Override - All Open)', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get(
			'[data-test="workspace-setting:firewall-status-enabled"]'
		).should('exist');
		cy.get(
			'[data-test="workspace-setting:firewall-status-overrideAllBlocked"]'
		).should('exist');
		cy.get(
			'[data-test="workspace-setting:firewall-status-overrideAllOpen"]'
		).should('exist');
	});

	it('has "Enabled" option selected by default', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get('[data-test="workspace-setting:firewall-status-enabled"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked', 'true');
	});

	it('updates Redux state when an option is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get(
			'[data-test="workspace-setting:firewall-status-overrideAllBlocked"]'
		)
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.firewallReducer.firewallStatus).to.equal(
					'overrideAllBlocked'
				);
			});
	});

	it('allows switching between all options', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get(
			'[data-test="workspace-setting:firewall-status-overrideAllOpen"]'
		)
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.firewallReducer.firewallStatus).to.equal(
					'overrideAllOpen'
				);
			});

		cy.get('[data-test="workspace-setting:firewall-status-enabled"]')
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.firewallReducer.firewallStatus).to.equal(
					'enabled'
				);
			});
		cy.get('[data-test="workspace-setting:firewall-status-enabled"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked');
	});

	it('only one option is checked at a time', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get(
			'[data-test="workspace-setting:firewall-status-overrideAllBlocked"]'
		)
			.find('vscode-radio')
			.click();

		cy.wrap(null).then(() => {
			const state = reduxStore.getState();
			expect(state.firewallReducer.firewallStatus).to.equal(
				'overrideAllBlocked'
			);
		});

		cy.get('vscode-radio[current-checked="true"]').should(
			'have.length',
			1
		);
	});

	it('renders the Enable Firewall title', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get('#firewall-enable-title').should('exist');
	});

	it('navigates to Firewall Config when the Configure Firewall link is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		cy.mount(<TestFirewallSettings />, reduxStore);

		cy.get('[data-test="navigate-to-firewall-config"]')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.appContextReducer.activeScreen).to.equal(
					navigationItems.firewallConfig
				);
			});
	});

	describe('Firewall binary file picker', () => {
		before(() => {
			// SelectFile resolves through the messenger; return a Windows-style
			// path to also exercise the separator normalization.
			setupMessengerMock({
				[selectFileRequest.method]: 'C:\\firmware\\firewall.bin',
				[logTelemetryRequest.method]: []
			});
		});

		it('renders the binary file section with title, input and browse button', () => {
			const reduxStore = configurePreloadedStore(soc);
			cy.mount(<TestFirewallSettings />, reduxStore);

			cy.get(
				'[data-test="workspace-setting:firewall-binary-file"]'
			).should('exist');
			cy.get('#firewall-binary-file-title').should('exist');
			cy.get(
				'[data-test="firewall-settings:binary-file-control-input"]'
			).should('exist');
			cy.get('[data-test="workspace-setting:firewall-binary-file"]')
				.find('vscode-button')
				.should('exist');
		});

		it('updates Redux state when a path is typed into the field', () => {
			const reduxStore = configurePreloadedStore(soc);
			cy.mount(<TestFirewallSettings />, reduxStore);

			cy.get(
				'[data-test="firewall-settings:binary-file-control-input"]'
			)
				.shadow()
				.find('#control')
				.type('/tmp/firewall.bin');

			cy.wrap(null).should(() => {
				const state = reduxStore.getState();
				expect(state.firewallReducer.firewallBinaryFilePath).to.equal(
					'/tmp/firewall.bin'
				);
			});
		});

		it('sets the selected file path (normalizing separators) when Browse is clicked', () => {
			const reduxStore = configurePreloadedStore(soc);
			cy.mount(<TestFirewallSettings />, reduxStore);

			cy.get('[data-test="workspace-setting:firewall-binary-file"]')
				.find('vscode-button')
				.click();

			cy.get(
				'[data-test="firewall-settings:binary-file-control-input"]'
			)
				.shadow()
				.find('#control')
				.should('have.value', 'C:/firmware/firewall.bin');

			cy.wrap(null).should(() => {
				const state = reduxStore.getState();
				expect(state.firewallReducer.firewallBinaryFilePath).to.equal(
					'C:/firmware/firewall.bin'
				);
			});
		});
	});
});

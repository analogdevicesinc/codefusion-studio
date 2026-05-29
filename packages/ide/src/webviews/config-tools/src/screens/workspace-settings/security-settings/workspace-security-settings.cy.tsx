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

import {configurePreloadedStore} from '../../../state/store';
import {type CfsConfig} from 'cfs-types';
import type {Soc} from '@common/types/soc';
import WorkspaceSecuritySettings from './workspace-security-settings';
import MCUBootSettings from '../mcuboot-settings/mcuboot-settings';
import {mockVsCodeApi} from '../../../../../common/api';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';

const socMax = await import('@socs/max32690-wlp.json').then(
	module => module.default as unknown as Soc
);

const configWithGranite = {
	Soc: 'AD71270',
	Projects: [
		{
			Description: 'ARM Cortex-M55',
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
			CoreId: 'CM55',
			Name: 'ARM Cortex-M55',
			PluginId: '',
			ProjectId: 'CM55-proj'
		}
	]
} as unknown as CfsConfig;

describe('Security settings Components', () => {
	it('renders MCUBoot Setting', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<WorkspaceSecuritySettings />, reduxStore);
		cy.get('[data-test="workspace-setting:mcuboot-config"]').should(
			'exist'
		);
	});
	it('renders Sign Key Management Setting', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<WorkspaceSecuritySettings />, reduxStore);
		cy.get(
			'[data-test="workspace-setting:sign-key-management"]'
		).should('exist');
	});
});

describe('MCUBoot settings behavior', () => {
	it('renders all three enable options (Enabled, Default, Disabled)', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<MCUBootSettings />, reduxStore);

		cy.get(
			'[data-test="workspace-setting:mcuboot-enable-enabled"]'
		).should('exist');
		cy.get(
			'[data-test="workspace-setting:mcuboot-enable-default"]'
		).should('exist');
		cy.get(
			'[data-test="workspace-setting:mcuboot-enable-disabled"]'
		).should('exist');
	});

	it('has "Default" option selected by default', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<MCUBootSettings />, reduxStore);

		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked', 'true');
	});

	it('updates Redux state when an option is clicked', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<MCUBootSettings />, reduxStore);

		// Click "Default - setting"
		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.appContextReducer.mcubootEnableState).to.equal(
					'default'
				);
			});
	});

	it('allows switching between all options', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<MCUBootSettings />, reduxStore);

		// Switch to "Disabled"
		cy.get('[data-test="workspace-setting:mcuboot-enable-disabled"]')
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.appContextReducer.mcubootEnableState).to.equal(
					'disabled'
				);
			});
		cy.get('[data-test="workspace-setting:mcuboot-enable-disabled"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked');

		// Switch to "Default"
		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.appContextReducer.mcubootEnableState).to.equal(
					'default'
				);
			});
		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked');

		// Switch back to "Enabled"
		cy.get('[data-test="workspace-setting:mcuboot-enable-enabled"]')
			.find('vscode-radio')
			.click()
			.then(() => {
				const state = reduxStore.getState();
				expect(state.appContextReducer.mcubootEnableState).to.equal(
					'enabled'
				);
			});
		cy.get('[data-test="workspace-setting:mcuboot-enable-enabled"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked');
	});

	it('only one option is checked at a time', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<MCUBootSettings />, reduxStore);

		// Click "Default"
		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.click();

		// Wait for Redux to update and assert only one radio is marked checked
		cy.wrap(null).then(() => {
			const state = reduxStore.getState();
			expect(state.appContextReducer.mcubootEnableState).to.equal(
				'default'
			);
		});

		// Ensure exactly one radio element is truly checked (current-checked="true")
		cy.get('vscode-radio[current-checked="true"]').should(
			'have.length',
			1
		);
		cy.get('[data-test="workspace-setting:mcuboot-enable-default"]')
			.find('vscode-radio')
			.should('have.attr', 'current-checked', 'true');
	});
});

describe('Sign Key Management behavior', () => {
	beforeEach(() => {
		mockVsCodeApi({
			postMessage(message: any) {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined
						}
					})
				);
			},
			getState: () => undefined,
			setState: () => undefined as any
		});
	});

	it('shows empty-key state when no keys are present', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');

		cy.get(
			'[data-test="sign-key-management:add-existing-key"]'
		).should('exist');

		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).should('exist');

		// Ensure no key cards are rendered (keys.length === 0)
		cy.get('[data-test="key-card"]').should('not.exist');
	});

	it('clicking the context menu should open corresponding form', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		// Click the add key button to open the context menu

		cy.get('[data-test="sign-key-management:add-key"]').click();

		// Context menu should open with both options
		cy.get('[data-test="event-sources:options-menu:panel"]').should(
			'exist'
		);

		// Click "Add Existing Key" option
		cy.get(
			'[data-test="event-sources:options-menu:item:add-existing-key"]'
		)
			.should('exist')
			.click();

		// Add Existing Key form should be visible
		cy.get(
			'[data-test="key-management:add-existing-key-form"]'
		).should('exist');

		// Click cancel on the Add Existing Key form
		cy.get(
			'[data-test="key-management:add-existing-key-form:cancel"]'
		)
			.should('exist')
			.click();

		cy.get(
			'[data-test="key-management:add-existing-key-form"]'
		).should('not.exist');

		// Click the add key button to open the context menu again
		cy.get('[data-test="sign-key-management:add-key"]').click();

		cy.get('[data-test="event-sources:options-menu:panel"]').should(
			'exist'
		);

		// Click "Generate New Key" option
		cy.get(
			'[data-test="event-sources:options-menu:item:generate-new-key"]'
		)
			.should('exist')
			.click();

		// Generate Key form should be visible
		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		cy.get('[data-test="key-management:generate-key-form:cancel"]')
			.should('exist')
			.click();
	});

	it('clicks Add Existing Key button and opens corresponding form', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');

		cy.get('[data-test="sign-key-management:add-existing-key"]')
			.should('exist')
			.click();

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('not.exist');

		cy.get(
			'[data-test="key-management:add-existing-key-form"]'
		).should('exist');

		cy.get(
			'[data-test="existing-key:key-path-control-input"]'
		).should('exist');

		cy.get(
			'[data-test="key-management:add-existing-key-form:control-description-control-input"]'
		).should('exist');

		// Clicking cancel should go back to empty key state if no keys are present
		cy.get(
			'[data-test="key-management:add-existing-key-form:cancel"]'
		)
			.should('exist')
			.click();

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');
	});

	it('shows Required error when submitting empty Existing Key form', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		// Open the Add Existing Key form
		cy.get(
			'[data-test="sign-key-management:add-existing-key"]'
		).click();
		cy.get(
			'[data-test="key-management:add-existing-key-form"]'
		).should('exist');

		// Click the primary (Apply) button in the form
		cy.get(
			'[data-test="key-management:add-existing-key-form:submit"]'
		).click();

		// The keyPath TextField should show the required-field error containing the control name
		cy.get('[data-test="existing-key:key-path-error"]').should(
			'exist'
		);
	});

	it('clicks generate New Key button and opens corresponding form', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');

		cy.get('[data-test="sign-key-management:generate-new-key"]')
			.should('exist')
			.click();

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('not.exist');

		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-control-input"]'
		).should('exist');

		cy.get(
			'[data-test="generate-key:destination-path-control-input"]'
		).should('exist');

		cy.get(
			'[data-test="key-management:generate-key-form:control-description-control-input"]'
		).should('exist');
	});

	it('selects an Algorithm from dropdown in Generate Key form', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		// Open the Generate New Key form
		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).click();
		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		// Open the Algorithm dropdown and select ecdsa-p256
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm"]'
		).click();
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm:ecdsa-p256"]'
		)
			.should('exist')
			.click();

		// Dropdown should reflect selected value (check JS property, not HTML attribute)
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm"]'
		).should('have.attr', 'current-value', 'ecdsa-p256');

		// Open the Algorithm dropdown and select rsa-2048
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm"]'
		).click();
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm:rsa-2048"]'
		)
			.should('exist')
			.click();

		// Dropdown should reflect the new value selected value (check JS property, not HTML attribute)
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm"]'
		).should('have.attr', 'current-value', 'rsa-2048');

		// Clicking cancel should go back to empty key state if no keys are present
		cy.get('[data-test="key-management:generate-key-form:cancel"]')
			.should('exist')
			.click();

		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');
	});

	it('fills the Generate Key form with test data and clicks generate', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		mockVsCodeApi({
			postMessage(message: any) {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							...(message.type === 'check-directory-exists' && {
								body: true
							})
						}
					})
				);
			},
			getState: () => undefined,
			setState: () => undefined as any
		});

		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		// Open the Generate New Key form
		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).click();
		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		// Fill in Key Name
		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-control-input"]'
		)
			.should('exist')
			.shadow()
			.find('input')
			.focus()
			.type('my-test-key-1');

		// Fill in Destination Path
		cy.get(
			'[data-test="generate-key:destination-path-control-input"]'
		)
			.should('exist')
			.shadow()
			.find('input')
			.focus()
			.type('/home/user/keys');

		// Select Algorithm (ecdsa-p256)
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm"]'
		).click();
		cy.get(
			'[data-test="key-management:generate-key-form:control-algorithm:ecdsa-p256"]'
		)
			.should('exist')
			.click();

		// Fill in Description
		cy.get(
			'[data-test="key-management:generate-key-form:control-description-control-input"]'
		)
			.should('exist')
			.shadow()
			.find('input')
			.focus()
			.type('Test signing key for development');

		// Click the Generate button
		cy.get('[data-test="key-management:generate-key-form:submit"]')
			.should('exist')
			.click();

		// Verify that the new key card is displayed with correct information
		cy.get('[data-test="key-management:key-card-my-test-key-1.pem"]')
			.should('exist')
			.within(() => {
				cy.contains('my-test-key-1.pem').should('exist');
				cy.contains('ecdsa-p256').should('exist');
				cy.contains('/home/user/keys/my-test-key-1.pem').should(
					'exist'
				);
				cy.contains('Test signing key for development').should(
					'exist'
				);
			});

		// Ensure the empty key state is no longer shown
		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('not.exist');

		// Click the delete button on the key card
		cy.get(
			'[data-test="key-management:key-card-my-test-key-1.pem-delete"]'
		)
			.should('exist')
			.click();

		// Verify the key card is removed and empty key state is shown again
		cy.get(
			'[data-test="key-management:key-card-my-test-key-1.pem"]'
		).should('not.exist');
		cy.get(
			'[data-test="sign-key-management:empty-key-state"]'
		).should('exist');
	});

	it('should show an error when key generation fails', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		mockVsCodeApi({
			postMessage(message: any) {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							...(message.type === 'generate-pem-key' && {
								error: 'python not found'
							}),
							...(message.type === 'check-directory-exists' && {
								body: true
							})
						}
					})
				);
			},
			getState: () => undefined,
			setState: () => undefined as any
		});

		cy.mount(<WorkspaceSecuritySettings />, reduxStore);

		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).click();

		// Fill required fields
		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-control-input"]'
		)
			.shadow()
			.find('input')
			.focus()
			.type('my-test-key');

		cy.get(
			'[data-test="generate-key:destination-path-control-input"]'
		)
			.shadow()
			.find('input')
			.focus()
			.type('/home/user/keys');

		cy.get(
			'[data-test="key-management:generate-key-form:submit"]'
		).click();

		// Error should appear on the key name field
		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-error"]'
		)
			.should('exist')
			.and('contain.text', 'python not found');

		// Key card should NOT be created
		cy.get(
			'[data-test="key-management:key-card-my-test-key.pem"]'
		).should('not.exist');

		// The form should still be visible
		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);
	});

	it('should show an error when the destination path does not exist', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);

		mockVsCodeApi({
			postMessage(message: any) {
				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: undefined,
							...(message.type === 'check-directory-exists' && {
								body: false
							})
						}
					})
				);
			},
			getState: () => undefined,
			setState: () => undefined as any
		});

		(window as any).__webview_localization_resources__ = {
			cfgtools: {
				settings: {
					security: {
						'sign-key-management': {
							invalidPath:
								'Destination path must be an existing directory.'
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<WorkspaceSecuritySettings />
			</LocalizationProvider>,
			reduxStore
		);

		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).click();

		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		// Populate required fields so required validation passes and checkDirectoryExists is reached
		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-control-input"]'
		)
			.shadow()
			.find('input')
			.focus()
			.type('my-test-key');

		cy.get(
			'[data-test="generate-key:destination-path-control-input"]'
		)
			.shadow()
			.find('input')
			.focus()
			.type('/path/that/does/not/exist');

		cy.get(
			'[data-test="key-management:generate-key-form:submit"]'
		).click();

		cy.get(
			'[data-test="generate-key:destination-path-error"]'
		).should(
			'contain.text',
			'Destination path must be an existing directory.'
		);
	});

	it('shows a non-existent path error when destination path is left empty', () => {
		const reduxStore = configurePreloadedStore(
			socMax,
			configWithGranite
		);
		(window as any).__webview_localization_resources__ = {
			cfgtools: {
				settings: {
					security: {
						'sign-key-management': {
							invalidPath:
								'Destination path must be an existing directory.'
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<WorkspaceSecuritySettings />
			</LocalizationProvider>,
			reduxStore
		);

		cy.get(
			'[data-test="sign-key-management:generate-new-key"]'
		).click();
		cy.get('[data-test="key-management:generate-key-form"]').should(
			'exist'
		);

		// Populate required fields so required validation passes
		cy.get(
			'[data-test="key-management:generate-key-form:control-keyName-control-input"]'
		)
			.shadow()
			.find('input')
			.focus()
			.type('my-test-key');


		// Submit — checkDirectoryExists resolves falsy via the beforeEach mock
		cy.get(
			'[data-test="key-management:generate-key-form:submit"]'
		).click();

		cy.get(
			'[data-test="generate-key:destination-path-error"]'
		).should(
			'contain.text',
			'Destination Path is required'
		);
	});
});

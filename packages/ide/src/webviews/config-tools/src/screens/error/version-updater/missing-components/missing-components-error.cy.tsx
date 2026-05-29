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

import {LocalizationProvider} from '@common/contexts/LocaleContext';
import MissingComponentsError from './missing-components-error';
import {mockVsCodeApi} from '@common/api';
import type {CfsMissingComponent} from 'cfs-types';

const i10n = {
	single: {
		title: 'System Planner Critical Error'
	},
	multiple: {
		title: 'System Planner Critical Errors'
	},
	linkText: 'Troubleshooting Guide',
	requestedVersionOption: 'Install requested version {version}',
	locallyAvailableOption:
		'Upgrade to compatible locally-available version {version}',
	downloadableOption:
		'Upgrade to latest compatible downloadable version {version}',
	errorItem: {
		missingPluginTitle: 'Missing Plugin',
		missingDataModelTitle: 'Missing Data Model',
		missingPluginDescription:
			'System Planner requires {componentName} version {componentVersion} which is not available.',
		missingDataModelDescription:
			'System Planner requires {componentName} data model version {componentVersion} which is not available.',
		resolutionOptionsLabel: 'Resolution Options',
		allowFutureVersions: 'Allow all future compatible versions'
	}
};

function mountComponent(components: CfsMissingComponent[]) {
	(window as any).__webview_localization_resources__ = {
		cfgtools: {
			errors: {
				missingComponents: i10n
			}
		}
	};

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<MissingComponentsError components={components} />
		</LocalizationProvider>
	);
}

describe('MissingComponentsError', () => {
	beforeEach(() => {
		mockVsCodeApi({
			postMessage(message: any) {
				if (message.type === 'packager--search') {
					window.dispatchEvent(
						new MessageEvent('message', {
							data: {
								type: 'api-response',
								id: message.id,
								body: []
							}
						})
					);
				}
			},
			getState() {
				return undefined;
			},
			setState<T>(newState: T) {
				return newState;
			}
		});
	});

	describe('single missing plugin', () => {
		const singlePlugin: CfsMissingComponent[] = [
			{
				id: 'mock-plugin',
				version: '1.0.0',
				type: 'plugin'
			}
		];

		it('should render the singular title', () => {
			mountComponent(singlePlugin);

			cy.contains(i10n.single.title).should('be.visible');
		});

		it('should render the missing plugin card', () => {
			mountComponent(singlePlugin);

			cy.contains(i10n.errorItem.missingPluginTitle).should(
				'be.visible'
			);
		});

		it('should render the component description', () => {
			mountComponent(singlePlugin);

			cy.contains(
				'System Planner requires mock-plugin version 1.0.0 which is not available.'
			).should('be.visible');
		});

		it('should render the troubleshooting link', () => {
			mountComponent(singlePlugin);

			cy.contains(i10n.linkText).should('be.visible');
		});

		it('should not render a resolution dropdown when no options are available', () => {
			mountComponent(singlePlugin);

			cy.get(
				'#component-resolution-mock-plugin-controlDropdown'
			).should('not.exist');
		});
	});

	describe('single missing data model', () => {
		const singleDataModel: CfsMissingComponent[] = [
			{
				id: 'MOCKPACKAGE',
				version: '2.0.0',
				type: 'data-model',
				soc: 'MOCKSOC'
			}
		];

		it('should render the singular title', () => {
			mountComponent(singleDataModel);

			cy.contains(i10n.single.title).should('be.visible');
		});

		it('should render the missing data model card', () => {
			mountComponent(singleDataModel);

			cy.contains(i10n.errorItem.missingDataModelTitle).should(
				'be.visible'
			);
		});

		it('should render the component description', () => {
			mountComponent(singleDataModel);

			cy.contains(
				'System Planner requires MOCKSOC MOCKPACKAGE data model version 2.0.0 which is not available.'
			).should('be.visible');
		});
	});

	describe('multiple missing components', () => {
		const multipleComponents: CfsMissingComponent[] = [
			{
				id: 'max32690-plugin',
				version: '1.0.0',
				type: 'plugin'
			},
			{
				id: 'max32690-data-model',
				version: '2.0.0',
				type: 'data-model',
				soc: 'MAX32690'
			}
		];

		it('should render the plural title with count', () => {
			mountComponent(multipleComponents);

			cy.contains(`2 ${i10n.multiple.title}`).should('be.visible');
		});

		it('should render a card for each missing component', () => {
			mountComponent(multipleComponents);

			cy.contains(i10n.errorItem.missingPluginTitle).should(
				'be.visible'
			);
			cy.contains(i10n.errorItem.missingDataModelTitle).should(
				'be.visible'
			);
		});

		it('should not render a resolution dropdown for each component when no options are available', () => {
			mountComponent(multipleComponents);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).should('not.exist');
			cy.get(
				'#component-resolution-max32690-data-model-controlDropdown'
			).should('not.exist');
		});
	});

	describe('locally available version resolution', () => {
		const componentWithLocalVersions: CfsMissingComponent[] = [
			{
				id: 'max32690-plugin',
				version: '1.0.0',
				type: 'plugin',
				availableVersions: ['1.0.0', '1.0.1', '1.0.2']
			}
		];

		it('should show the locally available version option', () => {
			mountComponent(componentWithLocalVersions);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.contains(
				'Upgrade to compatible locally-available version 1.0.2'
			).should('be.visible');
		});

		it('should allow selecting the locally available version', () => {
			mountComponent(componentWithLocalVersions);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown > vscode-option'
			)
				.contains(
					'Upgrade to compatible locally-available version 1.0.2'
				)
				.click();
			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown > vscode-option[aria-selected="true"]'
			).should('contain.text', '1.0.2');
		});

		it('should show a higher minor version as locally available', () => {
			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.1.7',
					type: 'plugin',
					availableVersions: ['1.2.0']
				}
			]);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.contains(
				'Upgrade to compatible locally-available version 1.2.0'
			).should('be.visible');
		});

		it('should not show a higher major version as locally available', () => {
			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.1.7',
					type: 'plugin',
					availableVersions: ['2.0.0']
				}
			]);

			cy.contains(
				'Upgrade to compatible locally-available version'
			).should('not.exist');
		});

		it('should not show an older version as locally available', () => {
			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.1.7',
					type: 'plugin',
					availableVersions: ['1.0.0']
				}
			]);

			cy.contains(
				'Upgrade to compatible locally-available version'
			).should('not.exist');
		});

		it('should only show the highest compatible version, not a higher major', () => {
			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.1.7',
					type: 'plugin',
					availableVersions: ['1.1.8', '1.2.0', '2.0.0']
				}
			]);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown > vscode-option'
			)
				.contains(
					'Upgrade to compatible locally-available version 1.2.0'
				)
				.should('exist');
			cy.contains(
				'Upgrade to compatible locally-available version 1.1.8'
			).should('not.exist');
			cy.contains(
				'Upgrade to compatible locally-available version 2.0.0'
			).should('not.exist');
		});
	});

	describe('remote version resolution', () => {
		const componentWithRemoteVersion: CfsMissingComponent[] = [
			{
				id: 'max32690-plugin',
				version: '1.0.0',
				type: 'plugin'
			}
		];

		beforeEach(() => {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-plugin',
											packages: [
												{
													reference: {
														name: 'max32690-plugin-pkg',
														version: '1.0.3'
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690-plugin',
															version: '1.0.3'
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		});

		it('should show the downloadable version option', () => {
			mountComponent(componentWithRemoteVersion);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).should('exist');
			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.contains(
				'Upgrade to latest compatible downloadable version 1.0.3'
			).should('be.visible');
		});

		it('should allow selecting the downloadable version', () => {
			mountComponent(componentWithRemoteVersion);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown > vscode-option'
			)
				.contains(
					'Upgrade to latest compatible downloadable version 1.0.3'
				)
				.click();
			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown > vscode-option[aria-selected="true"]'
			).should('contain.text', '1.0.3');
		});
	});

	describe('remote version boundary filtering', () => {
		const componentRequiring117: CfsMissingComponent[] = [
			{
				id: 'max32690-plugin',
				version: '1.1.7',
				type: 'plugin'
			}
		];

		function mockRemoteVersion(version: string) {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-plugin',
											packages: [
												{
													reference: {
														name: 'max32690-plugin-pkg',
														version
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690-plugin',
															version
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		}

		it('should show a higher minor remote version as downloadable', () => {
			mockRemoteVersion('1.2.0');
			mountComponent(componentRequiring117);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).click();
			cy.contains(
				'Upgrade to latest compatible downloadable version 1.2.0'
			).should('be.visible');
		});

		it('should not show a higher major remote version as downloadable', () => {
			mockRemoteVersion('2.0.0');
			mountComponent(componentRequiring117);

			cy.contains(
				'Upgrade to latest compatible downloadable version'
			).should('not.exist');
		});

		it('should not show an older remote version as downloadable', () => {
			mockRemoteVersion('1.0.0');
			mountComponent(componentRequiring117);

			cy.contains(
				'Upgrade to latest compatible downloadable version'
			).should('not.exist');
		});
	});

	describe('semver range variants', () => {
		function mockRemoteVersionSemver(version: string) {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-plugin',
											packages: [
												{
													reference: {
														name: 'max32690-plugin-pkg',
														version
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690-plugin',
															version
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		}

		const localVersionCases: Array<{
			cfsconfigVersion: string;
			availableVersion: string;
			showLocallyAvailable: boolean;
		}> = [
			// ^1.1.7 (caret range: >=1.1.7 <2.0.0)
			{
				cfsconfigVersion: '^1.1.7',
				availableVersion: '2.0.0',
				showLocallyAvailable: false
			},
			{
				cfsconfigVersion: '^1.1.7',
				availableVersion: '1.0.0',
				showLocallyAvailable: false
			},
			// ~1.1.7 (tilde range: >=1.1.7 <1.2.0)
			{
				cfsconfigVersion: '~1.1.7',
				availableVersion: '1.2.0',
				showLocallyAvailable: false
			},
			{
				cfsconfigVersion: '~1.1.7',
				availableVersion: '2.0.0',
				showLocallyAvailable: false
			},
			// 1.1.5-1.1.7 (prerelease: treated as ^1.1.5-1.1.7, >=1.1.5-1.1.7 <2.0.0)
			{
				cfsconfigVersion: '1.1.5-1.1.7',
				availableVersion: '2.0.0',
				showLocallyAvailable: false
			}
		];

		const remoteVersionCases: Array<{
			cfsconfigVersion: string;
			mockVersion: string;
			showUpgradable: boolean;
		}> = [
			// ^1.1.7 (caret range: >=1.1.7 <2.0.0)
			{
				cfsconfigVersion: '^1.1.7',
				mockVersion: '1.2.0',
				showUpgradable: true
			},
			{
				cfsconfigVersion: '^1.1.7',
				mockVersion: '2.0.0',
				showUpgradable: false
			},
			// ~1.1.7 (tilde range: >=1.1.7 <1.2.0)
			{
				cfsconfigVersion: '~1.1.7',
				mockVersion: '1.1.8',
				showUpgradable: true
			},
			{
				cfsconfigVersion: '~1.1.7',
				mockVersion: '1.2.0',
				showUpgradable: false
			},
			// 1.1.5-1.1.7 (prerelease: treated as ^1.1.5-1.1.7, >=1.1.5-1.1.7 <2.0.0)
			{
				cfsconfigVersion: '1.1.5-1.1.7',
				mockVersion: '1.2.0',
				showUpgradable: true
			},
			{
				cfsconfigVersion: '1.1.5-1.1.7',
				mockVersion: '2.0.0',
				showUpgradable: false
			}
		];

		localVersionCases.forEach(
			({
				cfsconfigVersion,
				availableVersion,
				showLocallyAvailable
			}) => {
				it(`should ${showLocallyAvailable ? '' : 'not '}show local version ${availableVersion} as locally available for ${cfsconfigVersion}`, () => {
					mountComponent([
						{
							id: 'max32690-plugin',
							version: cfsconfigVersion,
							type: 'plugin',
							availableVersions: [availableVersion]
						}
					]);

					if (showLocallyAvailable) {
						cy.get(
							'#component-resolution-max32690-plugin-controlDropdown'
						).click();
						cy.contains(
							`Upgrade to compatible locally-available version ${availableVersion}`
						).should('be.visible');
					} else {
						cy.contains(
							'Upgrade to compatible locally-available version'
						).should('not.exist');
					}
				});
			}
		);

		remoteVersionCases.forEach(
			({cfsconfigVersion, mockVersion, showUpgradable}) => {
				it(`should ${showUpgradable ? '' : 'not '}show remote version ${mockVersion} as downloadable for ${cfsconfigVersion}`, () => {
					mockRemoteVersionSemver(mockVersion);
					mountComponent([
						{
							id: 'max32690-plugin',
							version: cfsconfigVersion,
							type: 'plugin'
						}
					]);

					if (showUpgradable) {
						cy.get(
							'#component-resolution-max32690-plugin-controlDropdown'
						).click();
						cy.contains(
							`Upgrade to latest compatible downloadable version ${mockVersion}`
						).should('be.visible');
					} else {
						cy.contains(
							'Upgrade to latest compatible downloadable version'
						).should('not.exist');
					}
				});
			}
		);
	});

	describe('no resolution options available', () => {
		it('should not show the resolution dropdown when no options are available', () => {
			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.0.0',
					type: 'plugin'
				}
			]);

			cy.get(
				'#component-resolution-max32690-plugin-controlDropdown'
			).should('not.exist');
		});
	});

	describe('package installation flow', () => {
		function mockInstallApi(success: boolean, errorMsg?: string) {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-plugin',
											packages: [
												{
													reference: {
														name: 'max32690-plugin-pkg',
														version: '1.0.0'
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690-plugin',
															version: '1.0.0'
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}

					if (message.type === 'packager--install') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											reference: {
												name: 'max32690-plugin-pkg',
												version: '1.0.0'
											},
											success,
											...(errorMsg && {error: errorMsg})
										}
									]
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		}

		const pluginRequiringInstall: CfsMissingComponent[] = [
			{
				id: 'max32690-plugin',
				version: '1.0.0',
				type: 'plugin'
			}
		];

		it('should show the Continue button when the required version is available for install', () => {
			mockInstallApi(true);
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').should('be.visible');
		});

		it('should show the installed state after a successful installation', () => {
			mockInstallApi(true);
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').click();

			cy.dataTest('max32690-plugin:complete-state').should(
				'be.visible'
			);
		});

		it('should show the Continue to System Planner button when installation succeeds', () => {
			mockInstallApi(true);
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').click();

			cy.dataTest(
				'version-update:continue-to-system-planner-btn'
			).should('be.visible');
		});

		it('should show the error state after a failed installation', () => {
			mockInstallApi(false);
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').click();

			cy.dataTest('max32690-plugin:error-state').should('be.visible');
		});

		it('should show the Retry Updates button after a failed installation', () => {
			mockInstallApi(false);
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').click();

			cy.dataTest('version-update:retry-btn').should('be.visible');
		});

		it('should display the error message after a failed installation', () => {
			mockInstallApi(false, 'Installation failed: package not found');
			mountComponent(pluginRequiringInstall);

			cy.dataTest('version-update:continue-btn').click();

			cy.contains('Installation Failed').should('be.visible');
		});
	});

	describe('cfsconfig version update', () => {
		function mockCfsConfigPluginUpdateApi(
			remoteVersion: string,
			capturedMessages: any[]
		) {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-plugin',
											packages: [
												{
													reference: {
														name: 'max32690-plugin-pkg',
														version: remoteVersion
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690-plugin',
															version: remoteVersion
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}

					if (
						message.type ===
						'packager--update--persisted--cfsconfig--plugin--version'
					) {
						capturedMessages.push(message);
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: {
										reference: {
											name: 'max32690-plugin-pkg',
											version: remoteVersion
										},
										success: true
									}
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		}

		function mockCfsConfigDataModelUpdateApi(
			remoteVersion: string,
			capturedMessages: any[]
		) {
			mockVsCodeApi({
				postMessage(message: any) {
					if (message.type === 'packager--search') {
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: [
										{
											id: 'max32690-data-model',
											packages: [
												{
													reference: {
														name: 'max32690-data-model-pkg',
														version: remoteVersion
													},
													description: '',
													license: '',
													cfsVersion: '',
													components: [
														{
															name: 'max32690:max32690-data-model',
															version: remoteVersion
														}
													]
												}
											]
										}
									]
								}
							})
						);
					}

					if (
						message.type ===
						'packager--update--persisted--cfsconfig--data-model--version'
					) {
						capturedMessages.push(message);
						window.dispatchEvent(
							new MessageEvent('message', {
								data: {
									type: 'api-response',
									id: message.id,
									body: {
										reference: {
											name: 'max32690-data-model-pkg',
											version: remoteVersion
										},
										success: true
									}
								}
							})
						);
					}
				},
				getState() {
					return undefined;
				},
				setState<T>(newState: T) {
					return newState;
				}
			});
		}

		const versionFormatCases: Array<{
			cfsconfigVersion: string;
			availableVersion: string;
			remoteVersion: string;
			expectedVersion: string;
		}> = [
			{
				cfsconfigVersion: '1.0.0',
				availableVersion: '1.0.2',
				remoteVersion: '1.0.2',
				expectedVersion: '1.0.2'
			},
			{
				cfsconfigVersion: '^1.0.0',
				availableVersion: '1.0.2',
				remoteVersion: '1.0.2',
				expectedVersion: '1.0.2'
			},
			{
				cfsconfigVersion: '~1.0.0',
				availableVersion: '1.0.1',
				remoteVersion: '1.0.1',
				expectedVersion: '1.0.1'
			},
			{
				cfsconfigVersion: '1.1.5-1.1.7',
				availableVersion: '1.2.0',
				remoteVersion: '1.2.0',
				expectedVersion: '1.2.0'
			}
		];

		versionFormatCases.forEach(
			({
				cfsconfigVersion,
				availableVersion,
				remoteVersion,
				expectedVersion
			}) => {
				it(`should write the exact resolved version to cfsconfig when original version is '${cfsconfigVersion}'`, () => {
					const captured: any[] = [];
					mockCfsConfigPluginUpdateApi(remoteVersion, captured);

					mountComponent([
						{
							id: 'max32690-plugin',
							version: cfsconfigVersion,
							type: 'plugin',
							availableVersions: [availableVersion]
						}
					]);

					cy.get('vscode-checkbox').click();
					cy.dataTest('version-update:continue-btn')
						.should('be.visible')
						.click();

					cy.wrap(captured).should(msgs => {
						expect(msgs).to.have.length.greaterThan(0);
						expect(msgs[0].body.version).to.equal(expectedVersion);
					});
				});
			}
		);

		it('should write a caret-prefixed version to cfsconfig when allow future compatible versions is set', () => {
			const captured: any[] = [];
			mockCfsConfigPluginUpdateApi('1.0.2', captured);

			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.0.0',
					type: 'plugin',
					availableVersions: ['1.0.2']
				}
			]);

			cy.dataTest('version-update:continue-btn').click();

			cy.wrap(captured).should(msgs => {
				expect(msgs).to.have.length.greaterThan(0);
				expect(msgs[0].body.version).to.equal('^1.0.2');
			});
		});

		it('should write a caret-prefixed version for a caret-range cfsconfig version when allow future compatible versions is set', () => {
			const captured: any[] = [];
			mockCfsConfigPluginUpdateApi('1.0.2', captured);

			mountComponent([
				{
					id: 'max32690-plugin',
					version: '^1.0.0',
					type: 'plugin',
					availableVersions: ['1.0.2']
				}
			]);

			cy.dataTest('version-update:continue-btn').click();

			cy.wrap(captured).should(msgs => {
				expect(msgs).to.have.length.greaterThan(0);
				expect(msgs[0].body.version).to.equal('^1.0.2');
			});
		});

		it('should write a caret-prefixed version for a tilde-range cfsconfig version when allow future compatible versions is set', () => {
			const captured: any[] = [];
			mockCfsConfigPluginUpdateApi('1.0.1', captured);

			mountComponent([
				{
					id: 'max32690-plugin',
					version: '~1.0.0',
					type: 'plugin',
					availableVersions: ['1.0.1']
				}
			]);

			cy.dataTest('version-update:continue-btn').click();

			cy.wrap(captured).should(msgs => {
				expect(msgs).to.have.length.greaterThan(0);
				expect(msgs[0].body.version).to.equal('^1.0.1');
			});
		});

		it('should write a caret-prefixed version for a hyphen-range cfsconfig version when allow future compatible versions is set', () => {
			const captured: any[] = [];
			mockCfsConfigPluginUpdateApi('1.2.0', captured);

			mountComponent([
				{
					id: 'max32690-plugin',
					version: '1.1.5-1.1.7',
					type: 'plugin',
					availableVersions: ['1.2.0']
				}
			]);

			cy.dataTest('version-update:continue-btn').click();

			cy.wrap(captured).should(msgs => {
				expect(msgs).to.have.length.greaterThan(0);
				expect(msgs[0].body.version).to.equal('^1.2.0');
			});
		});

		it('should write the exact resolved version to cfsconfig for a data model component', () => {
			const captured: any[] = [];
			mockCfsConfigDataModelUpdateApi('2.0.1', captured);

			mountComponent([
				{
					id: 'max32690-data-model',
					version: '2.0.0',
					type: 'data-model',
					soc: 'MAX32690',
					availableVersions: ['2.0.1']
				}
			]);

			cy.get('vscode-checkbox').click();
			cy.dataTest('version-update:continue-btn')
				.should('be.visible')
				.click();

			cy.wrap(captured).should(msgs => {
				expect(msgs).to.have.length.greaterThan(0);
				expect(msgs[0].body.version).to.equal('2.0.1');
			});
		});
	});
});

/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
/* eslint-disable max-nested-callbacks */
import {navigationItems} from '../../common/constants/navigation';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {store} from '../../state/store';
import CoresSelectionContainer from './CoresSelectionContainer';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {
	setCoreConfig,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {
	ERROR_MESSAGES,
	ERROR_TYPES
} from '../../common/constants/validation-errors';

function TestComponent() {
	return (
		<div
			style={{
				width: '100%',
				height: '100vh',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<div style={{flex: 1}}>
				<CoresSelectionContainer />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

describe('Cores Selection', () => {
	const primaryCoreId = 'Arm Cortex-M4F';
	const defaultCoreId = 'RISC-V';
	const primaryCoreCard = `coresSelection:card:${primaryCoreId}`;
	const defaultCoreCard = `coresSelection:card:${defaultCoreId}`;

	beforeEach(() => {
		cy.viewport(1068, 688);
	});

	it('Should have a Primary core', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('cores-selection:container').should(
				'contain.text',
				'Primary'
			);
		});
	});

	it('Should display NotificationError on click Continue button', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			// By default the primary core is auto selected so we need to disable it
			cy.dataTest(`${primaryCoreCard}`).click();
			cy.dataTest(`${primaryCoreCard}`).should(
				'have.attr',
				'data-active',
				'false'
			);
			// Initially the error is not displayed
			cy.dataTest('cores-selection:notification-error').should(
				'not.exist'
			);

			// Click the Continue should show the correct error message
			cy.dataTest('wrksp-footer:continue-btn').click();
			cy.dataTest('cores-selection:notification-error').should(
				'exist'
			);
			cy.dataTest('cores-selection:notification-error').should(
				'contain.text',
				`${ERROR_MESSAGES[ERROR_TYPES.noSelection]}`
			);

			// Selecting a core should hide the error message
			cy.dataTest(`${primaryCoreCard}`).click();
			cy.dataTest(`${primaryCoreCard}`).should(
				'have.attr',
				'data-active',
				'true'
			);
			cy.dataTest('cores-selection:notification-error').should(
				'not.exist'
			);
		});
	});

	it('Should display NotificationError based on the validation rules', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		cy.mount(<TestComponent />, testStore)
			.then(() => {
				// Configure the selected core (primary)
				cy.dataTest(`${primaryCoreCard}`).should(
					'have.attr',
					'data-active',
					'true'
				);
			})
			.then(() => {
				cy.wrap(
					testStore.dispatch(
						setCoreConfig({
							id: `${primaryCoreId}`,
							config: {
								firmwarePlatform: 'zephyr',
								pluginId: 'MAX32690_zephyr.plugin',
								pluginVersion: '1.0.0',
								platformConfig: {
									someValue: 'someValue'
								}
							}
						})
					)
				)
					.then(() => {
						// De select the selected core
						cy.dataTest(`${primaryCoreCard}`).click();
						cy.dataTest(`${primaryCoreCard}`).should(
							'have.attr',
							'data-active',
							'false'
						);

						// Click the Continue button should show the correct error messages
						cy.dataTest('wrksp-footer:continue-btn').click();
						cy.dataTest('cores-selection:notification-error').should(
							'exist'
						);
						cy.dataTest('cores-selection:notification-error').should(
							'contain.text',
							`${ERROR_MESSAGES[ERROR_TYPES.noSelection]}`
						);

						// Enabling back the configured core
						cy.dataTest(`${primaryCoreCard}`).click();
						// Select the other core
						cy.dataTest(`${defaultCoreCard}`).click();
						// The error message should not be displayed
						cy.dataTest('cores-selection:notification-error').should(
							'not.exist'
						);
					})
					.then(() => {
						// Select and configure the default core, then de select it and press Continue, it should display the correct error message

						cy.wrap(
							testStore.dispatch(
								setCoreConfig({
									id: `${defaultCoreId}`,
									config: {
										firmwarePlatform: 'msdk',
										pluginId: 'MAX32690_MSDK.plugin',
										pluginVersion: '1.0.0',
										platformConfig: {
											someValue: 'someValue'
										}
									}
								})
							)
						).then(() => {
							// De select the default core
							cy.dataTest(`${defaultCoreCard}`).click();

							cy.dataTest(`${defaultCoreCard}`).should(
								'have.attr',
								'data-active',
								'false'
							);

							// Clicking on the Continue button should go to Workspace Location screen
							cy.dataTest('wrksp-footer:continue-btn').click();

							cy.dataTest(
								'cores-selection:notification-error'
							).should('not.exist');
						});
					});
			});
	});

	it('Should render the trustzone projects when the trustzone is enabled', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32657'));
		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		const coreId = 'arm_cortex-M33';
		const coreCard = `coresSelection:card:${coreId}`;
		const coreCheckbox = `cores-selection:${coreId}-card:checkbox`;
		const trustZoneToggleContainer = `toggle:trustzone-container-${coreId}`;
		const trustZoneToggle = `toggle:trustzone-${coreId}-span`;
		const secureCore = `core-${coreId}-secure`;
		const nonSecureCore = `core-${coreId}-nonsecure`;

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest(coreCard).should('exist');
			cy.dataTest(trustZoneToggleContainer).should('exist');

			// Enable the TrustZone toggle
			cy.dataTest(trustZoneToggle)
				.click()
				.then(() => {
					cy.dataTest(trustZoneToggle).should(
						'have.attr',
						'data-checked',
						'true'
					);

					// Assert the the 2 projects are rendered
					cy.dataTest(secureCore).should('exist');
					cy.dataTest(nonSecureCore).should('exist');
					cy.dataTest(coreCard).should(
						'have.attr',
						'data-active',
						'true'
					);
					cy.dataTest(nonSecureCore).should(
						'have.attr',
						'data-active',
						'true'
					);
					cy.dataTest(secureCore).should(
						'have.attr',
						'data-active',
						'true'
					);

					// Un-check the secure project
					cy.dataTest(secureCore).click();
					cy.dataTest(secureCore).should(
						'have.attr',
						'data-active',
						'false'
					);

					// Assert that the core card checkbox is in indeterminate state
					cy.dataTest(coreCard).within(() => {
						cy.dataTest(coreCheckbox).should(
							'have.class',
							'indeterminate'
						);
					});

					// Un-check the non-secure project
					cy.dataTest(nonSecureCore).click();
					cy.dataTest(nonSecureCore).should(
						'have.attr',
						'data-active',
						'false'
					);

					// Assert that the core card checkbox is unchecked state from being indeterminate
					cy.dataTest(coreCard)
						.within(() => {
							cy.dataTest(coreCheckbox).should(
								'not.have.class',
								'indeterminate'
							);
						})
						.should('have.attr', 'data-active', 'false');
				});

			// Check the base core checkbox should check both projects when the core card checkbox is un-checked
			cy.dataTest(coreCheckbox).should('not.be.checked');
			cy.dataTest(coreCard).within(() => {
				cy.dataTest(coreCheckbox).click();
			});
			cy.dataTest(secureCore).should(
				'have.attr',
				'data-active',
				'true'
			);
			cy.dataTest(nonSecureCore).should(
				'have.attr',
				'data-active',
				'true'
			);

			// Checking the base core checkbox should check both projects when the core card checkbox is indeterminate
			cy.dataTest(secureCore).click();
			cy.dataTest(coreCard).within(() => {
				cy.dataTest(coreCheckbox).should(
					'have.class',
					'indeterminate'
				);
				cy.dataTest(coreCheckbox).click();
			});
			cy.dataTest(secureCore).should(
				'have.attr',
				'data-active',
				'true'
			);
			cy.dataTest(nonSecureCore).should(
				'have.attr',
				'data-active',
				'true'
			);

			// Finally, un-checking the base core checkbox should un-check both projects
			cy.dataTest(coreCheckbox).click();
			cy.dataTest(secureCore).should(
				'have.attr',
				'data-active',
				'false'
			);
			cy.dataTest(nonSecureCore).should(
				'have.attr',
				'data-active',
				'false'
			);

			// Now, switching off the TrustZone toggle should remove both projects and the base core checkbox should be enabled
			cy.dataTest(trustZoneToggle)
				.click()
				.then(() => {
					cy.dataTest(trustZoneToggle).should(
						'have.attr',
						'data-checked',
						'false'
					);

					// Assert the the 2 projects are not rendered
					cy.dataTest(secureCore).should('not.exist');
					cy.dataTest(nonSecureCore).should('not.exist');
					cy.dataTest(coreCard).should(
						'have.attr',
						'data-active',
						'true'
					);
				});

			// Now, clicking on the card should toggle its selection without any issues
			// and clicking  on the trustzone toggle again to render the projects back and all the checkboxes should be un-checked
			cy.dataTest(coreCard)
				.click()
				.then(() => {
					cy.dataTest(coreCard).should(
						'have.attr',
						'data-active',
						'false'
					);
					cy.dataTest(trustZoneToggle)
						.click()
						.then(() => {
							cy.dataTest(secureCore).should('exist');
							cy.dataTest(nonSecureCore).should('exist');
							cy.dataTest(coreCard).should(
								'have.attr',
								'data-active',
								'false'
							);
							cy.dataTest(nonSecureCore).should(
								'have.attr',
								'data-active',
								'false'
							);
							cy.dataTest(secureCore).should(
								'have.attr',
								'data-active',
								'false'
							);
						});
				});

			// Un-check the secure project should assert that the core card checkbox is in indeterminate state
			// and clicking on the core card should select both projects
			cy.dataTest(secureCore).click();
			cy.dataTest(coreCard).within(() => {
				cy.dataTest(coreCheckbox).should(
					'have.class',
					'indeterminate'
				);
				cy.dataTest(coreCheckbox).click();
			});
			cy.dataTest(secureCore).should(
				'have.attr',
				'data-active',
				'true'
			);
			cy.dataTest(nonSecureCore).should(
				'have.attr',
				'data-active',
				'true'
			);
		});
	});
});

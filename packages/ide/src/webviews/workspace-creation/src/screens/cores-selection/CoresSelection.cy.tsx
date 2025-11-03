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

describe('WrkspFooter', () => {
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
				'Primary core should be enabled.'
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
		// The business rules are found in useCoreValidation hook
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
						cy.dataTest(
							'cores-selection:notification-error--noPrimaryCoreEnabled'
						).should(
							'contain.text',
							'Primary core should be enabled.'
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
						)

							.then(() => {
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

	it('Should render toggle and secure core options for Arm Cortex-M33 with TrustZone support', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32657'));
		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		const primaryCore = 'Arm Cortex-M33';
		const primaryCoreCard = `coresSelection:card:${primaryCore}`;
		const TrustZoneToggleContainer = `toggle:trustzone-container-${primaryCore}`;
		const TrustZoneToggle = `toggle:trustzone-${primaryCore}-span`;
		const secureCore = `core-secure-${primaryCore}`;
		const nonSecureCore = `core-non-secure-${primaryCore}`;

		cy.mount(<TestComponent />, testStore).then(() => {
			// Configure the selected core (primary)
			cy.dataTest(primaryCoreCard).should('exist');

			cy.dataTest(TrustZoneToggleContainer).should('exist');

			cy.dataTest(TrustZoneToggle)
				.click()
				.then(() => {
					cy.dataTest(TrustZoneToggle).should(
						'have.attr',
						'data-checked',
						'true'
					);

					cy.dataTest(secureCore).should('exist');
					cy.dataTest(nonSecureCore).should('exist');

					cy.dataTest(primaryCoreCard).should(
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

					// Deselecting one of secure and non-secure cores should make the primary core card in

					cy.dataTest(secureCore).click();

					cy.dataTest(secureCore).should(
						'have.attr',
						'data-active',
						'false'
					);

					cy.dataTest(primaryCoreCard).within(() => {
						cy.dataTest(
							'cores-selection:Arm Cortex-M33-card:checkbox'
						).should('have.class', 'indeterminate');
					});

					cy.dataTest(nonSecureCore).click();

					cy.dataTest(nonSecureCore).should(
						'have.attr',
						'data-active',
						'false'
					);

					cy.dataTest(primaryCoreCard).within(() => {
						cy.dataTest(
							'cores-selection:Arm Cortex-M33-card:checkbox'
						).should('not.have.class', 'indeterminate');
					});
				});
		});
	});
});

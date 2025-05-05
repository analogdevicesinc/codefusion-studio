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

		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);
		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('cores-selection:container').should(
				'contain.text',
				'Primary'
			);
		});
	});

	it('Should display NotificationError on click Continue button', () => {
		const testStore = {...store};

		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);
		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, testStore).then(() => {
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
				'Primary core should be enabled and configured.'
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

	it('Should display 2 NotificationError components on click Continue button when enabling 2 cores', () => {
		const testStore = {...store};

		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);
		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('cores-selection:notification-error').should(
				'not.exist'
			);

			cy.dataTest(`${primaryCoreCard}`).click();
			cy.dataTest(`${defaultCoreCard}`).click();

			cy.dataTest(`${primaryCoreCard}`).should(
				'have.attr',
				'data-active',
				'true'
			);

			cy.dataTest(`${defaultCoreCard}`).should(
				'have.attr',
				'data-active',
				'true'
			);

			// Click the Continue should show the correct error messages
			cy.dataTest('wrksp-footer:continue-btn').click();
			cy.dataTest('cores-selection:notification-error').should(
				'exist'
			);
			cy.dataTest(
				'cores-selection:notification-error--noPrimaryCore'
			).should(
				'contain.text',
				'Primary core should be enabled and configured.'
			);

			cy.dataTest(
				'cores-selection:notification-error--unconfiguredCore'
			).should('contain.text', 'Configure your selected core(s).');

			// Deselecting a core should hide all the error messages
			cy.dataTest(`${primaryCoreCard}`).click();
			cy.dataTest(`${primaryCoreCard}`).should(
				'have.attr',
				'data-active',
				'false'
			);
			cy.dataTest('cores-selection:notification-error').should(
				'not.exist'
			);
		});
	});

	it('Should display NotificationError based on the validation rules', () => {
		// The business rules are found in useCoreValidation hook
		const testStore = {...store};

		testStore.dispatch(
			setActiveScreen(navigationItems.coresSelection)
		);

		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, testStore)
			.then(() => {
				// Configure the selected core (primary)
				cy.dataTest(`${primaryCoreCard}`).click();
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
						// Check if the core is configured
						cy.dataTest(`${primaryCoreCard}`).should(
							'contain.text',
							'Configured'
						);
					})
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
							'cores-selection:notification-error--noPrimaryCore'
						).should(
							'contain.text',
							'Primary core should be enabled and configured.'
						);

						// Enabling back the configured core
						cy.dataTest(`${primaryCoreCard}`).click();
						// Select the other core
						cy.dataTest(`${defaultCoreCard}`).click();
						// The error message should not be displayed
						cy.dataTest('cores-selection:notification-error').should(
							'not.exist'
						);
						// Clicking again on the Continue button should display the correct error message
						cy.dataTest('wrksp-footer:continue-btn').click();
						cy.dataTest(
							'cores-selection:notification-error--unconfiguredCore'
						).should(
							'contain.text',
							'Configure your selected core(s).'
						);
					})
					.then(() => {
						// Select and configure the default core, then de select it and press Continue, it should display the correct error message
						// cy.dataTest(`${defaultCoreCard}`).click();
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
								cy.dataTest(`${defaultCoreCard}`).should(
									'contain.text',
									'Configured'
								);
							})

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
});

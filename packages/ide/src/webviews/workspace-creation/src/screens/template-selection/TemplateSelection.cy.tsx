import {store} from '../../state/store';
import TemplateSelection from './TemplateSelection';
import {setSelectedSoc} from '../../state/slices/workspace-config/workspace-config.reducer';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';

describe('TemplateSelection', () => {
	beforeEach(() => {
		localStorage.setItem(
			'workspace-templates',
			JSON.stringify([
				{
					firmwarePlatform: 'Zephyr 3.7',
					pluginId: 'Hello World',
					pluginName: 'Hello World',
					pluginDescription:
						'A basic getting started program. This version of Hello_World prints an incrementing count to the console UART and toggles LED1 every 500 ms.',
					folders: [
						{
							name: 'm4',
							firmwarePlatform: 'Zephyr 3.7'
						}
					]
				},
				{
					firmwarePlatform: 'MSDK',
					pluginId: 'Hello World (M4 + RISC-V)',
					pluginName: 'Hello World (M4 + RISC-V)',
					pluginDescription:
						'A basic getting started program running on the RISC-V core. This version of Hello_World prints an incrementing count to the console UART and toggles LED1 every 500 ms.',
					folders: [
						{
							name: 'm4',
							firmwarePlatform: 'MSDK'
						},
						{
							name: 'riscv',
							firmwarePlatform: 'Zephyr 3.7'
						}
					]
				},
				{
					firmwarePlatform: 'Zephyr 3.7',
					pluginId: 'Dual Core Sync',
					pluginName: 'Dual Core Sync',
					pluginDescription:
						'Projects Dual_core_sync_arm and Dual_core_sync_riscv demonstrate loading the RISC-V core program from the ARM core and synchronising these two cores by hardware semaphores. ',
					folders: [
						{
							name: 'Dual_core_sync_arm',
							firmwarePlatform: 'Zephyr 3.7'
						},
						{
							name: 'Dual_core_sync_riscv',
							firmwarePlatform: 'Zephyr 3.7'
						}
					]
				}
			])
		);
	});

	it('Should yield correct search results', () => {
		const testStore = {...store};

		testStore.dispatch(
			setActiveScreen(navigationItems.templateSelection)
		);

		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(
			<div style={{height: '100vh'}}>
				<TemplateSelection />
			</div>,
			testStore
		);

		cy.get('#control-input').shadow().find('input').type('RISC-V');

		cy.dataTest(
			'templateSelection:card:Hello World (M4 + RISC-V)'
		).should('exist');

		cy.dataTest('templateSelection:card:Hello World').should(
			'not.exist'
		);

		cy.dataTest('msdk-chip').click();

		cy.dataTest(
			'templateSelection:card:Hello World (M4 + RISC-V)'
		).should('exist');
	});

	it('Should display CfsNotification when no item is selected and "Continue" is clicked', () => {
		const testStore = {...store};
		const cfsNavigationId = 'multicore-template-selection-error';

		testStore.dispatch(
			setActiveScreen(navigationItems.templateSelection)
		);

		cy.mount(
			<div style={{width: '100%', height: '100%'}}>
				<div style={{flexGrow: 1}}>
					<TemplateSelection />
				</div>
				<div>
					<WrkspFooter />
				</div>
			</div>,
			testStore
		).then(() => {
			cy.wait(1000);

			cy.dataTest(`${cfsNavigationId}`).should('not.exist');

			cy.dataTest('wrksp-footer:continue-btn').click();

			cy.dataTest(`${cfsNavigationId}`).should('exist');
			cy.dataTest(`${cfsNavigationId}`).should(
				'contain.text',
				'Please make a selection.'
			);
		});
	});

	it('Clicking filter chip should only load only related templates', () => {
		const testStore = {...store};
		testStore.dispatch(
			setActiveScreen(navigationItems.templateSelection)
		);

		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(
			<div style={{height: '100vh'}}>
				<TemplateSelection />
			</div>,
			testStore
		);

		cy.dataTest('templateSelection:card:Hello World').should('exist');
		cy.dataTest('templateSelection:card:Dual Core Sync').should(
			'exist'
		);
		cy.dataTest(
			'templateSelection:card:Hello World (M4 + RISC-V)'
		).should('exist');

		cy.dataTest('zephyr 3.7-chip').should('exist').click();

		cy.dataTest('templateSelection:card:Hello World').should('exist');
		cy.dataTest('templateSelection:card:Dual Core Sync').should(
			'exist'
		);
		cy.dataTest(
			'templateSelection:card:Hello World (M4 + RISC-V)'
		).should('not.exist');
	});
});

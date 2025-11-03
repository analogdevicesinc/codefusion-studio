import {store} from '../../state/store';
import {setSelectedSoc} from '../../state/slices/workspace-config/workspace-config.reducer';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import WorkspaceOptions from '../workspace-options/WorkspaceOptions';

function TestFunction() {
	return (
		<div style={{width: '100%', height: '100%'}}>
			<div style={{flexGrow: 1}}>
				<WorkspaceOptions />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

const mockTemplates = [
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
		],
		supportedHostPlatforms: ['linux', 'osx', 'windows']
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
];

describe('TemplateSelection', () => {
	beforeEach(() => {
		cy.viewport(1200, 800);
	});

	describe('when the continue button is clicked', () => {
		beforeEach(() => {
			localStorage.setItem(
				'host-platform',
				JSON.stringify('windows')
			);

			localStorage.setItem(
				'workspace-templates',
				JSON.stringify(mockTemplates)
			);
		});

		it('Should display CfsNotification when no item is selected', () => {
			const testStore = {...store};
			const cfsNavigationId = 'multicore-template-selection-error';

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				cy.wait(1000);

				cy.dataTest(`${cfsNavigationId}`).should('not.exist');

				cy.dataTest('wrksp-footer:continue-btn').click();
				cy.wait(1000);

				cy.dataTest(`${cfsNavigationId}`).should('exist');
				cy.dataTest(`${cfsNavigationId}`).should(
					'contain.text',
					'Please make a selection.'
				);

				// If the user clicks on a card, the error message should disappear
				cy.dataTest('templateSelection:card:Hello World').click();
				cy.wait(100);
				cy.dataTest(`${cfsNavigationId}`).should('not.exist');
			});
		});
	});

	describe('when the screen loads the template', () => {
		beforeEach(() => {
			localStorage.setItem(
				'host-platform',
				JSON.stringify('windows')
			);

			// Copy the mock templates and modify one to be compatible only with linux and osx
			const templates = [...mockTemplates];
			templates[0] = {
				...mockTemplates[0],
				supportedHostPlatforms: ['linux', 'osx']
			};

			localStorage.setItem(
				'workspace-templates',
				JSON.stringify(templates)
			);
		});

		it('should filter out the templates that are not compatible with the host platform', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				cy.wait(1000);

				cy.dataTest('templateSelection:card:Hello World').should(
					'not.exist'
				);
				cy.dataTest(
					'templateSelection:card:Hello World (M4 + RISC-V)'
				).should('exist');
				cy.dataTest('templateSelection:card:Dual Core Sync').should(
					'exist'
				);
			});
		});
	});
});

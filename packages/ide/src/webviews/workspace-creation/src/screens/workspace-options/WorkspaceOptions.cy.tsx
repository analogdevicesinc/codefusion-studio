import {store} from '../../state/store';
import WorkspaceOptions from './WorkspaceOptions';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {
	setSelectedBoardPackage,
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
				<WorkspaceOptions />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

const socId = 'MAX32690';
const boardId = 'AD-APARD32690-SL';
const packageId = 'WLP';

describe('WorkspaceOptions', () => {
	beforeEach(() => {
		
		localStorage.setItem('host-platform', JSON.stringify('windows'));

		cy.viewport(1200, 800);
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

	it('Should display 1 card, template Selection container and the correct page description', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc(socId));
		testStore.dispatch(
			setSelectedBoardPackage({
				boardId,
				packageId
			})
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('layout:mainPanel:workspace-options')
				.should('exist')
				.should(
					'contain.text',
					'How would you like to create your workspace?'
				);

			cy.dataTest('workspaceOptions:card:manualConfig').should(
				'exist'
			);

			cy.dataTest(
				'workspace-options:template-selection:container'
			).should('exist');
		});
	});

	it('Should have predefined configuration selected by default', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc(socId));
		testStore.dispatch(
			setSelectedBoardPackage({
				boardId,
				packageId
			})
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('workspaceOptions:card:manualConfig').should(
				'have.attr',
				'data-active',
				'false'
			);
		});
	});
});

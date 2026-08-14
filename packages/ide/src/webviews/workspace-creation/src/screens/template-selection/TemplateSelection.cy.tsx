/**
 *
 * Copyright (c) 2025 - 2026 Analog Devices, Inc.
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

	describe('when templates are displayed', () => {
		beforeEach(() => {
			localStorage.setItem(
				'host-platform',
				JSON.stringify('windows')
			);

			// Create templates with names that would clearly show ordering
			const unorderedTemplates = [
				{
					firmwarePlatform: 'MSDK',
					pluginId: 'msdk-b',
					pluginName: 'MSDK B',
					pluginDescription: 'Should be second',
					folders: [{name: 'm4', firmwarePlatform: 'MSDK'}],
					supportedHostPlatforms: ['linux', 'osx', 'windows']
				},
				{
					firmwarePlatform: 'MSDK',
					pluginId: 'msdk-a',
					pluginName: 'MSDK A',
					pluginDescription: 'Should be first',
					folders: [{name: 'm4', firmwarePlatform: 'MSDK'}],
					supportedHostPlatforms: ['linux', 'osx', 'windows']
				},
				{
					firmwarePlatform: 'MSDK',
					pluginId: 'msdk-d',
					pluginName: 'MSDK D',
					pluginDescription: 'Should be fourth',
					folders: [{name: 'm4', firmwarePlatform: 'MSDK'}],
					supportedHostPlatforms: ['linux', 'osx', 'windows']
				},
				{
					firmwarePlatform: 'MSDK',
					pluginId: 'msdk-c',
					pluginName: 'MSDK C',
					pluginDescription: 'Should be third',
					folders: [{name: 'm4', firmwarePlatform: 'MSDK'}],
					supportedHostPlatforms: ['linux', 'osx', 'windows']
				}
			];

			// Sort templates alphabetically to match plugin manager behavior
			unorderedTemplates.sort((a, b) =>
				a.pluginName.localeCompare(b.pluginName)
			);

			localStorage.setItem(
				'workspace-templates',
				JSON.stringify(unorderedTemplates)
			);
		});

		it('should display templates in alphabetical order by name', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore);

			// Get all template cards and verify their order
			cy.get('[data-test^="templateSelection:card:"]')
				.should('have.length', 4)
				.each(($card, index) => {
					const expectedOrder = [
						'MSDK A',
						'MSDK B',
						'MSDK C',
						'MSDK D'
					];

					cy.wrap($card)
						.find('h3')
						.should('have.text', expectedOrder[index]);
				});
		});
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

	describe('template search functionality', () => {
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

		it('should display all templates when search is empty', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				cy.get('[data-test^="templateSelection:card:"]').should(
					'have.length',
					3
				);
			});
		});

		it('should filter templates by name (case-insensitive)', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				// Type in search input - search for 'dual' to match only 'Dual Core Sync'
				cy.dataTest('templateSelection:search-input-control-input')
					.shadow()
					.find('input')
					.type('DUAL');

				// Should only show Dual Core Sync template
				cy.get('[data-test^="templateSelection:card:"]').should(
					'have.length',
					1
				);
				cy.dataTest('templateSelection:card:Dual Core Sync').should(
					'exist'
				);
			});
		});

		it('should filter templates by name with case-insensitive partial match', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				cy.dataTest('templateSelection:search-input-control-input')
					.shadow()
					.find('input')
					.type('HELLO');

				// Should show both Hello World templates
				cy.get('[data-test^="templateSelection:card:"]').should(
					'have.length',
					2
				);
				cy.dataTest('templateSelection:card:Hello World').should(
					'exist'
				);
				cy.dataTest(
					'templateSelection:card:Hello World (M4 + RISC-V)'
				).should('exist');
			});
		});

		it('should filter templates by description', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				// Search for text that appears in Dual Core Sync description
				cy.dataTest('templateSelection:search-input-control-input')
					.shadow()
					.find('input')
					.type('synchronising');

				cy.get('[data-test^="templateSelection:card:"]').should(
					'have.length',
					1
				);
				cy.dataTest('templateSelection:card:Dual Core Sync').should(
					'exist'
				);
			});
		});

		it('should show "no templates found" message when search has no matches', () => {
			const testStore = {...store};

			testStore.dispatch(
				setActiveScreen(navigationItems.workspaceOptions)
			);

			testStore.dispatch(setSelectedSoc('MAX32690'));

			cy.mount(<TestFunction />, testStore).then(() => {
				const searchQuery = 'nonexistent template xyz';

				// Search for non-existent template
				cy.dataTest('templateSelection:search-input-control-input')
					.shadow()
					.find('input')
					.type(searchQuery);

				cy.get('[data-test^="templateSelection:card:"]').should(
					'have.length',
					0
				);

				cy.dataTest('no-search-results').should('exist');
				cy.dataTest('no-results-description').and(
					'contain.text',
					`"${searchQuery}"`
				);
			});
		});
	});
});

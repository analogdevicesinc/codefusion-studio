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

import {
	setSideBarState,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {PartitionSidebar} from './partition-sidebar';
import {type Soc} from '../../../../../common/types/soc';
import type {CfsConfig} from 'cfs-types';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import {configurePreloadedStore} from '../../../state/store';

const mockAdsp = formatSocCoreMemoryBlocks(
	(await import('@socs/adsp-21835w-bga_ed.json'))
		.default as unknown as Soc
);

const mockedAdspConfigDict = {
	BoardName: 'EV-SOMCRR-EZKIT',
	Package: 'BGA_ED',
	Soc: 'ADSP-SC835W',
	Projects: [
		{
			ExternallyManaged: false,
			FirmwarePlatform: 'SHARC-FX',
			CoreId: 'FX',
			ProjectId: 'FX',
			PluginId: '',
			PluginVersion: ''
		},
		{
			ExternallyManaged: false,
			FirmwarePlatform: 'SHARC-FX',
			CoreId: 'CM33',
			ProjectId: 'CM33',
			PluginId: '',
			PluginVersion: ''
		}
	]
} as unknown as CfsConfig;

const memoryBlocks = mockAdsp.Cores.flatMap(
	core => core.Memory
).filter(
	(block, index, self) =>
		index === self.findIndex(b => b.Name === block.Name)
);

export const createMockPartition = (
	partition: Partial<Partition>
): Partition => ({
	displayName: partition.displayName ?? 'TestPartition',
	type: partition.type ?? 'Flash',
	baseBlock: partition.baseBlock ?? {
		Name: '',
		Description: '',
		AddressStart: '',
		AddressEnd: '',
		Width: 0,
		Access: '',
		Location: '',
		Type: ''
	},
	blockNames: partition.blockNames ?? [],
	startAddress: partition.startAddress ?? '',
	size: partition.size ?? 0,
	displayUnit: partition.displayUnit ?? undefined,
	projects: partition.projects ?? []
});

describe('Partition Sidebar - SHARC-FX', () => {
	describe('Form Validation - Contiguous Blocks', () => {
		const reduxStore = configurePreloadedStore(
			mockAdsp as unknown as Soc,
			mockedAdspConfigDict
		);

		beforeEach(() => {
			reduxStore.dispatch(
				setSideBarState({
					isSidebarMinimised: false,
					sidebarPartition: {
						displayName: 'ContiguosTestPartition',
						type: 'RAM',
						baseBlock: {
							Name: '',
							Description: '',
							AddressStart: '',
							AddressEnd: '',
							Width: 0,
							MinimumAlignment: undefined,
							Access: '',
							Location: '',
							Type: ''
						},
						blockNames: memoryBlocks.map(mb => mb.Name),
						startAddress: '',
						size: 0,
						displayUnit: 'KB',
						projects: [
							{
								label: mockAdsp.Cores[0].Name,
								access: 'R',
								coreId: mockAdsp.Cores[0].Id,
								projectId: mockAdsp.Cores[0].Id + '-proj',
								owner: true
							}
						],
						config: undefined
					}
				})
			);
			cy.viewport(262, 688);
		});

		it('should display an error when the size is outside the contiguous memory block range', () => {
			window.localStorage.setItem(
				'configDict',
				JSON.stringify(mockedAdspConfigDict)
			);

			cy.mount(
				<PartitionSidebar
					isFormTouched
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('memory-type-dropdown').click();

			cy.dataTest('RAM').click();

			cy.dataTest('base-block-dropdown').click();

			cy.dataTest('SHARC_FX_L1_DRAM').click();

			cy.dataTest('size-stepper-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('655');
				});

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Size exceeds contiguous memory block range'
			);
		});

		it('should not display an error when the size is fitting into contiguous memory block range', () => {
			window.localStorage.setItem(
				'configDict',
				JSON.stringify(mockedAdspConfigDict)
			);

			cy.mount(
				<PartitionSidebar
					isFormTouched
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('memory-type-dropdown').click();

			cy.dataTest('RAM').click();

			cy.dataTest('base-block-dropdown').click();

			cy.dataTest('SHARC_FX_L1_DRAM').click();

			cy.dataTest('size-stepper-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('555');
				});

			cy.dataTest('size-stepper-error').should('not.exist');
		});
	});
});

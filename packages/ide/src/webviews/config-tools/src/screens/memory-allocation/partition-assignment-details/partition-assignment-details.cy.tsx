/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {Soc} from '../../../../../common/types/soc';
import {
	setMemoryScreenActiveView,
	setOpenProjectCards,
	setOpenTypeCards
} from '../../../state/slices/app-context/appContext.reducer';
import {
	createPartition,
	editPartition,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {configurePreloadedStore} from '../../../state/store';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import PartitionAssignmentDetails from './partition-assignment-details';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

import type {CfsConfig} from 'cfs-plugins-api';
const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			ProjectId: 'CM4-proj',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: ''
		},
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			ProjectId: 'RV-proj',
			Name: 'RISC-V (RV32)',
			PluginId: ''
		}
	]
} as unknown as CfsConfig;

const createMockPartition = (
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
	projects: partition.projects ?? []
});

describe('Partition-assignment-details-card', () => {
	const reduxStore = configurePreloadedStore(mock, mockedConfigDict);

	describe('Partition Details Page', () => {
		before(() => {
			reduxStore.dispatch(
				createPartition({
					...createMockPartition({
						type: 'Flash',
						startAddress: '0x10400000',
						blockNames: ['flash0', 'flash1'],
						size: 1,
						projects: [
							{
								label: mock.Cores[1].Name,
								access: 'R',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})
				})
			);
			cy.mount(<PartitionAssignmentDetails />, reduxStore);
		});

		it('should be able to create a partition and have Project view and Type View', () => {
			cy.dataTest('partition-project-view-button').should('exist');

			cy.dataTest('partition-type-view-button').should('exist');

			cy.dataTest('partition-project-view').should('exist');

			cy.dataTest('partition-type-view').should('not.exist');

			cy.dataTest('project-view-memory-card-container').should(
				'exist'
			);

			cy.dataTest('project-view-memory-card-container')
				.eq(0)
				.find('h3')
				.should('have.text', 'ARM Cortex-M4');

			cy.dataTest('project-view-memory-card-container')
				.eq(0)
				.find('span')
				.should('have.text', 'No memory partitions allocated yet.');

			cy.dataTest('project-view-memory-card-container')
				.eq(1)
				.find('h3')
				.should('have.text', 'RISC-V (RV32)');

			cy.dataTest('partition-details-chevron')
				.should('exist')
				.click();

			cy.dataTest('partition-details-project-view-cards')
				.should('exist')
				.children()
				.should('have.length', 1);

			cy.dataTest('partition 0').should('exist');
			cy.dataTest('partition 0')
				.find('vscode-badge')
				.should('be.visible');

			cy.dataTest('partition-type-view-button').click();

			cy.dataTest('partition-project-view').should('not.exist');

			cy.dataTest('partition-type-view').should('exist');

			cy.dataTest('type-view-memory-card-container').should('exist');

			cy.dataTest('type-view-memory-card-container')
				.find('h3')
				.should('have.text', 'Flash');

			cy.dataTest('partition-details-chevron')
				.should('exist')
				.click();

			cy.dataTest('partition-details-type-view-cards')
				.should('exist')
				.children()
				.should('have.length', 1);

			cy.dataTest('partition 0').should('exist');
			cy.dataTest('partition 0')
				.find('vscode-badge')
				.should('be.visible');
		});
	});

	describe('Partition Edit/Delete', () => {
		beforeEach(() => {
			reduxStore.dispatch(
				createPartition({
					...createMockPartition({
						type: 'RAM',
						startAddress: '0x20000000',
						blockNames: ['sysram0'],
						size: 1,
						projects: [
							{
								label: mock.Cores[1].Name,
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})
				})
			);

			reduxStore.dispatch(setMemoryScreenActiveView('project'));
			reduxStore.dispatch(setOpenProjectCards([]));

			cy.mount(<PartitionAssignmentDetails />, reduxStore);
		});

		it('should be able to delete partition', () => {
			cy.dataTest('project-view-memory-card-container').should(
				'exist'
			);
			cy.dataTest('partition-details-chevron')
				.eq(0)
				.should('exist')
				.click();
			cy.dataTest('partition-details-project-view-cards')
				.should('exist')
				.children()
				.should('have.length', 2);
			cy.dataTest('delete-partition-btn')
				.eq(0)
				.should('exist')
				.click();

			cy.dataTest('partition 1').should('not.exist');
			cy.dataTest('partition-details-project-view-cards')
				.should('exist')
				.children()
				.should('have.length', 1);
		});

		it('should edit the partition', () => {
			cy.dataTest('partition-details-chevron')
				.eq(0)
				.should('exist')
				.click();

			cy.dataTest('edit-partition-btn').should('be.visible');
			reduxStore.dispatch(
				editPartition({
					sidebarPartition: {
						...createMockPartition({
							type: 'RAM',
							startAddress: '0x20000000',
							displayName: 'TestPartition2',
							blockNames: ['sysram0'],
							size: 1,
							projects: [
								{
									label: mock.Cores[1].Name,
									access: 'R/W/X',
									coreId: 'RV',
									projectId: 'RV-proj',
									owner: true
								}
							]
						})
					},
					startAddress: '0x20000000'
				})
			);

			cy.dataTest('partition 0')
				.find('h3')
				.should('have.text', 'TestPartition2');
		});

		it('should retain view type and expanded cards', () => {
			reduxStore.dispatch(setMemoryScreenActiveView('type'));
			reduxStore.dispatch(setOpenProjectCards(['RV-proj']));
			reduxStore.dispatch(setOpenTypeCards(['RAM']));

			cy.dataTest('partition-type-view').should('exist');
			cy.dataTest('partition 0').should('exist');

			cy.dataTest('partition-project-view-button').click();
			cy.dataTest('partition 0').should('exist');
		});
	});
});

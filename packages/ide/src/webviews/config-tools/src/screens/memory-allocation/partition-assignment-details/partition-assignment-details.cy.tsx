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

import {type Soc} from '../../../../../common/types/soc';
import {
	createPartition,
	editPartition,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {configurePreloadedStore} from '../../../state/store';
import PartitionAssignmentDetails from './partition-assignment-details';

const mock = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default);

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
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
};

const createMockPartition = (
	partition: Partial<Partition>
): Partition => ({
	displayName: partition.displayName ?? 'Test Partition',
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
	before(() => {
		window.localStorage.setItem('Cores', JSON.stringify(mock.Cores));
		window.localStorage.setItem(
			'MemoryBlocks',
			JSON.stringify(mock.Cores[0].Memory)
		);
		localStorage.setItem(
			'MemoryTypes',
			JSON.stringify(mock.MemoryTypes)
		);
		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockedConfigDict)
		);
	});

	const reduxStore = configurePreloadedStore(mock as unknown as Soc);

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

		it('should be able to create a partition', () => {
			cy.dataTest('non-volatile-memory-card-container').should(
				'exist'
			);

			cy.dataTest('non-volatile-memory-card-container').should(
				'exist'
			);

			cy.dataTest('volatile-memory-card-container').should(
				'not.exist'
			);

			cy.dataTest('partition-details-chevron')
				.should('exist')
				.click();

			cy.dataTest('non-volatile-partition 0').should('exist');
			cy.dataTest('non-volatile-partition 0')
				.find('vscode-badge')
				.should('be.visible');

			cy.dataTest('non-volatile-partition 0')
				.find('vscode-badge')
				.should('have.text', 'Flash');

			cy.dataTest('non-volatile-partition-details-card-list')
				.should('exist')
				.children()
				.should('have.length', 2);
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
			cy.mount(<PartitionAssignmentDetails />, reduxStore);
		});

		it('should be able to delete partition', () => {
			cy.dataTest('volatile-memory-card-container').should('exist');
			cy.dataTest('partition-details-chevron')
				.eq(0)
				.should('exist')
				.click();
			cy.dataTest('delete-partition-btn').should('exist').click();
			cy.dataTest('volatile-memory-card-container').should(
				'not.exist'
			);
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
							displayName: 'Test Partition 2',
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

			cy.dataTest('volatile-partition 0')
				.find('h3')
				.should('have.text', 'Test Partition 2');
		});
	});
});

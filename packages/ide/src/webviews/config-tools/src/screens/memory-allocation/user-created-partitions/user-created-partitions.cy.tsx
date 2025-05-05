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
	removePartition,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {configurePreloadedStore} from '../../../state/store';
import UserCreatedPartitions from './user-created-partitions';

const mock = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default);

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
	startAddress: partition.startAddress ?? '0x00000000',
	size: partition.size ?? 0,
	projects: partition.projects ?? []
});

describe('User created Partitions', () => {
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
	});

	const reduxStore = configurePreloadedStore(mock as unknown as Soc);

	describe('Created partitions should be visisble in side panel', () => {
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
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})
				})
			);
			cy.mount(<UserCreatedPartitions />, reduxStore);
		});

		it('user created partition should visible', () => {
			cy.dataTest('user-created-partition').should('be.visible');

			cy.dataTest('non-volatile-accordion')
				.find('section')
				.should('be.visible')
				.click();

			cy.dataTest('user-created-partion-info').should('be.visible');
			cy.dataTest('memory-partition-blocks')
				.children()
				.should('have.length', 2);
		});
	});

	describe('edit/delete partitions should trigger update the user created partiions section', () => {
		beforeEach(() => {
			reduxStore.dispatch(
				createPartition({
					...createMockPartition({
						type: 'RAM',
						displayName: 'TEST RAM PARTITION',
						startAddress: '0x30000000',
						blockNames: ['sysram0', 'sysram1'],
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
			cy.mount(<UserCreatedPartitions />, reduxStore);
		});

		it('deleting a partition removes it from the section', () => {
			reduxStore.dispatch(
				removePartition({startAddress: '0x30000000'})
			);

			cy.dataTest('volatile-parition-accordion').should('not.exist');
		});

		it('editing a partition should update the value', () => {
			cy.dataTest('volatile-parition-accordion').should('be.visible');

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
					startAddress: '0x30000000'
				})
			);

			cy.dataTest('volatile-parition-accordion')
				.get('section')
				.eq(0)
				.click();

			cy.dataTest('accordion:Test Partition 2').should('be.visible');
			cy.dataTest('accordion:Test Partition 2')
				.find('span')
				.eq(0)
				.should('have.text', 'Test Partition 2');
		});
	});
});

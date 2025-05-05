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

import {type Soc} from '../../../../common/types/soc';
import {createPartition} from '../../state/slices/partitions/partitions.reducer';
import {configurePreloadedStore} from '../../state/store';
import MemoryAllocation from './MemoryAllocation';

const mock = await import(
	'../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default);

const memoryBlocks = mock.Cores.flatMap(core => core.Memory).filter(
	(block, index, self) =>
		index === self.findIndex(b => b.Name === block.Name)
);
const memoryType = mock.MemoryTypes[0].Name;
const core = mock.Cores[0];
const blocksByType = memoryBlocks.filter(
	block => block.Type === memoryType
);

describe.skip('Memory Allocation', () => {
	describe('when filtering the memory screen', () => {
		before(() => {
			localStorage.setItem('MemoryBlocks', JSON.stringify([]));
			localStorage.setItem('Cores', JSON.stringify(mock.Cores));
			localStorage.setItem(
				'MemoryTypes',
				JSON.stringify(mock.MemoryTypes)
			);
		});
		beforeEach(() => {
			cy.viewport(1920, 1080);
			const reduxStore = configurePreloadedStore(
				mock as unknown as Soc
			);
			cy.mount(<MemoryAllocation />, reduxStore);
		});

		it('should display a message to the user when no memory blocks match the filter', () => {
			cy.get('[data-test="memory-type-filter"]').click();

			cy.get(
				`[data-test="multiselect-option-${mock.MemoryTypes[0].Name}"]`
			).click();

			cy.get('[data-test="no-memory-blocks"]').should('be.visible');
		});

		it('should correctly filter the memory blocks by type', () => {
			cy.get('[data-test="memory-type-filter"]').click();

			cy.get(
				`[data-test="multiselect-option-${memoryType}"]`
			).click();

			blocksByType.forEach(block =>
				cy
					.get(`[data-test="accordion:${block.Name}"]`)
					.should('exist')
			);

			memoryBlocks
				.filter(block => block.Type !== memoryType)
				.forEach(block =>
					cy
						.get(`[data-test="accordion:${block.Name}"]`)
						.should('not.exist')
				);
		});

		it('should show the memory graph for the filtered type', () => {
			const memoryType = mock.MemoryTypes[0].Name;

			mock.MemoryTypes.forEach(type => {
				cy.get(`[data-test="memory-graph-${type.Name}"]`).should(
					'have.length',
					1
				);
			});

			cy.get('[data-test="memory-type-filter"]').click();

			cy.get(
				`[data-test="multiselect-option-${memoryType}"]`
			).click();

			cy.get(`[data-test="memory-graph-RAM"]`).should(
				'have.length',
				1
			);
			cy.get(`[data-test="memory-graph-Flash"]`).should(
				'have.length',
				0
			);
		});

		it('should correctly filter the core and the corresponding memory blocks', () => {
			cy.get('[data-test="core-filter"]').click();

			cy.get(`[data-test="core-name"]`).should(
				'have.length.at.least',
				2
			);

			cy.get(`[data-test="multiselect-option-${core.Name}"]`).click();

			core.Memory.forEach(block =>
				cy
					.get(`[data-test="accordion:${block.Name}"]`)
					.should('exist')
			);

			memoryBlocks
				.filter(block => !core.Memory.includes(block))
				.forEach(block =>
					cy
						.get(`[data-test="accordion:${block.Name}"]`)
						.should('not.exist')
				);

			cy.get(`[data-test="core-name"]`).should('have.length', 1);
			cy.get(`[data-test="core-name"]`).should('contain', core.Name);
		});
	});

	describe('when allocating memory', () => {
		before(() => {
			window.localStorage.setItem(
				'Cores',
				JSON.stringify(mock.Cores)
			);
			window.localStorage.setItem(
				'MemoryBlocks',
				JSON.stringify([
					...mock.Cores[0].Memory,
					...mock.Cores[1].Memory
				])
			);
			localStorage.setItem(
				'MemoryTypes',
				JSON.stringify(mock.MemoryTypes)
			);
		});
		beforeEach(() => {
			cy.viewport(1920, 1080);
		});

		it('should create the partition', () => {
			const reduxStore = configurePreloadedStore(
				mock as unknown as Soc
			);
			cy.mount(<MemoryAllocation />, reduxStore);

			// Open the sidebar
			cy.get('[data-test="create-partition-btn"]').click();
			cy.get('[data-test="partition-sidebar"]').should('be.visible');
			// Fill in the form
			cy.dataTest('partition-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Test Partition');
				});

			cy.dataTest('memory-type-dropdown').click();
			cy.dataTest('RAM').click();

			cy.dataTest('assigned-cores-multiselect')
				.get('button')
				.eq(2)
				.click();
			cy.dataTest('multiselect-option-RISC-V (RV32)')
				.should('be.visible')
				.click();

			cy.dataTest('size-stepper').type('80');

			cy.dataTest('base-block-dropdown').click();
			cy.dataTest('sysram8').click();

			cy.dataTest('create-partition-button').click();

			// User created partitions should be updated
			cy.dataTest('accordion:Test Partition').should('exist');
			// Memory blocks should be updated
			cy.get(`[data-test="accordion:sysram8"]`)
				.should('exist')
				.click()
				.dataTest('partition-accordion-Test Partition')
				.should('exist');
			// Memory graph should be updated
			cy.dataTest(
				'memory-graph-RAM-multiblock-Test Partition'
			).should('exist');
			// Partition cards should be updated
			cy.dataTest('volatile-memory-card-container').should('exist');
		});
		it('should edit the partition', () => {
			const reduxStore = configurePreloadedStore(
				mock as unknown as Soc
			);
			reduxStore.dispatch(
				createPartition({
					displayName: 'Test Partition',
					type: 'RAM',
					baseBlock: memoryBlocks[0],
					blockNames: [memoryBlocks[0].Name],
					startAddress: memoryBlocks[0].AddressStart,
					size: 1000,
					projects: [
						{
							label: mock.Cores[0].Name,
							access: 'R/W',
							coreId: mock.Cores[0].Id,
							projectId: mock.Cores[0].Id + '-proj',
							owner: true
						}
					]
				})
			);
			cy.mount(<MemoryAllocation />, reduxStore);

			cy.dataTest('partition-details-chevron').click();
			cy.dataTest('edit-partition-btn').should('be.visible').click();
			cy.get('[data-test="partition-sidebar"]').should('be.visible');

			cy.dataTest('partition-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Changed Partition');
				});
			cy.dataTest('create-partition-button').click();
			// User created partitions should be updated
			cy.dataTest('accordion:Changed Partition').should('exist');
			// Memory blocks should be updated
			cy.get(`[data-test="accordion:sysram0"]`)
				.should('exist')
				.click()
				.dataTest('partition-accordion-Changed Partition')
				.should('exist');
			// Memory graph should be updated
			cy.dataTest(
				'memory-graph-RAM-multiblock-Changed Partition'
			).should('exist');
		});
		it('should delete the partition', () => {
			const reduxStore = configurePreloadedStore(
				mock as unknown as Soc
			);
			reduxStore.dispatch(
				createPartition({
					displayName: 'Test Partition',
					type: 'RAM',
					baseBlock: memoryBlocks[0],
					blockNames: [memoryBlocks[0].Name],
					startAddress: memoryBlocks[0].AddressStart,
					size: 1000,
					projects: [
						{
							label: mock.Cores[0].Name,
							access: 'R/W',
							coreId: mock.Cores[0].Id,
							projectId: mock.Cores[0].Id + '-proj',
							owner: true
						}
					]
				})
			);
			cy.mount(<MemoryAllocation />, reduxStore);

			cy.dataTest('partition-details-chevron').click();
			cy.dataTest('delete-partition-btn')
				.should('be.visible')
				.click();
			// User created partitions should be updated
			cy.dataTest('accordion:Test Partition').should('not.exist');
			// Memory blocks should be updated
			cy.get(`[data-test="accordion:sysram0"]`)
				.should('exist')
				.click()
				.dataTest('partition-accordion-Test Partition')
				.should('not.exist');
			// Memory graph should be updated
			cy.dataTest(
				'memory-graph-RAM-multiblock-Test Partition'
			).should('not.exist');
		});
	});
});

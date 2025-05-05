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

import {
	createPartition,
	setSideBarState,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {PartitionSidebar} from './partition-sidebar';
import {
	type MemoryBlock,
	type Soc
} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {getBlockMinAlignment} from '../../../utils/memory';

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

describe('Partition Sidebar', () => {
	const reduxStore = configurePreloadedStore(mock as unknown as Soc);

	before(() => {
		window.localStorage.setItem('Cores', JSON.stringify(mock.Cores));
		window.localStorage.setItem(
			'MemoryBlocks',
			JSON.stringify([
				...mock.Cores[0].Memory,
				...mock.Cores[1].Memory
			])
		);
		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockedConfigDict)
		);
		reduxStore.dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: {
					displayName: '',
					type: '',
					baseBlock: {
						Name: '',
						Description: '',
						AddressStart: '',
						AddressEnd: '',
						Width: 0,
						MinimumAlignment: undefined,
						Access: '',
						Location: '',
						Type: '',
						TrustZone: undefined
					},
					blockNames: [],
					startAddress: '',
					size: 0,
					projects: [],
					config: undefined
				}
			})
		);
		cy.viewport(262, 688);
	});

	describe('Partition Details Section', () => {
		it('should select the type and name', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({type: '', displayName: ''})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('memory-type-dropdown').click();

			cy.dataTest('Flash').click();

			cy.dataTest('partition-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('TestPartition');
				});

			cy.dataTest('partition-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').should('have.value', 'TestPartition');
				});
		});
		it('should reset the partition details when the type is changed', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({
						type: 'Flash',
						displayName: 'Partition1',
						startAddress: '0x10300000',
						size: 8192,
						projects: [
							{
								label: 'RISC-V (RV32)',
								access: 'R',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						],
						blockNames: ['flash1']
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);
			cy.dataTest('assigned-cores-multiselect')
				.get('button')
				.should('have.text', 'RISC-V (RV32)');

			cy.dataTest('memory-type-dropdown').click();

			cy.dataTest('RAM').click();

			// Cores should be reset
			cy.dataTest('assigned-cores-multiselect')
				.get('button')
				.should('have.text', 'Select cores');
			// Address should be reset
			cy.get('input').eq(0).should('have.value', '');
			// Size should be reset
			cy.get('input').eq(1).should('have.value', '0');
		});
	});

	describe('Assigned Cores Section', () => {
		it('should select and display the core and then remove it', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('assigned-cores-multiselect').get('button').click();

			cy.dataTest('multiselect-option-RV-proj')
				.should('be.visible')
				.click();

			cy.dataTest('assigned-cores-multiselect').get('button').click();

			cy.dataTest('permission-label-RV-proj').should('be.visible');

			cy.dataTest('remove-core-RV-proj').should('be.visible').click();

			cy.dataTest('permission-label-RV-proj').should('not.exist');
		});
	});

	describe('Memory Blocks Section', () => {
		it('should not allow the user select a block option other than flash', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('base-block-dropdown').click();

			cy.dataTest('sysram0').should('not.exist');

			cy.dataTest('flash0').should('be.visible');
		});

		it('should set the start address when the user selects a base block', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('base-block-dropdown').click();

			cy.dataTest('flash0').click();

			const startingAddress = mock.Cores[0].Memory.find(
				block => block.Name === 'flash0'
			)?.AddressStart;
			const formattedStartingAddress = startingAddress?.replace(
				'0x',
				''
			);

			// Address stepper
			cy.get('input')
				.eq(0)
				.should('have.value', formattedStartingAddress);
		});

		it('should display the memory block item based on start address and size', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('base-block-dropdown').click();

			cy.dataTest('flash0').click();

			cy.dataTest('block-item-section').should('not.exist');

			// Size input
			cy.get('input').eq(1).type('16');

			cy.dataTest('block-item-section').should('exist');
		});

		it('should not display the base block when there is an issue with the start address', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({
						projects: [
							{
								label: 'RISC-V',
								access: 'R',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						],
						type: 'Flash',
						blockNames: ['flash0'],
						size: 16384,
						startAddress: '0x10200000'
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('block-item-section').should('not.exist');
		});

		it('should not display the base block when there is an issue with the size', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({
						projects: [
							{
								label: 'RISC-V',
								access: 'R',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						],
						type: 'Flash',
						blockNames: ['flash1'],
						size: 100,
						startAddress: '0x10300000'
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('block-item-section').should('not.exist');
		});
	});

	describe('Form Validation', () => {
		it('should not validate before the form is touched', () => {
			const onFormTouchedSpy = cy.spy().as('onFormTouched');

			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					partition={createMockPartition({type: ''})}
					onClose={cy.stub}
					onFormTouched={onFormTouchedSpy}
				/>,
				reduxStore
			);

			cy.dataTest('create-partition-button').click();

			cy.dataTest('memory-type-dropdown-error').should('not.exist');
			cy.get('@onFormTouched').should('have.been.called');
		});

		it('should validate the form when the form is touched', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({type: ''})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);
			cy.dataTest('memory-type-dropdown-error').should('exist');
		});
		it('should display errors when the required fields are missing', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: '',
						displayName: '',
						startAddress: ''
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('memory-type-dropdown-error').should(
				'have.text',
				'Type is required'
			);

			cy.dataTest('partition-name-error').should(
				'have.text',
				'Partition name is required'
			);

			cy.dataTest('assigned-cores-multiselect-error').should(
				'have.text',
				'Cores are required'
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Size must be greater than 0'
			);
		});
		it('should display an error when no core is an owner', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						projects: [
							{
								label: 'RISC-V',
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: false
							},
							{
								label: 'ARM',
								access: 'R/W/X',
								coreId: 'M4',
								projectId: 'M4-proj',
								owner: false
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('assigned-cores-multiselect-error').should(
				'have.text',
				'One core must be an owner'
			);
		});
		it('should display an error when the memory type has no valid memory blocks', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Unknown Memory Type'
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('memory-type-dropdown-error').should(
				'have.text',
				'No valid memory blocks for this type'
			);
			cy.dataTest('start-address-error').should(
				'have.text',
				'No valid memory blocks for this type'
			);
		});

		it('should display an error when there is no memory block that all cores have access to', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'RAM',
						size: 8,
						projects: [
							{
								label: 'RISC-V',
								access: 'R',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							},
							{
								label: 'ARM',
								access: 'R',
								coreId: 'M4',
								projectId: 'M4-proj',
								owner: false
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('base-block-dropdown-error').should(
				'have.text',
				'No valid memory blocks for the selected cores'
			);
		});

		it('should display an error when the address is outside the memory type range', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x100000'
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('start-address-error').should(
				'have.text',
				'Address is out of range for memory type'
			);
		});
		it('should display an error when the address or size is not aligned to the memory type range', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x1030000f',
						blockNames: ['flash1'],
						size: 100,
						projects: [
							{
								label: 'RISC-V',
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			const block = mock.Cores[0].Memory.find(
				block => block.Name === 'flash1'
			) as MemoryBlock;

			const minimumAlignment = getBlockMinAlignment(block);

			cy.dataTest('start-address-error').should(
				'have.text',
				`Address must be aligned to the block minimum alignment of ${minimumAlignment}`
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				`Size must be aligned to the block minimum alignment of ${minimumAlignment}`
			);
		});
		it('should display an error when the address is a block the core has no access to', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'RAM',
						startAddress: '0x20100000',
						blockNames: [''],
						size: 8,
						projects: [
							{
								label: 'ARM Cortex-M4',
								access: 'R',
								coreId: 'M4',
								projectId: 'M4-proj',
								owner: false
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('start-address-error').should(
				'have.text',
				'Core does not have access to this memory block'
			);
		});
		it('should display an error when the size is outside the memory type range', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x10000000',
						size: 4 * 1024 * 1024
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Size exceeds memory block range'
			);
		});
		it('should display an error when the partition overlaps with another partition', () => {
			reduxStore.dispatch(
				createPartition({
					...createMockPartition({
						startAddress: '0x100000f0',
						size: 10
					})
				})
			);
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x100000f5',
						size: 16384
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('start-address-error').should(
				'have.text',
				'Address overlaps with another partition'
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Size extends into existing partition'
			);
		});
		it('should display an error when the size extends into an existing partition', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x10000000',
						size: 32768
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Size extends into existing partition'
			);
			cy.dataTest('start-address-error').should('not.exist');
		});
		it('should display an error when the name is not unique', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						displayName: 'TestPartition'
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('partition-name-error').should(
				'have.text',
				'Partition name must be unique (case-insensitive)'
			);
		});
		it('should display an error when a core permission does not match the memory block permission', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x10300000',
						blockNames: ['flash1'],
						size: 8192,
						projects: [
							{
								label: 'RISC-V',
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Core permissions do not match memory block permissions'
			);
		});

		it('should display an error when the core does not have access to all memory blocks', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					partition={createMockPartition({
						type: 'Flash',
						startAddress: '0x10100000',
						blockNames: ['flash0', 'flash1'],
						size: 16384,
						projects: [
							{
								label: 'RISC-V',
								access: 'R/W/X',
								coreId: 'RV',
								projectId: 'RV-proj',
								owner: true
							}
						]
					})}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.dataTest('size-stepper-error').should(
				'have.text',
				'Core RISC-V (RV32) does not have access to all memory blocks.'
			);
		});
	});
});

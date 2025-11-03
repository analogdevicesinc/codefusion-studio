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
	type Partition,
	setSideBarState,
	updateActivePartition
} from '../../../state/slices/partitions/partitions.reducer';
import {PartitionSidebar} from './partition-sidebar';
import {type Soc} from '../../../../../common/types/soc';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32657-wlp.json')).default as unknown as Soc
);

import type {CfsConfig} from 'cfs-plugins-api';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import {configurePreloadedStore} from '../../../state/store';

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM33',
			ProjectId: 'CM33-NS',
			IsPrimary: true,
			Name: 'm33-ns',
			PluginId: '',
			Secure: false
		},
		{
			CoreNum: 1,
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM33',
			ProjectId: 'CM33-S',
			Name: 'm33-s',
			PluginId: '',
			Secure: true
		}
	]
} as unknown as CfsConfig;

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

describe('Partition Sidebar With Secure Projects', () => {
	const reduxStore = configurePreloadedStore(
		mock as unknown as Soc,
		mockedConfigDict
	);

	before(() => {
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

	describe('Assigned Cores Section', () => {
		it('should display secure/non-secure badge when information available', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.wrap(
				reduxStore.dispatch(
					updateActivePartition(
						createMockPartition({
							type: 'Flash',
							projects: [
								{
									label: 'CM33-NS',
									access: 'R/W/X',
									coreId: 'CM33',
									projectId: 'CM33-NS',
									owner: true
								},
								{
									label: 'CM33-S',
									access: 'R/W/X',
									coreId: 'CM33',
									projectId: 'CM33-S',
									owner: true
								}
							]
						})
					)
				)
			);

			cy.dataTest('permission-label-CM33-NS').within(() => {
				cy.get('vscode-badge')
					.should('exist')
					.should('have.text', 'Non-Secure');
			});
			cy.dataTest('permission-label-CM33-S').within(() => {
				cy.get('vscode-badge')
					.should('exist')
					.should('have.text', 'Secure');
			});
		});
	});
});

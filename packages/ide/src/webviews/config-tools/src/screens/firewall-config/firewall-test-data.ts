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

import type {SocFirewall} from 'cfs-types';
import type {Soc} from '../../../../common/types/soc';
import {initializeFirewall} from '../../utils/firewall';

/**
 * A firewall definition used by the firewall component tests, shaped like the
 * `Firewall` section of a SoC data model.
 */
export const FIREWALL_TEST_DATA: SocFirewall = {
	Initiators: [
		{
			Name: 'dma_dde_0',
			Description: 'DMA DDE 0',
			BaseAddress: '0x42d04000'
		},
		{
			Name: 'dma_dde_1',
			Description: 'DMA DDE 1',
			BaseAddress: '0x42d08000'
		},
		{
			Name: 'dma_dde_2',
			Description: 'DMA DDE 2',
			BaseAddress: '0x42d0c000'
		},
		{
			Name: 'dma_dde_3',
			Description: 'DMA DDE 3',
			BaseAddress: '0x42d10000'
		},
		{
			Name: 'dma_dde_4',
			Description: 'DMA DDE 4',
			BaseAddress: '0x42d14000'
		},
		{Name: 'd2d', Description: 'D2D', BaseAddress: '0x42d88000'},
		{
			Name: 'nss_hifi_dma',
			Description: 'NSS HiFi DMA',
			BaseAddress: '0x42de4000'
		},
		{
			Name: 'nss_nne',
			Description: 'NSS NNE',
			BaseAddress: '0x42de8000'
		},
		{
			Name: 'nss_hifi_core',
			Description: 'NSS HiFi Core',
			BaseAddress: '0x42dec000'
		}
	],
	ResponderGroups: [
		{
			Name: 'M55_Itcm',
			Description: 'M55 ITCM',
			Responders: [
				{
					Name: 'm55_itcm_0',
					Description: 'Access Block for M55_Itcm (Local Region: 0)',
					Id: 1,
					AddressStart: '0x20400000',
					AddressEnd: '0x20407fff'
				},
				{
					Name: 'm55_itcm_1',
					Description: 'Access Block for M55_Itcm (Local Region: 1)',
					Id: 2,
					AddressStart: '0x20408000',
					AddressEnd: '0x2040ffff'
				},
				{
					Name: 'm55_itcm_2',
					Description: 'Access Block for M55_Itcm (Local Region: 2)',
					Id: 3,
					AddressStart: '0x20410000',
					AddressEnd: '0x20417fff'
				},
				{
					Name: 'm55_itcm_3',
					Description: 'Access Block for M55_Itcm (Local Region: 3)',
					Id: 4,
					AddressStart: '0x20418000',
					AddressEnd: '0x2041ffff'
				}
			]
		},
		{
			Name: 'D2D_Dd_Mem',
			Description: 'D2D DD MEM',
			Responders: [
				{
					Name: 'd2d_dd_mem_0',
					Description:
						'Access Block for D2D_Dd_Mem (Local Region: 0)',
					Id: 590,
					Type: 'ProgrammableRegion'
				},
				{
					Name: 'd2d_dd_mem_1',
					Description:
						'Access Block for D2D_Dd_Mem (Local Region: 1)',
					Id: 591,
					Type: 'ProgrammableRegion'
				},
				{
					Name: 'd2d_dd_mem_2',
					Description:
						'Access Block for D2D_Dd_Mem (Local Region: 2)',
					Id: 592,
					Type: 'ProgrammableRegion'
				},
				{
					Name: 'd2d_dd_mem_3',
					Description:
						'Access Block for D2D_Dd_Mem (Local Region: 3)',
					Id: 593,
					Type: 'ProgrammableRegion'
				}
			]
		}
	]
};

/**
 * Loads the firewall test data so the firewall catalog getters return it
 * before a store is created.
 */
export function initializeFirewallTestData() {
	initializeFirewall(FIREWALL_TEST_DATA);
}

/**
 * Attaches the firewall test data to a SoC data model, so a store built from
 * it initializes the firewall catalog.
 * @param soc The SoC data model to extend.
 * @returns The SoC data model with a `Firewall` section.
 */
export function withFirewallTestData(soc: Soc): Soc {
	return {...soc, Firewall: FIREWALL_TEST_DATA};
}

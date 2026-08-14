/**
 *
 * Copyright (c) 2024 - 2026 Analog Devices, Inc.
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

import SideListContainer from './side-list-container';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import type {CfsConfig} from 'cfs-types';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockSingleCore = (await import('@socs/max32657-wlp.json'))
	.default as unknown as Soc;

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
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: 'com.analog.project.msdk.plugin',
			PluginVersion: '1.1.0',
			ProjectId: 'CM4-proj',
			CoreId: 'CM4'
		},
		{
			CoreNum: 1,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: false,
			Name: 'RISC-V (RV32)',
			PluginId: 'com.analog.project.msdk.plugin',
			PluginVersion: '1.1.0',
			ProjectId: 'RV-proj',
			CoreId: 'RV'
		}
	]
} as unknown as CfsConfig;

const mockedSingleCoreConfigDict = {
	SchemaVersion: '2.1.0',
	DataModelVersion: '1.0.0',
	Soc: 'MAX32657',
	Package: 'WLP',
	BoardName: 'EvKit_V1',
	Timestamp: '2025-08-13T12:18:05.080Z',
	Pins: [],
	ClockNodes: [],
	Projects: [
		{
			CoreNum: 0,
			CoreId: 'CM33',
			ProjectId: 'CM33-NS',
			PluginId: 'com.analog.project.zephyr41.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr-4.1',
			ExternallyManaged: false,
			Secure: false,
			Family: 'Cortex-M',
			Partitions: [
				{
					Name: 'TestPartition',
					StartAddress: '0x01000000',
					Size: 1048576,
					IsOwner: true,
					Access: 'R',
					Config: {}
				}
			],
			Peripherals: [
				{
					Name: 'CM4 SysTick',
					Signals: [],
					Config: {
						ENABLE: 'FALSE'
					}
				}
			]
		}
	]
} as unknown as CfsConfig;

describe('Peripheral config side container', () => {
	it('should render peripheral groups in alphabetical order', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.get('[data-test^="accordion:"]').then($items => {
			const titles = [...$items].map(item => {
				const titleElement = item.querySelector('.styles-title');
				const titleText = titleElement?.textContent?.trim() ?? '';

				return titleText;
			});

			const sortedTitles = [...titles].sort((a, b) =>
				a.localeCompare(b)
			);
			expect(titles).to.deep.equal(sortedTitles);
		});
	});

	it('should filter allocated peripherals', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		// @NOTE Make sure {allocatedPeripheralName} is part of mocked peripherals!
		const allocatedPeripheralName = 'ADC';

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest(`filter-control:all`).click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.dataTest(
			`assignable-item:chevron:${allocatedPeripheralName}`
		).should('not.exist');
	});

	it('should allocate a signal to a project', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'GPIO0';
		const allocatedSignalName = 'P0.1';

		cy.dataTest(`accordion:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedSignalName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.get(
			`[data-test="peripheral-block-${allocatedPeripheralName}"]`
		).should('exist');

		cy.get(`[data-test="core-CM4-proj"]`).should('exist');
	});

	it('should allocate a peripheral with no signal to a project', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'CTB';

		cy.dataTest(
			`assignable-item:container:${allocatedPeripheralName}`
		)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.get(`[data-test="core-CM4-proj"]`).should('exist');
	});

	it('should auto-allocate a signal with a single core option', () => {
		const reduxStore = configurePreloadedStore(
			mockSingleCore,
			mockedSingleCoreConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'GPIO0';
		const allocatedSignalName = 'P0.1';

		cy.dataTest(`accordion:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedSignalName}`)
			.should('exist')
			.click();

		cy.get(
			`[data-test="peripheral-block-${allocatedPeripheralName}"]`
		).should('exist');

		cy.get(`[data-test="core-CM33-NS"]`).should('exist');
	});

	it('should auto-allocate a peripheral with a single project option', () => {
		const reduxStore = configurePreloadedStore(
			mockSingleCore,
			mockedSingleCoreConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'ICC0';

		cy.dataTest(
			`assignable-item:container:${allocatedPeripheralName}`
		)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`core-CM33-NS`).should('exist');
	});

	it('should detect a conflict when the auto-assigned pin for P0.1 is already occupied by SPIXF SDIO0', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		// Pre-assign SPIXF SDIO0 to J2 (same physical pin as P0.1) via pinmux
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'J2',
				Peripheral: 'SPIXF',
				Name: 'SDIO0'
			})
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest('accordion:GPIO0').should('exist').click();
		cy.dataTest('assignable-item:chevron:P0.1')
			.should('exist')
			.click();
		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		// Wait for the assignment to complete
		cy.get('[data-test="peripheral-block-GPIO0"]').should('exist');

		// P0.1 should have been auto-assigned to J2, creating a conflict with SPIXF SDIO0
		cy.then(() => {
			const j2Signals =
				reduxStore.getState().pinsReducer.pins.J2?.appliedSignals ??
				[];
			expect(
				j2Signals.length,
				'J2 should have multiple signals (conflict)'
			).to.be.greaterThan(1);
			expect(
				j2Signals.some(
					(s: any) => s.Peripheral === 'SPIXF' && s.Name === 'SDIO0'
				),
				'SPIXF SDIO0 should remain on J2'
			).to.equal(true);
			expect(
				j2Signals.some(
					(s: any) => s.Peripheral === 'GPIO0' && s.Name === 'P0.1'
				),
				'GPIO0 P0.1 should have been auto-assigned to J2'
			).to.equal(true);
		});
	});

	it('should auto-assign UART0 TX and RX pins but not CTS or RTS (not required)', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest('assignable-item:container:UART0')
			.should('exist')
			.click();
		cy.dataTest('assignable-item:chevron:UART0')
			.should('exist')
			.click();
		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		// Wait for the peripheral assignment to complete
		cy.get('[data-test="peripheral-block-UART0"]').should('exist');

		cy.then(() => {
			const allSignals = Object.values(
				reduxStore.getState().pinsReducer.pins
			).flatMap((pin: any) => pin.appliedSignals as any[]);

			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART0' && s.Name === 'TX'
				),
				'UART0 TX should be auto-assigned to a pin'
			).to.equal(true);

			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART0' && s.Name === 'RX'
				),
				'UART0 RX should be auto-assigned to a pin'
			).to.equal(true);

			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART0' && s.Name === 'CTS'
				),
				'UART0 CTS should NOT be auto-assigned (not unconditionally required)'
			).to.equal(false);

			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART0' && s.Name === 'RTS'
				),
				'UART0 RTS should NOT be auto-assigned (not unconditionally required)'
			).to.equal(false);
		});
	});

	it('should not auto-assign any UART2 pins because TX and RX have multiple pin options', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest('assignable-item:container:UART2')
			.should('exist')
			.click();
		cy.dataTest('assignable-item:chevron:UART2')
			.should('exist')
			.click();
		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		// Wait for the peripheral assignment to complete
		cy.get('[data-test="peripheral-block-UART2"]').should('exist');

		cy.then(() => {
			const allSignals = Object.values(
				reduxStore.getState().pinsReducer.pins
			).flatMap((pin: any) => pin.appliedSignals as any[]);

			for (const signalName of ['TX', 'RX', 'CTS', 'RTS']) {
				expect(
					allSignals.some(
						(s: any) =>
							s.Peripheral === 'UART2' && s.Name === signalName
					),
					`UART2 ${signalName} should NOT be auto-assigned`
				).to.equal(false);
			}
		});
	});

	it('should auto-assign UART1 TX and RX pins but detect conflicts with pre-assigned GPIO2 signals', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		// Pre-assign GPIO2 P2.14 and P2.16 to their respective pins via pinmux
		// UART1 RX maps to D6 (same pin as P2.14) and TX maps to E7 (same pin as P2.16)
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'D6',
				Peripheral: 'GPIO2',
				Name: 'P2.14'
			})
		);
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'E7',
				Peripheral: 'GPIO2',
				Name: 'P2.16'
			})
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest('assignable-item:container:UART1')
			.should('exist')
			.click();
		cy.dataTest('assignable-item:chevron:UART1')
			.should('exist')
			.click();
		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		// Wait for the peripheral assignment to complete
		cy.get('[data-test="peripheral-block-UART1"]').should('exist');

		cy.then(() => {
			const {pins} = reduxStore.getState().pinsReducer;
			const d6Signals = pins.D6?.appliedSignals ?? [];
			const e7Signals = pins.E7?.appliedSignals ?? [];
			const allSignals = Object.values(pins).flatMap(
				(pin: any) => pin.appliedSignals as any[]
			);

			expect(
				d6Signals.length,
				'D6 should have multiple signals (UART1 RX + GPIO2 P2.14 conflict)'
			).to.be.greaterThan(1);
			expect(
				d6Signals.some(
					(s: any) => s.Peripheral === 'UART1' && s.Name === 'RX'
				),
				'UART1 RX should be auto-assigned to D6'
			).to.equal(true);

			expect(
				e7Signals.length,
				'E7 should have multiple signals (UART1 TX + GPIO2 P2.16 conflict)'
			).to.be.greaterThan(1);
			expect(
				e7Signals.some(
					(s: any) => s.Peripheral === 'UART1' && s.Name === 'TX'
				),
				'UART1 TX should be auto-assigned to E7'
			).to.equal(true);

			// CTS and RTS should not be auto-assigned
			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART1' && s.Name === 'CTS'
				),
				'UART1 CTS should NOT be auto-assigned'
			).to.equal(false);
			expect(
				allSignals.some(
					(s: any) => s.Peripheral === 'UART1' && s.Name === 'RTS'
				),
				'UART1 RTS should NOT be auto-assigned'
			).to.equal(false);
		});
	});
});

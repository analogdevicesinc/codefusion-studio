/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import type {ControlCfg, Soc} from '@common/types/soc';
import PeripheralConfigForm from './PeripheralConfigForm';
import {configurePreloadedStore} from '../../../state/store';
import {
	setActivePeripheral,
	setPeripheralAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';

const max32690 = (await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const controlsMock: Record<string, ControlCfg[]> = {
	UART0: [
		{
			Id: 'PARITY',
			Description: 'Parity',
			EnumValues: [
				{
					Id: 'EVEN',
					Description: 'Even Parity',
					Value: 0
				},
				{
					Id: 'ODD',
					Description: 'Odd Parity',
					Value: 1
				},
				{
					Id: 'DISABLED',
					Description: 'Disabled',
					Value: 20
				}
			],
			Type: 'enum'
		},
		{
			Id: 'CHAR_SIZE',
			Description: 'UART Character Size',
			EnumValues: [
				{
					Id: '5',
					Description: '5 Bits',
					Value: 0
				},
				{
					Id: '6',
					Description: '6 Bits',
					Value: 1
				},
				{
					Id: '7',
					Description: '7 Bits',
					Value: 2
				},
				{
					Id: '8',
					Description: '8 Bits',
					Value: 3
				}
			],
			Type: 'enum'
		},
		{
			Id: 'STOP_BITS',
			Description: 'Number of Stop Bits',
			EnumValues: [
				{
					Id: '1',
					Description: '1 Stop Bit',
					Value: 0
				},
				{
					Id: '1.5/2',
					Description: '1.5 Stop Bits or 2 Stop Bits',
					Value: 1
				}
			],
			Type: 'enum'
		},
		{
			Id: 'HW_FLOW_CTRL',
			Description: 'Hardware Flow Control RTS Mode',
			EnumValues: [
				{
					Id: 'DEASSERT_ON_FULL',
					Description: 'Deassert On Full',
					Value: 0
				},
				{
					Id: 'DEASSERT_ON_THRESHOLD',
					Description: 'Deassert On Threshold',
					Value: 1
				},
				{
					Id: 'DISABLED',
					Description: 'Disabled',
					Value: 20
				}
			],
			Type: 'enum'
		},
		{
			Id: 'CHOSEN',
			Description: 'Chosen',
			Type: 'text',
			PluginOption: true
		},
		{
			Id: 'FREQ',
			Description: 'Frequency',
			Hint: '15000000',
			Type: 'integer',
			PluginOption: true
		},
		{
			Id: 'BAUD',
			Description: 'Baud Rate',
			Hint: '115200',
			Type: 'integer',
			PluginOption: true
		}
	],
	SPI0: [
		{
			Id: 'MODE',
			Description: 'Controller or Target Mode',
			EnumValues: [
				{
					Id: 'TARGET',
					Description: 'Target Mode',
					Value: 0
				},
				{
					Id: 'CONTROLLER',
					Description: 'Controller Mode',
					Value: 1
				}
			],
			Type: 'enum'
		},
		{
			Id: 'GC_ADDR_EN',
			Description: 'General Call Address',
			EnumValues: [
				{
					Id: 'IGNORE',
					Description: 'Ignore',
					Value: 0
				},
				{
					Id: 'ACK',
					Description: 'Acknowledge',
					Value: 1
				}
			],
			Type: 'enum',
			Condition: ''
		},
		{
			Id: 'CLKSTR',
			Description: 'Target Clock Stretching',
			Type: 'boolean'
		},
		{
			Id: 'PRELOAD_MODE',
			Description: 'Transmit FIFO Preaload Mode',
			EnumValues: [
				{
					Id: 'NORMAL',
					Description: 'Normal operation',
					Value: 0
				},
				{
					Id: 'PRELOAD',
					Description: 'Transmit FIFO Preload Mode',
					Value: 1
				}
			],
			Type: 'enum',
			Condition: ''
		},
		{
			Id: 'SCL_TIMEOUT',
			Description: 'Bus Error SCL Timeout Period',
			MinimumValue: 0,
			MaximumValue: 65535,
			Type: 'integer'
		},
		{
			Id: 'TRANSMIT_DMA_ENABLE',
			Description: 'Transmit DMA Enable',
			Type: 'boolean'
		},
		{
			Id: 'RECEIVE_DMA_ENABLE',
			Description: 'Receive DMA Enable',
			Type: 'boolean'
		},
		{
			Id: 'TARGET0_ADDR',
			Description: 'Target Address 0',
			MinimumValue: 0,
			MaximumValue: 1023,
			Type: 'integer',
			Condition: ''
		},
		{
			Id: 'FREQ',
			Description: 'Frequency',
			Hint: '100000',
			Type: 'integer',
			PluginOption: true
		}
	]
};

describe('Peripheral Config Form', () => {
	beforeEach(() => {
		localStorage.setItem(
			'Controls',
			JSON.stringify(max32690.Controls)
		);

		localStorage.setItem(
			'Peripherals',
			JSON.stringify(max32690.Peripherals)
		);
	});

	const mockFormattedData = {
		BAUD: '115200',
		CHAR_SIZE: '5',
		CHOSEN: '',
		FREQ: '15000000',
		HW_FLOW_CTRL: 'DISABLED',
		PARITY: 'DISABLED',
		STOP_BITS: '1'
	};

	const mockFormattedControls = [
		{
			id: 'PARITY',
			name: 'Parity',
			type: 'enum',
			description: 'Parity',
			default: '',
			enum: [
				{
					label: 'Even Parity',
					value: 'EVEN'
				},
				{
					label: 'Odd Parity',
					value: 'ODD'
				},
				{
					label: 'Disabled',
					value: 'DISABLED'
				}
			],
			required: true
		}
	];

	const mockReset = {
		PARITY: 'DISABLED',
		CHAR_SIZE: '5',
		STOP_BITS: '1',
		HW_FLOW_CTRL: 'DISABLED',
		CHOSEN: '',
		FREQ: '15000000',
		BAUD: '115200'
	};

	const mockPeripheralOptions = [
		{
			id: 'PARITY',
			name: 'Parity',
			type: 'enum',
			description: 'Parity',
			default: '',
			enum: [
				{
					label: 'Even Parity',
					value: 'EVEN'
				},
				{
					label: 'Odd Parity',
					value: 'ODD'
				},
				{
					label: 'Disabled',
					value: 'DISABLED'
				}
			],
			required: true
		},
		{
			id: 'CHAR_SIZE',
			name: 'UART Character Size',
			type: 'enum',
			description: 'UART Character Size',
			default: '',
			enum: [
				{
					label: '5 Bits',
					value: '5'
				},
				{
					label: '6 Bits',
					value: '6'
				},
				{
					label: '7 Bits',
					value: '7'
				},
				{
					label: '8 Bits',
					value: '8'
				}
			],
			required: true
		},
		{
			id: 'STOP_BITS',
			name: 'Number of Stop Bits',
			type: 'enum',
			description: 'Number of Stop Bits',
			default: '',
			enum: [
				{
					label: '1 Stop Bit',
					value: '1'
				},
				{
					label: '1.5 Stop Bits or 2 Stop Bits',
					value: '1.5/2'
				}
			],
			required: true
		},
		{
			id: 'HW_FLOW_CTRL',
			name: 'Hardware Flow Control RTS Mode',
			type: 'enum',
			description: 'Hardware Flow Control RTS Mode',
			default: '',
			enum: [
				{
					label: 'Deassert On Full',
					value: 'DEASSERT_ON_FULL'
				},
				{
					label: 'Deassert On Threshold',
					value: 'DEASSERT_ON_THRESHOLD'
				},
				{
					label: 'Disabled',
					value: 'DISABLED'
				}
			],
			required: true
		}
	];

	const mockPluginOptions = [
		{
			id: 'FREQ',
			name: 'Frequency',
			type: 'integer',
			description: 'Frequency',
			pluginOption: true,
			default: '15000000',
			required: true
		}
	];

	it('Renders a form when the loaded SoC provides valid peripheral configuration', () => {
		const reduxStore = configurePreloadedStore(
			max32690 as unknown as Soc
		);

		reduxStore.dispatch(
			setPeripheralAssignment({
				peripheral: 'UART0',
				projectId: 'CM4',
				config: {
					PARITY: 'DISABLED',
					CHAR_SIZE: '5',
					STOP_BITS: '1',
					HW_FLOW_CTRL: 'DISABLED',
					CHOSEN: '',
					BAUD: '115200'
				}
			})
		);

		cy.mount(
			<PeripheralConfigForm
				activePeripheral='UART0'
				formattedControls={mockFormattedControls}
				formattedData={mockFormattedData}
				peripheralControls={[]}
				resetValues={mockReset}
				peripheralOptions={mockPeripheralOptions}
				pluginOptions={mockPluginOptions}
			/>,
			reduxStore
		);

		// @TODO: The initial values of each control should be updated once we are able to compute the reset values based on plugin config.
		cy.dataTest('peripheral-config:form:control-PARITY')
			.should('exist')
			.invoke('attr', 'current-value')
			.should('eq', 'DISABLED');

		cy.dataTest('peripheral-config:form:control-CHAR_SIZE')
			.should('exist')
			.invoke('attr', 'current-value')
			.should('eq', '5');

		cy.dataTest('peripheral-config:form:control-STOP_BITS')
			.should('exist')
			.invoke('attr', 'current-value')
			.should('eq', '1');
	});

	it('Shows "no settings" message for peripherals without configuration', () => {
		const reduxStore = configurePreloadedStore(
			max32690 as unknown as Soc
		);

		reduxStore.dispatch(setActivePeripheral('SysTick'));

		cy.mount(
			<PeripheralConfigForm
				activePeripheral='SysTick'
				formattedControls={mockFormattedControls}
				formattedData={mockFormattedData}
				peripheralControls={controlsMock.SPI0}
				resetValues={mockReset}
				peripheralOptions={[]}
				pluginOptions={[]}
			/>,
			reduxStore
		);

		cy.dataTest('peripheral-config:form:no-settings').should('exist');
	});

	it('Evaluate conditions to show/hide controls', () => {
		// @TODO: to be completed once we have the conditions provided in the data models of develop/1.1.0
	});

	it('Should display error message if input control has invalid value ', () => {
		const reduxStore = configurePreloadedStore(
			max32690 as unknown as Soc
		);

		reduxStore.dispatch(
			setPeripheralAssignment({
				peripheral: 'SPI0',
				projectId: 'RV',
				config: {
					RECEIVE_FIFO_THRESHOLD: '1000000',
					FREQ: '15000000',
					ENABLE: 'true'
				}
			})
		);

		cy.mount(
			<PeripheralConfigForm
				activePeripheral='SPI0'
				formattedControls={[
					{
						id: 'MODE',
						name: 'Controller or Target Mode *',
						type: 'enum',
						description: 'Controller or Target Mode',
						default: '',
						enum: [
							{
								label: 'Target Mode',
								value: 'TARGET'
							},
							{
								label: 'Controller Mode',
								value: 'CONTROLLER'
							}
						],
						required: true
					},
					{
						id: 'GC_ADDR_EN',
						name: 'General Call Address',
						type: 'enum',
						description: 'General Call Address',
						default: '',
						enum: [
							{
								label: 'Ignore',
								value: 'IGNORE'
							},
							{
								label: 'Acknowledge',
								value: 'ACK'
							}
						],
						required: true
					},
					{
						id: 'CLKSTR',
						name: 'Target Clock Stretching',
						type: 'boolean',
						description: 'Target Clock Stretching',
						default: '',
						required: true
					},
					{
						id: 'PRELOAD_MODE',
						name: 'Transmit FIFO Preaload Mode *',
						type: 'enum',
						description: 'Transmit FIFO Preaload Mode',
						default: '',
						enum: [
							{
								label: 'Normal operation',
								value: 'NORMAL'
							},
							{
								label: 'Transmit FIFO Preload Mode',
								value: 'PRELOAD'
							}
						],
						required: true
					},
					{
						id: 'SCL_TIMEOUT',
						name: 'Bus Error SCL Timeout Period',
						type: 'integer',
						description: 'Bus Error SCL Timeout Period',
						required: true
					},
					{
						id: 'TRANSMIT_DMA_ENABLE',
						name: 'Transmit DMA Enable',
						type: 'boolean',
						description: 'Transmit DMA Enable',
						default: '',
						required: true
					},
					{
						id: 'RECEIVE_DMA_ENABLE',
						name: 'Receive DMA Enable',
						type: 'boolean',
						description: 'Receive DMA Enable',
						default: '',
						required: true
					},
					{
						id: 'TARGET0_ADDR',
						name: 'Target Address 0 *',
						type: 'integer',
						description: 'Target Address 0',
						required: true
					},
					{
						id: 'FREQ',
						name: 'Frequency',
						type: 'integer',
						description: 'Frequency',
						pluginOption: true,
						default: '100000',
						required: true
					}
				]}
				formattedData={{
					MODE: 'TARGET',
					GC_ADDR_EN: 'IGNORE',
					CLKSTR: true,
					PRELOAD_MODE: 'PRELOAD',
					SCL_TIMEOUT: '0',
					TRANSMIT_DMA_ENABLE: false,
					RECEIVE_DMA_ENABLE: false,
					TARGET0_ADDR: '10000000',
					FREQ: '100000'
				}}
				peripheralControls={controlsMock.SPI0}
				resetValues={mockReset}
				peripheralOptions={[
					{
						id: 'MODE',
						name: 'Controller or Target Mode *',
						type: 'enum',
						description: 'Controller or Target Mode',
						default: '',
						enum: [
							{
								label: 'Target Mode',
								value: 'TARGET'
							},
							{
								label: 'Controller Mode',
								value: 'CONTROLLER'
							}
						],
						required: true
					},
					{
						id: 'GC_ADDR_EN',
						name: 'General Call Address',
						type: 'enum',
						description: 'General Call Address',
						default: '',
						enum: [
							{
								label: 'Ignore',
								value: 'IGNORE'
							},
							{
								label: 'Acknowledge',
								value: 'ACK'
							}
						],
						required: true
					},
					{
						id: 'CLKSTR',
						name: 'Target Clock Stretching',
						type: 'boolean',
						description: 'Target Clock Stretching',
						default: '',
						required: true
					},
					{
						id: 'PRELOAD_MODE',
						name: 'Transmit FIFO Preaload Mode *',
						type: 'enum',
						description: 'Transmit FIFO Preaload Mode',
						default: '',
						enum: [
							{
								label: 'Normal operation',
								value: 'NORMAL'
							},
							{
								label: 'Transmit FIFO Preload Mode',
								value: 'PRELOAD'
							}
						],
						required: true
					},
					{
						id: 'SCL_TIMEOUT',
						name: 'Bus Error SCL Timeout Period',
						type: 'integer',
						description: 'Bus Error SCL Timeout Period',
						required: true
					},
					{
						id: 'TRANSMIT_DMA_ENABLE',
						name: 'Transmit DMA Enable',
						type: 'boolean',
						description: 'Transmit DMA Enable',
						default: '',
						required: true
					},
					{
						id: 'RECEIVE_DMA_ENABLE',
						name: 'Receive DMA Enable',
						type: 'boolean',
						description: 'Receive DMA Enable',
						default: '',
						required: true
					},
					{
						id: 'TARGET0_ADDR',
						name: 'Target Address 0 *',
						type: 'integer',
						description: 'Target Address 0',
						required: true
					}
				]}
				pluginOptions={[
					{
						id: 'FREQ',
						name: 'Frequency',
						type: 'integer',
						description: 'Frequency',
						pluginOption: true,
						default: '100000',
						required: true
					}
				]}
			/>,
			reduxStore
		);

		cy.dataTest(
			'peripheral-config:form:control-TARGET0_ADDR-control-input'
		).should('exist');

		cy.dataTest(
			'peripheral-config:form:control-TARGET0_ADDR-control-input'
		)
			.shadow()
			.find('input')
			.type('1000');

		cy.wait(500);

		cy.dataTest(
			'peripheral-config:form:control-TARGET0_ADDR-error'
		).should('exist');
	});
});

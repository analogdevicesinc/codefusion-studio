import {type ConfiguredProject} from '../../../common/api';
import type {Soc} from '../../../common/types/soc';
import {type PeripheralConfig} from '../types/peripherals';
import {formatPeripheralAllocations} from './json-formatter';
import {sysPlannerDataInit} from './sys-planner-data-init';

const mock = (await import('@socs/max32690-tqfn.json').then(
	module => module.default
)) as Soc;

describe('Json formatter', () => {
	before(() => {
		mock.Peripherals = [
			{
				Name: 'GPIO0',
				Description: 'GPIO Port 0',
				Cores: ['CM4', 'RV'],
				Signals: [],
				ClockNode: ''
			},
			{
				Name: 'ADC',
				Description: 'Analog Digital Converter',
				Cores: ['CM4', 'RV'],
				Signals: [],
				ClockNode: ''
			},
			{
				Name: 'I2C0',
				Description: 'Inter-Integrated Circuit 0',
				Cores: ['CM4', 'RV'],
				Signals: [],
				ClockNode: ''
			}
		];
		mock.Controls = {
			I2C0: [
				{
					Id: 'MODE',
					Description: 'Controller or Target Mode',
					Type: 'enum',
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
						},
						{
							Id: 'DISABLED',
							Description: 'Disabled',
							Value: 2
						}
						],
					Hint: 'TARGET'
				},
				{
					Id: 'TARGET0_ADDR',
					Description: 'Target Address 0',
					Type: 'integer',
					MinimumValue: '0x0',
					MaximumValue: '0x3ff',
					NumericBase: 'Hexadecimal'
				},
				{
					Id: 'CLK_LO',
					Description: 'Clock Low',
					Type: 'integer',
					NumericBase: 'Decimal'
				}
			]
		}
		sysPlannerDataInit(mock);
	});

	it('formatPeripheralAllocations should correctly format data', () => {
		const peripheralName = 'ADC';
		const peripheralDescription = 'Some description';
		const signalName = 'AIN0';
		const gpio0SignalName = 'P0.7';
		const signalDescription = 'Signal description';
		const coreId = 'CM4';
		const projectId = 'CM4-proj';
		const config = {CFG: 'CFG_VAL'};
		const sigConfig = {S_CFG: 'S_CFG_VAL'};

		const projects: ConfiguredProject[] = [
			{
				CoreId: coreId,
				ProjectId: projectId,
				PluginId: '',
				PluginVersion: '',
				FirmwarePlatform: '',
				ExternallyManaged: false,
				PlatformConfig: {},
				Partitions: [],
				Peripherals: [
					{
						Name: peripheralName,
						Description: peripheralDescription,
						Signals: [
							{
								Name: signalName,
								Config: sigConfig
							}
						],
						Config: config
					},
					{
						Name: 'GPIO',
						Signals: [
							{
								Name: gpio0SignalName,
								Description: signalDescription,
								Config: {}
							}
						],
						Config: {}
					}
				]
			}
		];

		const expectedResult: Record<string, PeripheralConfig> = {
			ADC: {
				name: peripheralName,
				description: peripheralDescription,
				projectId,
				signals: {
					AIN0: {
						name: signalName,
						projectId,
						config: sigConfig
					}
				},
				config
			},
			GPIO: {
				name: 'GPIO',
				signals: {
					[gpio0SignalName]: {
						name: gpio0SignalName,
						description: signalDescription,
						projectId,
						config: {}
					}
				},
				config: {}
			}
		};

		const result = formatPeripheralAllocations(projects, mock);

		cy.log('result', JSON.stringify(result));

		expect(result).to.deep.equal(expectedResult);
	});

	it('formatPeripheralAllocations should handle numeric base formatting correctly', () => {
		const peripheralName = 'I2C0';
		const peripheralDescription = 'Inter-Integrated Circuit 0';
		const coreId = 'CM4';
		const projectId = 'CM4-proj';

		// Config with hexadecimal and decimal values
		const config = {
			MODE: 'TARGET',
			TARGET0_ADDR: '0x000000FF', // Should be formatted as 0x000000FF
			CLK_LO: '100'       // Should remain as "100"
		};

		const projects: ConfiguredProject[] = [
			{
				CoreId: coreId,
				ProjectId: projectId,
				PluginId: '',
				PluginVersion: '',
				FirmwarePlatform: '',
				ExternallyManaged: false,
				PlatformConfig: {},
				Partitions: [],
				Peripherals: [
					{
						Name: peripheralName,
						Description: peripheralDescription,
						Signals: [],
						Config: config
					}
				]
			}
		];

		const result = formatPeripheralAllocations(projects, mock);

		// Check that the peripheral was processed
		expect(result).to.have.property(peripheralName);

		const i2c0Peripheral = result[peripheralName];

		// Check that configFormat was created with numeric base mapping
		(expect(i2c0Peripheral.configFormat?.numericBase)).to.deep.equal({
			TARGET0_ADDR: 'Hexadecimal',
			CLK_LO: 'Decimal'
		});

		// Check that config values are formatted correctly
		expect(i2c0Peripheral.config).to.deep.equal({
			MODE: 'TARGET',
			TARGET0_ADDR: '0x000000FF', // Hexadecimal formatting applied
			CLK_LO: '100'               // Decimal value unchanged
		});
	});
});

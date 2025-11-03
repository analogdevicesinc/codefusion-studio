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
				Signals: []
			},
			{
				Name: 'ADC',
				Description: 'Analog Digital Converter',
				Cores: ['CM4', 'RV'],
				Signals: []
			}
		];

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
});

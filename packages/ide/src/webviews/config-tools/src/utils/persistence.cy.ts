import {type ConfiguredProject} from '../../../common/api';
import {type PinDictionary} from '../../../common/types/soc';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {type PeripheralConfig} from '../types/peripherals';
import {formatProjectPersistencePayload} from './persistence';

describe('Persistance', () => {
	beforeEach(() => {
		localStorage.setItem(
			'configDict',
			JSON.stringify({
				Soc: 'Cypress',
				BoardName: 'Cypress',
				Package: 'Cypress',
				projects: [
					{
						CoreId: 'CM4',
						ProjectId: 'CM4-proj',
						PluginId: '',
						PluginVersion: '',
						ExternallyManaged: false,
						FirmwarePlatform: '',
						PlatformConfig: {
							test: 'test'
						},
						Partitions: [],
						Peripherals: []
					}
				]
			})
		);
	});

	it('formatCorePersistencePayload should correctly format data', () => {
		const peripheralName = 'ADC';
		const peripheralDescription = 'Some description';
		const gpioSignalName = 'P0.1';
		const signalName = 'AIN0';
		const signalDescription = 'GPIO signal description';
		const coreId = 'CM4';
		const projectId = 'CM4-proj';
		const config = {CFG: 'CFG_VAL'};
		const sigConfig = {S_CFG: 'S_CFG_VAL'};

		const partitionName = 'TEST_PART';
		const partitionType = 'FLASH';
		const partitionStartAddr = '1000';
		const partitionStartAddrFormatted = '0x00001000';
		const partitionSize = 100;
		const partitionPluginConfig = {P_P_CFG: 'P_P_CFG_VAL'};
		const partitionAccess = 'R';

		const partitions: Partition[] = [
			{
				displayName: partitionName,
				type: partitionType,
				baseBlock: {
					Name: '',
					Description: '',
					AddressStart: '',
					AddressEnd: '',
					Width: 0,
					Access: '',
					Location: '',
					Type: ''
				},
				blockNames: [],
				startAddress: partitionStartAddr,
				size: partitionSize,
				projects: [
					{
						coreId,
						projectId,
						label: '',
						access: partitionAccess,
						owner: false
					}
				],
				config: partitionPluginConfig
			}
		];
		const peripheralAssigments: Record<string, PeripheralConfig> = {
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
				config: {},
				signals: {
					gpioSignalName: {
						name: gpioSignalName,
						description: signalDescription,
						projectId,
						config: {}
					}
				}
			}
		};

		const expectedResult: Array<Partial<ConfiguredProject>> = [
			{
				FirmwarePlatform: '',
				CoreId: coreId,
				PluginId: '',
				PluginVersion: '',
				ExternallyManaged: false,
				PlatformConfig: {
					test: 'test'
				},
				Partitions: [
					{
						Name: partitionName,
						StartAddress: partitionStartAddrFormatted,
						Size: partitionSize,
						IsOwner: false,
						Access: partitionAccess,
						Config: partitionPluginConfig
					}
				],
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
								Name: gpioSignalName,
								Description: signalDescription,
								Config: {}
							}
						],
						Config: {}
					}
				]
			}
		];

		const pins: PinDictionary = {
			pin1: {
				pinId: 'pin1',
				isFocused: false,
				appliedSignals: [
					{
						Pin: 'pin1',
						Peripheral: peripheralName,
						Name: signalName,
						PinCfg: sigConfig
					}
				]
			}
		};

		const result = formatProjectPersistencePayload(
			partitions,
			peripheralAssigments,
			pins
		);

		expect(result[0].Peripherals).to.deep.equal(
			expectedResult[0].Peripherals
		);
	});
});

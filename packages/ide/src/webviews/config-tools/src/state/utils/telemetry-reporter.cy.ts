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
import {setupMessengerMock} from '@common/test-utils/messenger-mock';
import type {RootState} from '../store';
import {
	CONFIG_TOOLS_TELEMETRY_ACTIONS,
	reportPersistedActionTelemetry
} from './telemetry-reporter';
import {logTelemetryRequest} from '@constants/messages/telemetry-messages';
import {initializeSruData} from '../../utils/sru';
import {initializeSruDefaultConnection} from '../../test-utils/sru-test-utils';

// Minimal RootState fixture. Only the reducer slices actually read by
// telemetry-reporter.ts (for removal/deletion lookups against the
// pre-action state) are populated.
const originalState = {
	peripheralsReducer: {
		assignments: {
			UART0: {projectId: 'CM4-proj'}
		}
	},
	partitionsReducer: {
		partitions: [
			{
				startAddress: '0x10000000',
				type: 'FLASH',
				size: 100,
				projects: [{projectId: 'CM4-proj'}]
			}
		]
	},
	gasketsReducer: {
		Streams: [
			{
				Uuid: '83ae5f72-8c7d-49d2-b818-10977323a73f',
				Source: {
					Gasket: 'BSS'
				},
				Destinations: [
					{
						Gasket: 'DSS'
					},
					{
						Gasket: 'GSS'
					}
				]
			}
		]
	},
	sruReducer: {
		editableConnections: [
			{
				input: {
					Name: 'SRC0_CLK_IP_I',
					PeripheralSubGroup: 'SRC 0'
				},
				peripheralName: 'ASRC0'
			}
		]
	}
} as unknown as RootState;

export type SentMessage = {
	id: string;
	method: string;
	params: {action: string; metadata?: Record<string, unknown>};
};

let sentMessages: SentMessage[];

function getSentMessages(): Cypress.Chainable<SentMessage[]> {
	return cy.wrap(sentMessages);
}

describe('reportPersistedActionTelemetry', () => {
	beforeEach(() => {
		sentMessages = [];
		setupMessengerMock({
			[logTelemetryRequest.method](msg: SentMessage) {
				sentMessages.push(msg);
			}
		});
	});

	describe('Peripherals/setPeripheralAssignment and Peripherals/setSignalGroupAssignment', () => {
		it('fires PERIPHERAL_ALLOCATED with the peripheral name and project id', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Peripherals/setPeripheralAssignment',
					payload: {peripheral: 'UART0', projectId: 'CM4-proj'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[0].id).to.be.a('string');
				expect(messages[0].method).to.equal('log-telemetry');
				expect(messages[0].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[0].params.metadata?.actionType).to.equal(
					'Peripherals'
				);
				expect(messages[1].id).to.be.a('string');
				expect(messages[1].method).to.equal('log-telemetry');
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_ALLOCATED,
					metadata: {
						peripheralName: 'UART0',
						projectId: 'CM4-proj',
						peripheralSecurity: undefined
					}
				});
			});
		});

		it('fires PERIPHERAL_ALLOCATED for setSignalGroupAssignment too', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Peripherals/setSignalGroupAssignment',
					payload: {peripheral: 'UART0', projectId: 'CM4-proj'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_ALLOCATED
				);
			});
		});
	});

	describe('Peripherals/removePeripheralAssignment', () => {
		it('fires PERIPHERAL_DEALLOCATED with the projectId', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Peripherals/removePeripheralAssignment',
					payload: {peripheral: 'UART0'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[0].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].id).to.be.a('string');
				expect(messages[1].method).to.equal('log-telemetry');
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_DEALLOCATED,
					metadata: {
						peripheralName: 'UART0',
						projectId: 'CM4-proj'
					}
				});
			});
		});
	});

	describe('Peripherals/setPeripheralConfig', () => {
		it('fires PERIPHERAL_CONFIGURED with only the config key names, never the values', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Peripherals/setPeripheralConfig',
					payload: {
						peripheralId: 'UART0',
						config: {
							BAUD_RATE: '115200',
							PARITY: 'NONE'
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				const {params} = messages[1];

				expect(params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_CONFIGURED
				);
				expect(params.metadata).to.deep.equal({
					peripheralName: 'UART0',
					configKeys: ['BAUD_RATE', 'PARITY']
				});
				// The actual configured values must never be sent.
				expect(params.metadata).to.not.have.property('config');
				expect(JSON.stringify(params.metadata)).to.not.include(
					'115200'
				);
				expect(JSON.stringify(params.metadata)).to.not.include(
					'NONE'
				);
			});
		});
	});

	describe('Pins/setAppliedSignal', () => {
		it('fires PIN_SIGNAL_ASSIGNED with pin, peripheral and signal name', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/setAppliedSignal',
					payload: {
						Pin: 'P0.1',
						Peripheral: 'UART0',
						Name: 'TX',
						PinCfg: {DRIVE_STRENGTH: '2'}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
					metadata: {
						pinId: 'P0.1',
						peripheralName: 'UART0',
						signalName: 'TX'
					}
				});
			});
		});
	});

	describe('Pins/removeAppliedSignal', () => {
		it('fires PIN_SIGNAL_REMOVED with pin, peripheral and signal name', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/removeAppliedSignal',
					payload: {Pin: 'P0.1', Peripheral: 'UART0', Name: 'TX'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_REMOVED,
					metadata: {
						pinId: 'P0.1',
						peripheralName: 'UART0',
						signalName: 'TX'
					}
				});
			});
		});
	});

	describe('Pins/updateAppliedSignal', () => {
		it('fires PIN_SIGNAL_REMOVED for the old signal and PIN_SIGNAL_ASSIGNED for the new one', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/updateAppliedSignal',
					payload: {
						removeSignal: {
							Pin: 'P0.1',
							Peripheral: 'UART0',
							Name: 'TX'
						},
						addSignal: {
							Pin: 'P0.2',
							Peripheral: 'UART0',
							Name: 'TX',
							PinCfg: {}
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(3);
				expect(messages[0].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].id).to.be.a('string');
				expect(messages[2].id).to.be.a('string');
				expect(messages[1].method).to.equal('log-telemetry');
				expect(messages[2].method).to.equal('log-telemetry');
				expect([
					messages[1].params,
					messages[2].params
				]).to.deep.equal([
					{
						action: CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_REMOVED,
						metadata: {
							pinId: 'P0.1',
							peripheralName: 'UART0',
							signalName: 'TX'
						}
					},
					{
						action:
							CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
						metadata: {
							pinId: 'P0.2',
							peripheralName: 'UART0',
							signalName: 'TX'
						}
					}
				]);
			});
		});
	});

	describe('Pins/assignCoprogrammedSignal', () => {
		it('fires one PIN_SIGNAL_ASSIGNED event per signal in the batch', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/assignCoprogrammedSignal',
					payload: [
						{Pin: 'P0.1', Peripheral: 'UART0', Name: 'TX'},
						{Pin: 'P0.2', Peripheral: 'UART0', Name: 'RX'}
					]
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(3);
				expect(messages[0].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect([
					messages[1].params,
					messages[2].params
				]).to.deep.equal([
					{
						action:
							CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
						metadata: {
							pinId: 'P0.1',
							peripheralName: 'UART0',
							signalName: 'TX'
						}
					},
					{
						action:
							CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
						metadata: {
							pinId: 'P0.2',
							peripheralName: 'UART0',
							signalName: 'RX'
						}
					}
				]);
			});
		});
	});

	describe('Pins/removeAppliedCoprogrammedSignals', () => {
		it('fires one PIN_SIGNAL_REMOVED event per signal in the batch', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/removeAppliedCoprogrammedSignals',
					payload: [{Pin: 'P0.1', Peripheral: 'UART0', Name: 'TX'}]
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[0].params.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_REMOVED,
					metadata: {
						pinId: 'P0.1',
						peripheralName: 'UART0',
						signalName: 'TX'
					}
				});
			});
		});
	});

	describe('Pins/setAppliedSignalControlValue', () => {
		it('fires PIN_CONTROL_CONFIGURED with only the control key, never the entered value', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Pins/setAppliedSignalControlValue',
					payload: {
						control: {
							pinId: 'P0.1',
							control: 'DRIVE_STRENGTH',
							value: 'SECRET_USER_VALUE'
						},
						projectId: 'CM4-proj'
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				const {params} = messages[1];

				expect(params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_CONTROL_CONFIGURED,
					metadata: {
						pinId: 'P0.1',
						controlKey: 'DRIVE_STRENGTH'
					}
				});
				expect(JSON.stringify(params.metadata)).to.not.include(
					'SECRET_USER_VALUE'
				);
			});
		});
	});

	describe('ClockConfig/setClockNodeControlValue', () => {
		it('fires CLOCK_NODE_CONFIGURED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'ClockConfig/setClockNodeControlValue',
					payload: {name: 'PLL0', key: 'FREQUENCY'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].id).to.be.a('string');
				expect(messages[1].method).to.equal('log-telemetry');
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.CLOCK_NODE_CONFIGURED,
					metadata: {
						nodeName: 'PLL0',
						controlKey: 'FREQUENCY',
						hasValidationError: false
					}
				});
			});
		});
	});

	describe('Partitions/createPartition', () => {
		it('fires MEMORY_PARTITION_CREATED with structural fields only, never the plugin config values', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Partitions/createPartition',
					payload: {
						displayName: 'My Secret Partition Name',
						startAddress: '0x10000000',
						type: 'FLASH',
						size: 100,
						config: {SECRET_PLUGIN_KEY: 'secret-value'},
						projects: [
							{projectId: 'CM4-proj'},
							{projectId: 'CM0-proj'}
						]
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				const {params} = messages[1];

				expect(params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_CREATED,
					metadata: {
						partitionStartAddress: '0x10000000',
						partitionType: 'FLASH',
						partitionSize: 100,
						assignedProjects: 'CM4-proj,CM0-proj'
					}
				});
				expect(JSON.stringify(params.metadata)).to.not.include(
					'My Secret Partition Name'
				);
				expect(JSON.stringify(params.metadata)).to.not.include(
					'secret-value'
				);
			});
		});

		it('sends an empty assignedProjects string when there are no projects', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Partitions/createPartition',
					payload: {
						startAddress: '0x10000000',
						type: 'FLASH',
						size: 100
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(
					messages[1].params.metadata?.assignedProjects
				).to.equal('');
			});
		});
	});

	describe('Partitions/editPartition', () => {
		it('fires MEMORY_PARTITION_MODIFIED with structural fields, joining project ids', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Partitions/editPartition',
					payload: {
						sidebarPartition: {
							displayName: 'My Secret Partition Name',
							startAddress: '0x10000000',
							type: 'FLASH',
							size: 100,
							config: {SECRET_PLUGIN_KEY: 'secret-value'},
							projects: [
								{projectId: 'CM4-proj'},
								{projectId: 'CM0-proj'}
							]
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				const {params} = messages[1];

				expect(params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_MODIFIED,
					metadata: {
						partitionStartAddress: '0x10000000',
						partitionType: 'FLASH',
						partitionSize: 100,
						assignedProjects: 'CM4-proj,CM0-proj'
					}
				});
				expect(JSON.stringify(params.metadata)).to.not.include(
					'My Secret Partition Name'
				);
				expect(JSON.stringify(params.metadata)).to.not.include(
					'secret-value'
				);
			});
		});
	});

	describe('Partitions/removePartition', () => {
		it('fires MEMORY_PARTITION_DELETED, resolving the address from the original state', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Partitions/removePartition',
					payload: {startAddress: '10000000'}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_DELETED,
					metadata: {
						partitionStartAddress: '0x10000000'
					}
				});
			});
		});
	});

	describe('Gaskets/addNewStream', () => {
		it('fires DFG_STREAM_CREATED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Gaskets/addNewStream',
					payload: {
						Source: {Gasket: 'BSS'},
						Destinations: [{Gasket: 'DSS'}, {Gasket: 'ESS'}]
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.DFG_STREAM_CREATED,
					metadata: {
						sourceGasket: 'BSS',
						destinationCount: 2
					}
				});
			});
		});
	});

	describe('Gaskets/removeStream', () => {
		it('fires DFG_STREAM_DELETED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'Gaskets/removeStream',
					payload: {
						Uuid: '83ae5f72-8c7d-49d2-b818-10977323a73f',
						Source: {Gasket: 'BSS'},
						Destinations: [{Gasket: 'DSS'}, {Gasket: 'GSS'}]
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.DFG_STREAM_DELETED,
					metadata: {
						sourceGasket: 'BSS',
						destinationCount: 2
					}
				});
			});
		});
	});

	describe('sru/setSruConnection', () => {
		it('sends the created SRU input connection modified event', () => {
			reportPersistedActionTelemetry(
				{
					type: 'sru/setSruConnection',
					payload: {
						input: 'SRC0_CLK_IP_I',
						source: 'DAI0_PB04_O'
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_INPUT_CONNECTION_MODIFIED,
					metadata: {
						peripheral: 'ASRC0',
						outputSignal: 'DAI0_PB04_O',
						inputSignal: 'SRC0_CLK_IP_I'
					}
				});
			});
		});
	});

	describe('sru/resetSruConnection', () => {
		afterEach(() => {
			initializeSruData([]);
		});

		it('sends the created SRU reset event', () => {
			initializeSruDefaultConnection();

			const outputResetState = {
				...originalState,
				sruReducer: {
					...originalState.sruReducer,
					modifiedConnections: {
						SRC0_CLK_IP_I: 'SPORT0_CLK_O'
					},
					editableConnections: [
						{
							output: {
								Name: 'SPORT0_CLK_O',
								PeripheralSubGroup: 'SPORT 0'
							},
							peripheralName: 'SPORT0'
						}
					]
				}
			} as unknown as RootState;

			reportPersistedActionTelemetry(
				{
					type: 'sru/resetSruConnection',
					payload: 'SRC0_CLK_IP_I'
				},
				outputResetState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_RESET_SOURCE,
					metadata: {
						peripheral: 'SPORT0',
						outputSignal: 'DAI0_PB04_O',
						inputSignal: 'SRC0_CLK_IP_I'
					}
				});
			});
		});
	});
});

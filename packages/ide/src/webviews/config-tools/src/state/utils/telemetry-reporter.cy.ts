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
import {mockVsCodeApi} from '@common/api';
import type {RootState} from '../store';
import {
	CONFIG_TOOLS_TELEMETRY_ACTIONS,
	reportPersistedActionTelemetry
} from './telemetry-reporter';

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
	}
} as unknown as RootState;

type SentMessage = {
	id: number;
	type: string;
	body: {action: string; metadata: Record<string, unknown>};
};

function getSentMessages(): Cypress.Chainable<SentMessage[]> {
	return cy
		.get<Cypress.Agent<sinon.SinonStub>>('@postMessage')
		.then(stub =>
			stub.getCalls().map(call => call.args[0] as SentMessage)
		);
}

describe('reportPersistedActionTelemetry', () => {
	beforeEach(() => {
		mockVsCodeApi({
			postMessage: cy.stub().as('postMessage'),
			getState: cy.stub(),
			setState: cy.stub()
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
				expect(messages[0].id).to.be.a('number');
				expect(messages[0].type).to.equal('log-telemetry');
				expect(messages[0].body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[0].body.metadata.actionType).to.equal(
					'Peripherals'
				);
				expect(messages[1].id).to.be.a('number');
				expect(messages[1].type).to.equal('log-telemetry');
				expect(messages[1].body).to.deep.equal({
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

			cy.get('@postMessage').should('have.been.calledTwice');
			getSentMessages().then(messages => {
				expect(messages[1].body.action).to.equal(
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
				expect(messages[0].body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].id).to.be.a('number');
				expect(messages[1].type).to.equal('log-telemetry');
				expect(messages[1].body).to.deep.equal({
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
				const {body} = messages[1];

				expect(body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_CONFIGURED
				);
				expect(body.metadata).to.deep.equal({
					peripheralName: 'UART0',
					configKeys: ['BAUD_RATE', 'PARITY']
				});
				// The actual configured values must never be sent.
				expect(body.metadata).to.not.have.property('config');
				expect(JSON.stringify(body.metadata)).to.not.include(
					'115200'
				);
				expect(JSON.stringify(body.metadata)).to.not.include('NONE');
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
				expect(messages[1].body).to.deep.equal({
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
				expect(messages[1].body).to.deep.equal({
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
				expect(messages[0].body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].id).to.be.a('number');
				expect(messages[2].id).to.be.a('number');
				expect(messages[1].type).to.equal('log-telemetry');
				expect(messages[2].type).to.equal('log-telemetry');
				expect([messages[1].body, messages[2].body]).to.deep.equal([
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
				expect(messages[0].body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect([messages[1].body, messages[2].body]).to.deep.equal([
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
				expect(messages[0].body.action).to.equal(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION
				);
				expect(messages[1].body).to.deep.equal({
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
				const {body} = messages[1];

				expect(body).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_CONTROL_CONFIGURED,
					metadata: {
						pinId: 'P0.1',
						controlKey: 'DRIVE_STRENGTH'
					}
				});
				expect(JSON.stringify(body.metadata)).to.not.include(
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
				expect(messages[1].id).to.be.a('number');
				expect(messages[1].type).to.equal('log-telemetry');
				expect(messages[1].body).to.deep.equal({
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
				const {body} = messages[1];

				expect(body).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_CREATED,
					metadata: {
						partitionStartAddress: '0x10000000',
						partitionType: 'FLASH',
						partitionSize: 100,
						assignedProjects: 'CM4-proj,CM0-proj'
					}
				});
				expect(JSON.stringify(body.metadata)).to.not.include(
					'My Secret Partition Name'
				);
				expect(JSON.stringify(body.metadata)).to.not.include(
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
				expect(messages[1].body.metadata.assignedProjects).to.equal(
					''
				);
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
				const {body} = messages[1];

				expect(body).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_MODIFIED,
					metadata: {
						partitionStartAddress: '0x10000000',
						partitionType: 'FLASH',
						partitionSize: 100,
						assignedProjects: 'CM4-proj,CM0-proj'
					}
				});
				expect(JSON.stringify(body.metadata)).to.not.include(
					'My Secret Partition Name'
				);
				expect(JSON.stringify(body.metadata)).to.not.include(
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
				expect(messages[1].body).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_DELETED,
					metadata: {
						partitionStartAddress: '0x10000000'
					}
				});
			});
		});
	});
});

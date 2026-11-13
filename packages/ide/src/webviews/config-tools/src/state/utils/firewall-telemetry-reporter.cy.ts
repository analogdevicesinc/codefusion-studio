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
import {logTelemetryRequest} from '@constants/messages/telemetry-messages';
import {SentMessage} from './telemetry-reporter.cy';
import {
	CONFIG_TOOLS_TELEMETRY_ACTIONS,
	reportPersistedActionTelemetry
} from './telemetry-reporter';
import {RootState} from '../store';

const originalState = {
	firewallReducer: {
		firewallZones: [
			{
				id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
				name: 'New Zone 1',
				description: '',
				accessMode: 'open',
				accessModes: {
					nonSecureNonPrivileged: true,
					nonSecurePrivileged: true,
					secureNonPrivileged: true,
					securePrivileged: true
				}
			}
		]
	}
} as unknown as RootState;

let sentMessages: SentMessage[];

function getSentMessages(): Cypress.Chainable<SentMessage[]> {
	return cy.wrap(sentMessages);
}

describe('firewall-telemetry-reporter', () => {
	beforeEach(() => {
		sentMessages = [];
		setupMessengerMock({
			[logTelemetryRequest.method](msg: SentMessage) {
				sentMessages.push(msg);
			}
		});
	});

	describe('firewall/addFirewallZone', () => {
		it('fires FIREWALL_ZONE_CREATED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/addFirewallZone',
					payload: {
						id: '0fffec40-dbfb-4a40-99de-5da802b19c12',
						name: 'New Zone 1',
						description: '',
						accessMode: 'open',
						accessModes: {
							nonSecureNonPrivileged: true,
							nonSecurePrivileged: true,
							secureNonPrivileged: true,
							securePrivileged: true
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.FIREWALL_ZONE_CREATED,
					metadata: undefined
				});
			});
		});
	});

	describe('firewall/removeFirewallEntry', () => {
		const modifiedOriginalState = {
			firewallReducer: {
				firewallZones: [
					{
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						name: 'New Zone 1',
						description: '',
						accessMode: 'open',
						accessModes: {
							nonSecureNonPrivileged: true,
							nonSecurePrivileged: true,
							secureNonPrivileged: true,
							securePrivileged: true
						},
						selectedFirewalls: [
							'initiators::Initiators::dma_dde_0',
							'responders::M55_Itcm::m55_itcm_0'
						]
					}
				]
			}
		} as unknown as RootState;

		it('fires INITIATOR_REMOVED when an initiator is removed', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/removeFirewallEntry',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						column: 'initiators',
						parent: 'Initiators',
						child: 'dma_dde_0'
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.INITIATOR_REMOVED,
					metadata: {count: 1}
				});
			});
		});

		it('fires RESPONDER_REMOVED when a responder is removed', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/removeFirewallEntry',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						column: 'responders',
						parent: 'M55_Itcm',
						child: 'm55_itcm_0'
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.RESPONDER_REMOVED,
					metadata: {count: 1}
				});
			});
		});
	});

	describe('firewall/updateFirewallZone', () => {
		it('fires ACCESS_MODES_CONFIGURED when modifying access modes', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/updateFirewallZone',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						updates: {
							accessModes: {
								nonSecureNonPrivileged: false,
								nonSecurePrivileged: false,
								secureNonPrivileged: true,
								securePrivileged: true
							}
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action:
						CONFIG_TOOLS_TELEMETRY_ACTIONS.ACCESS_MODES_CONFIGURED,
					metadata: {
						nonSecureNonPrivileged: false,
						nonSecurePrivileged: false,
						secureNonPrivileged: true,
						securePrivileged: true
					}
				});
			});
		});

		it('fires INITIATOR_ADDED when adding initiators', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/updateFirewallZone',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						updates: {
							selectedFirewalls: [
								'initiators::Initiators::dma_dde_0',
								'initiators::Initiators::dma_dde_1'
							]
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.INITIATOR_ADDED,
					metadata: {count: 2}
				});
			});
		});

		it('fires RESPONDER_ADDED when adding responders', () => {
			reportPersistedActionTelemetry(
				{
					type: 'firewall/updateFirewallZone',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						updates: {
							selectedFirewalls: [
								'responders::M55_Itcm::m55_itcm_0',
								'responders::M55_Itcm::m55_itcm_1'
							]
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.RESPONDER_ADDED,
					metadata: {count: 2}
				});
			});
		});

		it('fires INITIATOR_REMOVED when removing initiators', () => {
			const modifiedOriginalState = {
				firewallReducer: {
					firewallZones: [
						{
							id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
							name: 'New Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: {
								nonSecureNonPrivileged: true,
								nonSecurePrivileged: true,
								secureNonPrivileged: true,
								securePrivileged: true
							},
							selectedFirewalls: [
								'initiators::Initiators::dma_dde_0',
								'initiators::Initiators::dma_dde_1',
								'responders::M55_Itcm::m55_itcm_0',
								'responders::M55_Itcm::m55_itcm_1'
							]
						}
					]
				}
			} as unknown as RootState;

			reportPersistedActionTelemetry(
				{
					type: 'firewall/updateFirewallZone',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						updates: {
							selectedFirewalls: [
								'responders::M55_Itcm::m55_itcm_0',
								'responders::M55_Itcm::m55_itcm_1'
							]
						}
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.INITIATOR_REMOVED,
					metadata: {count: 2}
				});
			});
		});

		it('fires RESPONDER_REMOVED when removing responders', () => {
			const modifiedOriginalState = {
				firewallReducer: {
					firewallZones: [
						{
							id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
							name: 'New Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: {
								nonSecureNonPrivileged: true,
								nonSecurePrivileged: true,
								secureNonPrivileged: true,
								securePrivileged: true
							},
							selectedFirewalls: [
								'initiators::Initiators::dma_dde_0',
								'initiators::Initiators::dma_dde_1',
								'responders::M55_Itcm::m55_itcm_0',
								'responders::M55_Itcm::m55_itcm_1'
							]
						}
					]
				}
			} as unknown as RootState;

			reportPersistedActionTelemetry(
				{
					type: 'firewall/updateFirewallZone',
					payload: {
						id: '5e465b98-02b0-4a20-8502-e386de3ec0f0',
						updates: {
							selectedFirewalls: [
								'initiators::Initiators::dma_dde_0',
								'initiators::Initiators::dma_dde_1'
							]
						}
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.RESPONDER_REMOVED,
					metadata: {count: 2}
				});
			});
		});
	});
});

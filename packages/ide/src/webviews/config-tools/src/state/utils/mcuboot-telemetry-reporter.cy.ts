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
import {RootState} from '../store';
import {
	CONFIG_TOOLS_TELEMETRY_ACTIONS,
	reportPersistedActionTelemetry
} from './telemetry-reporter';
import {SentMessage} from './telemetry-reporter.cy';
import {logTelemetryRequest} from '@constants/messages/telemetry-messages';

const originalState = {
	applicationPackagesReducer: {
		applicationPackages: [
			{
				id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
				name: '',
				enabled: true,
				coreId: '',
				images: []
			}
		]
	}
} as unknown as RootState;

let sentMessages: SentMessage[];

function getSentMessages(): Cypress.Chainable<SentMessage[]> {
	return cy.wrap(sentMessages);
}

describe('mcuboot-telemetry-reporter', () => {
	beforeEach(() => {
		sentMessages = [];
		setupMessengerMock({
			[logTelemetryRequest.method](msg: SentMessage) {
				sentMessages.push(msg);
			}
		});
	});

	describe('ApplicationPackages/addApplicationPackage', () => {
		it('fires APP_PACK_CREATED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'ApplicationPackages/addApplicationPackage',
					payload: {
						id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
						name: 'New App Pack 1',
						enabled: true,
						coreId: ''
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.APP_PACK_CREATED,
					metadata: undefined
				});
			});
		});
	});

	describe('ApplicationPackages/removeApplicationPackage', () => {
		it('fires APP_PACK_DELETED', () => {
			reportPersistedActionTelemetry(
				{
					type: 'ApplicationPackages/removeApplicationPackage',
					payload: {
						id: '9b26d02b-08eb-4502-b211-c1ca1c14b599'
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.APP_PACK_DELETED,
					metadata: undefined
				});
			});
		});
	});

	describe('ApplicationPackages/updateApplicationPackage', () => {
		it('fires IMAGE_ADDED when an image is added', () => {
			reportPersistedActionTelemetry(
				{
					type: 'ApplicationPackages/updateApplicationPackage',
					payload: {
						id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
						updates: {
							images: [
								{
									id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
									name: 'Image 1',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 4096,
									slotSizeUnit: 'KB',
									path: '',
									headerSize: 32,
									padHeader: true,
									swapAlignment: '4',
									imageVersion: '',
									bootable: true
								}
							]
						}
					}
				},
				originalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.IMAGE_ADDED,
					metadata: undefined
				});
			});
		});

		it('fires COMPONENT_DELETED when an image is deleted', () => {
			const modifiedOriginalState = {
				applicationPackagesReducer: {
					applicationPackages: [
						{
							...originalState.applicationPackagesReducer
								.applicationPackages[0],
							images: [
								{
									id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
									name: 'Image 1',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 4096,
									slotSizeUnit: 'KB',
									path: '',
									headerSize: 32,
									padHeader: true,
									swapAlignment: '4',
									imageVersion: '',
									bootable: true,
									customTLVs: []
								}
							]
						}
					]
				}
			} as unknown as RootState;

			reportPersistedActionTelemetry(
				{
					type: 'ApplicationPackages/updateApplicationPackage',
					payload: {
						id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
						updates: {
							images: []
						}
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.COMPONENT_DELETED,
					metadata: undefined
				});
			});
		});

		it('fires CUSTOM_TLV_ADDED when a custom TLV is added', () => {
			const modifiedOriginalState = {
				applicationPackagesReducer: {
					applicationPackages: [
						{
							...originalState.applicationPackagesReducer
								.applicationPackages[0],
							images: [
								{
									id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
									name: 'Image 1',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 4096,
									slotSizeUnit: 'KB',
									path: '',
									headerSize: 32,
									padHeader: true,
									swapAlignment: '4',
									imageVersion: '',
									bootable: true,
									customTLVs: []
								}
							]
						}
					]
				}
			} as unknown as RootState;

			reportPersistedActionTelemetry(
				{
					type: 'ApplicationPackages/updateApplicationPackage',
					payload: {
						id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
						updates: {
							images: [
								{
									id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
									name: 'Image 1',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 4096,
									slotSizeUnit: 'KB',
									path: '',
									headerSize: 32,
									padHeader: true,
									swapAlignment: '4',
									imageVersion: '',
									bootable: true,
									customTLVs: [
										{
											id: 'a8358075-08c8-44d6-a196-3776923e1b0f',
											name: 'Custom TLV 1',
											tag: 0,
											value: ''
										}
									]
								}
							]
						}
					}
				},
				modifiedOriginalState
			);

			getSentMessages().then(messages => {
				expect(messages).to.have.length(2);
				expect(messages[1].params).to.deep.equal({
					action: CONFIG_TOOLS_TELEMETRY_ACTIONS.CUSTOM_TLV_ADDED,
					metadata: undefined
				});
			});
		});
	});

	it('fires SIGN_KEY_SELECTED when a sign key is selected on the application package', () => {
		reportPersistedActionTelemetry(
			{
				type: 'ApplicationPackages/updateApplicationPackage',
				payload: {
					id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
					updates: {
						signKey: 'test-key.pem'
					}
				}
			},
			originalState
		);

		getSentMessages().then(messages => {
			expect(messages).to.have.length(2);
			expect(messages[1].params).to.deep.equal({
				action: CONFIG_TOOLS_TELEMETRY_ACTIONS.SIGN_KEY_SELECTED,
				metadata: undefined
			});
		});
	});

	it('fires SIGN_KEY_SELECTED when a sign key is selected on the image', () => {
		const modifiedOriginalState = {
			applicationPackagesReducer: {
				applicationPackages: [
					{
						...originalState.applicationPackagesReducer
							.applicationPackages[0],
						images: [
							{
								id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
								name: 'Image 1',
								locationType: 'hexAddress',
								locationAddress: '',
								slotSize: 4096,
								slotSizeUnit: 'KB',
								path: '',
								headerSize: 32,
								padHeader: true,
								swapAlignment: '4',
								imageVersion: '',
								bootable: true,
								customTLVs: []
							}
						]
					}
				]
			}
		} as unknown as RootState;

		reportPersistedActionTelemetry(
			{
				type: 'ApplicationPackages/updateApplicationPackage',
				payload: {
					id: '9b26d02b-08eb-4502-b211-c1ca1c14b599',
					updates: {
						images: [
							{
								id: '9ac1fed6-52bb-4a3f-8ff8-94a0816d943b',
								name: 'Image 1',
								locationType: 'hexAddress',
								locationAddress: '',
								slotSize: 4096,
								slotSizeUnit: 'KB',
								path: '',
								headerSize: 32,
								padHeader: true,
								swapAlignment: '4',
								imageVersion: '',
								bootable: true,
								signKey: 'test-key.pem'
							}
						]
					}
				}
			},
			modifiedOriginalState
		);

		getSentMessages().then(messages => {
			expect(messages).to.have.length(2);
			expect(messages[1].params).to.deep.equal({
				action: CONFIG_TOOLS_TELEMETRY_ACTIONS.SIGN_KEY_SELECTED,
				metadata: undefined
			});
		});
	});
});

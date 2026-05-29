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
import {navigationItems} from '../../common/constants/navigation';
import {FILE_TYPES, type SevSaveType} from '../../common/types/files';
import {setActiveScreen} from '../../state/slices/app-context/app-context.reducer';
import {store} from '../../state/store';

import SevHeader from './sev-header';

describe('SevHeader', () => {
	let createFileRequests: Array<{
		type: string;
		id?: number;
		body?: any;
	}> = [];

	beforeEach(() => {
		store.dispatch(setActiveScreen(navigationItems.timeline));
		createFileRequests = [];

		mockVsCodeApi({
			postMessage(message: any) {
				if (message?.type !== 'sev-create-file') {
					return undefined;
				}

				createFileRequests.push(message);

				window.dispatchEvent(
					new MessageEvent('message', {
						data: {
							type: 'api-response',
							id: message.id,
							body: ''
						}
					})
				);

				return undefined;
			},
			getState: cy.stub(),
			setState: cy.stub()
		});

		cy.mount(<SevHeader />, store);
	});

	const assertCreateFileRequest = (expectedFileType: SevSaveType) => {
		cy.then(() => {
			expect(
				createFileRequests,
				'sev-create-file requests'
			).to.have.length.greaterThan(0);
			expect(createFileRequests[0].type).to.equal('sev-create-file');
			expect(createFileRequests[0].body?.saveType).to.equal(
				expectedFileType
			);
		});
	};

	it('Should request .cfsevents file creation', () => {
		cy.dataTest('sev-header:save-as-action').find('button').click();
		assertCreateFileRequest(FILE_TYPES.SAVE);
	});

	it('Should request .csv file creation', () => {
		cy.dataTest('sev-header:export-action').find('button').click();
		assertCreateFileRequest(FILE_TYPES.EXPORT);
	});
});

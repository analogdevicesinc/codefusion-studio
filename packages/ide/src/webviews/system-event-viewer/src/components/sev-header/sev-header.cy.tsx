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
import {
	setActiveScreen,
	setLastUpdate,
	setToolState
} from '../../state/slices/app-context/app-context.reducer';
import {setEventSources} from '../../state/slices/event-sources/event-sources.reducer';
import {store} from '../../state/store';

import SevHeader from './sev-header';

const mountSevHeader = () => {
	store.dispatch(setActiveScreen(navigationItems.timeline));
	store.dispatch(setToolState(undefined));
	store.dispatch(setLastUpdate(undefined));
	store.dispatch(setEventSources([]));

	mockVsCodeApi({
		postMessage() {
			return undefined;
		},
		getState: cy.stub(),
		setState: cy.stub()
	});

	cy.mount(<SevHeader />, store);
};

describe('SevHeader CTA', () => {
	let createFileRequests: Array<{
		type: string;
		id?: number;
		body?: any;
	}> = [];

	beforeEach(() => {
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

		store.dispatch(setActiveScreen(navigationItems.timeline));
		store.dispatch(setToolState(undefined));
		store.dispatch(setLastUpdate(undefined));
		store.dispatch(setEventSources([]));

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

describe('Status tooltip', () => {
	beforeEach(() => {
		mountSevHeader();
		cy.clock(new Date('2026-05-20T12:00:00.000Z').getTime());
	});

	const hoverStatusBadge = () => {
		cy.dataTest('sev-header:status-badge')
			.dataTest('sev-header:status-tooltip')
			.trigger('mouseover')
			.trigger('mousemove')
			.trigger('mouseenter');
		cy.tick(500);
	};

	it('Should show "No events have been received yet" when active with no event sources', () => {
		store.dispatch(setToolState('active'));
		store.dispatch(setLastUpdate('2026-05-20T10:00:00.000Z'));
		store.dispatch(setEventSources([]));

		hoverStatusBadge();
		cy.contains('No events have been received yet').should('exist');
	});

	it('Should show elapsed time tooltip when session has ended', () => {
		store.dispatch(setToolState('ended'));
		store.dispatch(setLastUpdate('2026-05-20T09:00:00.000Z'));

		hoverStatusBadge();
		cy.contains(/Last updated .* ago/).should('exist');
	});

	it('Should show absolute date tooltip when a local file is open', () => {
		store.dispatch(setToolState('file'));
		store.dispatch(setLastUpdate('2026-05-20T10:00:00.000Z'));

		hoverStatusBadge();
		cy.contains('Opened local file. Last updated').should('exist');
	});
});

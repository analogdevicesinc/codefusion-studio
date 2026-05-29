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

import {navigationItems} from '../../../common/constants/navigation';
import {INITIAL_DATA_ZOOM} from '../../../common/constants/timeline';
import {AppContent} from '../../../components/app-content/app-content';
import {setActiveScreen} from '../../../state/slices/app-context/app-context.reducer';
import {setDataZoom} from '../../../state/slices/timeline/timeline.reducer';
import {store} from '../../../state/store';

function assertListOrder(expectedNames: string[]) {
	cy.dataTest('event-sources:container')
		.dataTest('event-sources:item:name')
		.should(names => {
			const actual = Array.from(names, item =>
				item.textContent?.trim()
			);

			expect(actual).to.deep.equal(expectedNames);
		});
}

describe('Timeline Drag and Drop', () => {
	beforeEach(() => {
		store.dispatch(setActiveScreen(navigationItems.timeline));
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		store.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('Should update the list order when drop happens outside allowed area', () => {
		cy.mount(<AppContent />, store);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		const initialOrder = [
			'Event Source Alias 1',
			'Event Source Alias 2',
			'Event Source Alias 3'
		];

		assertListOrder(initialOrder);

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:item:drag-handle:0').trigger(
				'dragstart',
				{
					dataTransfer: new DataTransfer(),
					force: true
				}
			);
		});

		cy.get('body').should('have.class', 'timeline-drag-active');

		cy.dataTest('event-sources:item:1').trigger('dragenter', {
			dataTransfer: new DataTransfer(),
			force: true
		});

		// Drop outside diagram bounds to trigger drag cancel/reset path.
		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();

			cy.window().then(win => {
				const outsideDropEvent = new win.DragEvent('drop', {
					bubbles: true,
					cancelable: true,
					clientX: rect.left,
					clientY: rect.top - 200, // Above the diagram
					dataTransfer: new DataTransfer()
				});

				win.dispatchEvent(outsideDropEvent);
			});
		});

		cy.get('body').should('not.have.class', 'timeline-drag-active');

		assertListOrder([
			'Event Source Alias 2',
			'Event Source Alias 1',
			'Event Source Alias 3'
		]);
	});
});

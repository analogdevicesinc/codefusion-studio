/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {INITIAL_DATA_ZOOM} from './common/constants/timeline';
import {AppContent} from './components/app-content/app-content';
import {setJsonValidationErrors} from './state/slices/event-sources/event-sources.reducer';
import {setDataZoom} from './state/slices/timeline/timeline.reducer';
import {store} from './state/store';

function TestComponent() {
	return <AppContent />;
}

describe('AppContent', () => {
	beforeEach(() => {
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		store.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('Should show loading first, then renders the timeline content', () => {
		const testStore = store;

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('app-content:loading').should('exist');
		});

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('timeline:container').should('exist');
		cy.dataTest('timeline-diagram').should('exist');
	});

	it('Should render JSON validation errors instead of the timeline content', () => {
		const testStore = store;
		cy.mount(<TestComponent />, testStore);

		cy.then(() => {
			testStore.dispatch(
				setJsonValidationErrors(['Invalid JSON payload', 'Line: 3'])
			);
		});

		cy.dataTest('json-error:0').should(
			'contain.text',
			'Invalid JSON payload'
		);
		cy.dataTest('json-error:1').should('contain.text', 'Line: 3');
		cy.dataTest('timeline:container').should('not.exist');
	});

	it('Should return to timeline content after clearing JSON errors', () => {
		const testStore = store;
		cy.mount(<TestComponent />, testStore);

		cy.then(() => {
			testStore.dispatch(setJsonValidationErrors(['Invalid JSON']));
		});

		cy.dataTest('json-error:0').should('exist');

		cy.then(() => {
			testStore.dispatch(setJsonValidationErrors([]));
		});

		cy.dataTest('json-error:0').should('not.exist');
		cy.dataTest('timeline:container').should('exist');
		cy.dataTest('timeline-diagram').should('exist');
	});
});

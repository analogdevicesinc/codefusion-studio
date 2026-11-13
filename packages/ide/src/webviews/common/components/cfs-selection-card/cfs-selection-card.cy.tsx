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

import CfsSelectionCard from './CfsSelectionCard';

describe('CfsSelectionCard', () => {
	it('calls onChange when the card is clicked', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				onChange={onChange}
			>
				<h3 slot='title'>Card title</h3>
			</CfsSelectionCard>
		);

		cy.dataTest('selection-card').click();

		cy.wrap(onChange).should('have.been.calledOnceWith', 'card-id');
	});

	it('does not select the card when a plain end-slot element is clicked', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				onChange={onChange}
			>
				<span slot='end' data-test='end-item'>
					End item
				</span>
			</CfsSelectionCard>
		);

		cy.dataTest('end-item').click();

		cy.wrap(onChange).should('not.have.been.called');
	});

	it('selects the card when a link in the end slot is clicked', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				onChange={onChange}
			>
				<a slot='end' href='#link' data-test='end-link'>
					Link
				</a>
			</CfsSelectionCard>
		);

		cy.dataTest('end-link').click();

		cy.wrap(onChange).should('have.been.calledOnceWith', 'card-id');
	});

	it('selects the card when an opted-in end-slot element is clicked', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				endSlotSelectsCard
				onChange={onChange}
			>
				<span slot='end'>
					<svg data-test='info-icon' width='16' height='16'>
						<circle cx='8' cy='8' r='7' />
					</svg>
				</span>
			</CfsSelectionCard>
		);

		cy.dataTest('info-icon').click();

		cy.wrap(onChange).should('have.been.calledOnceWith', 'card-id');
	});

	it('selects the card when the end-slot padding is clicked with the opt-in enabled', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				endSlotSelectsCard
				onChange={onChange}
			>
				<span slot='end'>
					<svg data-test='info-icon' width='16' height='16'>
						<circle cx='8' cy='8' r='7' />
					</svg>
				</span>
			</CfsSelectionCard>
		);

		cy.dataTest('selection-card:endSlot').click(2, 26);

		cy.wrap(onChange).should('have.been.calledOnceWith', 'card-id');
	});

	it('expands the content without selecting the card when the arrow is clicked', () => {
		const onChange = cy.stub();

		cy.mount(
			<CfsSelectionCard
				id='card-id'
				testId='selection-card'
				endSlotSelectsCard
				onChange={onChange}
			>
				<h3 slot='title'>Card title</h3>
				<span slot='end'>End item</span>
				<div slot='content' data-test='card-content'>
					Card content
				</div>
			</CfsSelectionCard>
		);

		cy.dataTest('selection-card:endSlot:icon').click();

		cy.dataTest('card-content').should('exist');
		cy.wrap(onChange).should('not.have.been.called');
	});
});

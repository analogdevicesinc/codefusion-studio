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

import {LocalizationProvider} from '@common/contexts/LocaleContext';
import ProjectGroups from './ProjectGroups';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

function mountGroups(groups: string[] = []) {
	cy.mount(
		<LocalizationProvider namespace='west-editor'>
			<ProjectGroups
				groups={groups}
				availableGroups={['babblesim', 'hal', 'tools']}
				index={0}
				onChange={cy.stub().as('onChange')}
			/>
		</LocalizationProvider>
	);
}

function openCreate() {
	cy.dataTest('west-editor:project-group-add-0').click();
	cy.dataTest('west-editor:project-group-create-0').click();
}

describe('ProjectGroups', () => {
	it('shows only the add button when the project has no group', () => {
		mountGroups();

		cy.get('[data-test^="west-editor:project-group-0-"]').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-group-add-0')
			.should('be.visible')
			.trigger('mouseover');
		cy.contains('Add Group').should('be.visible');
	});

	it('shows a pill per group and removes one', () => {
		mountGroups(['hal', 'tools']);

		cy.dataTest('west-editor:project-group-0-hal').should(
			'contain.text',
			'hal'
		);
		cy.dataTest('west-editor:project-group-0-tools').should(
			'contain.text',
			'tools'
		);

		cy.dataTest('west-editor:project-group-remove-0-hal').click();
		cy.get('@onChange').should('have.been.calledOnceWith', ['tools']);
	});

	it('opens a menu of the groups the project does not have yet', () => {
		mountGroups(['hal']);

		cy.dataTest('west-editor:project-group-add-0').click();

		cy.dataTest('west-editor:project-group-dropdown-0').should(
			'contain.text',
			'Select a Group'
		);
		cy.dataTest(
			'west-editor:project-group-option-0-babblesim'
		).should('have.text', 'babblesim');
		cy.dataTest('west-editor:project-group-option-0-tools').should(
			'exist'
		);
		cy.dataTest('west-editor:project-group-option-0-hal').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-group-create-0').should(
			'have.text',
			'Create a Group'
		);
	});

	it('adds the picked group and goes back to the pills', () => {
		mountGroups(['hal']);

		cy.dataTest('west-editor:project-group-add-0').click();
		cy.dataTest('west-editor:project-group-option-0-tools').click();

		cy.get('@onChange').should('have.been.calledOnceWith', [
			'hal',
			'tools'
		]);
		cy.dataTest('west-editor:project-group-dropdown-0').should(
			'not.exist'
		);
	});

	it('goes back to the pills on an outside click', () => {
		mountGroups(['hal']);

		cy.dataTest('west-editor:project-group-add-0').click();
		cy.dataTest('west-editor:project-group-dropdown-0').should(
			'exist'
		);

		cy.get('body').click(0, 0);

		cy.dataTest('west-editor:project-group-dropdown-0').should(
			'not.exist'
		);
		cy.dataTest('west-editor:project-group-0-hal').should('exist');
	});

	it('creates a group with Enter', () => {
		mountGroups(['hal']);
		openCreate();

		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('MyNewGroup{enter}');

		cy.get('@onChange').should('have.been.calledOnceWith', [
			'hal',
			'MyNewGroup'
		]);
		cy.dataTest('west-editor:project-group-add-0').should('exist');
	});

	it('creates a group with the confirm button', () => {
		mountGroups();
		openCreate();

		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('  ci  ');
		cy.dataTest('west-editor:project-group-confirm-0').click();

		cy.get('@onChange').should('have.been.calledOnceWith', ['ci']);
	});

	it('cancels with Escape or the cancel button', () => {
		mountGroups();
		openCreate();

		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('ci{esc}');
		cy.dataTest('west-editor:project-group-add-0').should('exist');

		openCreate();
		cy.dataTest('west-editor:project-group-cancel-0').click();
		cy.dataTest('west-editor:project-group-add-0').should('exist');

		cy.get('@onChange').should('not.have.been.called');
	});

	it('rejects an invalid name', () => {
		mountGroups();
		openCreate();

		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('my group{enter}');

		cy.dataTest('west-editor:project-group-input-0-error').should(
			'contain.text',
			'cannot contain spaces'
		);
		cy.get('@onChange').should('not.have.been.called');
	});

	it('does not duplicate a group the project already has', () => {
		mountGroups(['hal']);
		openCreate();

		cy.dataTest('west-editor:project-group-input-0-control-input')
			.shadow()
			.find('input')
			.type('hal{enter}');

		cy.get('@onChange').should('not.have.been.called');
		cy.dataTest('west-editor:project-group-0-hal').should('exist');
	});
});

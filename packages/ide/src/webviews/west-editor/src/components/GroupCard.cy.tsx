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
import GroupCard from './GroupCard';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

function mountCard() {
	cy.mount(
		<LocalizationProvider namespace='west-editor'>
			<GroupCard
				name='babblesim'
				state='disabled'
				index={0}
				onChange={cy.stub().as('onChange')}
			/>
		</LocalizationProvider>
	);
}

describe('GroupCard', () => {
	it('renders the group name as the card heading', () => {
		mountCard();

		cy.dataTest('west-editor:group-name-0')
			.should('have.prop', 'tagName', 'H3')
			.and('have.text', 'babblesim');
	});

	it('offers the three states and selects the current one', () => {
		mountCard();

		cy.dataTest('west-editor:group-state-0')
			.should('have.value', 'disabled')
			.find('> vscode-option')
			.should('have.length', 3)
			.and('contain.text', 'Enabled')
			.and('contain.text', 'Disabled')
			.and('contain.text', 'None');
	});

	it('reports the state that was picked', () => {
		mountCard();

		cy.dataTest('west-editor:group-state-0').click();
		cy.dataTest('west-editor:group-state-0')
			.find('> vscode-option')
			.contains('Enabled')
			.click();

		cy.get('@onChange').should('have.been.calledOnceWith', 'enabled');
	});
});

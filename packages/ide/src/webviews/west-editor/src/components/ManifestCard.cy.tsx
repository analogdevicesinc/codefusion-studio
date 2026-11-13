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
import ManifestCard from './ManifestCard';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

function mountCard() {
	cy.mount(
		<LocalizationProvider namespace='west-editor'>
			<ManifestCard
				path='modules/hal/nordic/submanifests/west.yml'
				projectName='hal_nordic'
				index={0}
				onOpen={cy.stub().as('onOpen')}
			/>
		</LocalizationProvider>
	);
}

describe('ManifestCard', () => {
	it('renders the manifest path and the project it comes from', () => {
		mountCard();

		cy.dataTest('west-editor:manifest-path-0').should(
			'have.text',
			'modules/hal/nordic/submanifests/west.yml'
		);
		cy.dataTest('west-editor:manifest-project-0').should(
			'have.text',
			'hal_nordic'
		);
	});

	it('reports a request to open the manifest', () => {
		mountCard();

		cy.dataTest('west-editor:manifest-open-0').click();
		cy.get('@onOpen').should('have.been.calledOnce');
	});

	it('offers no way to change the manifest', () => {
		mountCard();

		cy.dataTest('west-editor:manifest-card-0')
			.find('[data-test]')
			.then($hooks =>
				$hooks.toArray().map(el => el.getAttribute('data-test'))
			)
			.should('deep.equal', [
				'west-editor:manifest-path-0',
				'west-editor:manifest-open-0',
				'west-editor:manifest-project-0'
			]);
	});
});

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
import RemoteCard from './RemoteCard';

const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(window as any).__webview_localization_resources__ = l10n.default;

type CardOverrides = {
	name?: string;
	url?: string;
};

function mountCard(overrides: CardOverrides = {}) {
	const props = {
		name: 'upstream',
		url: 'https://github.com/zephyrproject-rtos',
		...overrides
	};

	cy.mount(
		<LocalizationProvider namespace='west-editor'>
			<RemoteCard
				name={props.name}
				url={props.url}
				index={0}
				onCopyUrl={cy.stub().as('onCopyUrl')}
			/>
		</LocalizationProvider>
	);
}

describe('RemoteCard', () => {
	it('renders the remote name as the card heading', () => {
		mountCard();

		cy.dataTest('west-editor:remote-name-0')
			.should('have.prop', 'tagName', 'H3')
			.and('have.text', 'upstream');
	});

	it('renders the url-base of the remote', () => {
		mountCard();

		cy.dataTest('west-editor:remote-url-0').should(
			'have.text',
			'https://github.com/zephyrproject-rtos'
		);
	});

	it('reports a request to copy the URL', () => {
		mountCard();

		cy.dataTest('west-editor:remote-copy-0').click();

		cy.get('@onCopyUrl').should('have.been.called');
	});
});

/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import PinMUX from '@common/icons/PinMUX';
import {NavItem} from './NavItem';

describe('Navigation Item', () => {
	it('Displays a tooltip when a tooltip label is provided and the item is hovered', () => {
		cy.mount(
			<div style={{width: '48px', filter: 'invert(1)'}}>
				<NavItem
					isActive
					id='pinmux'
					icon={<PinMUX />}
					tooltipLabel='Pin Mux'
					disabled={false}
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					onClick={() => {}}
				/>
			</div>
		);

		cy.dataTest('nav-item:pinmux').realHover();

		cy.dataTest('nav-item:pinmux:tooltip-notch').should('be.visible');

		cy.window().then(win => {
			const tooltip = win.getComputedStyle(
				document.querySelector('#pinmux')!,
				'::after'
			);

			cy.wrap(tooltip.getPropertyValue('content')).should(
				'eq',
				'"Pin Mux"'
			);
		});
	});
});

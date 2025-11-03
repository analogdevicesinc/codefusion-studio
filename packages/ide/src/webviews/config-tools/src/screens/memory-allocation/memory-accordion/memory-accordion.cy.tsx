/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {configurePreloadedStore} from '../../../state/store';
import MemoryAccordion from './memory-accordion';
import type {MemoryBlock, Soc} from '@common/types/soc';

const mock = (await import(`@socs/max32690-tqfn.json`))
	.default as unknown as Soc;

const buildMockMemoryBlock = (
	minAlignment: number | undefined
): MemoryBlock => ({
	Name: 'sysram0',
	Description: 'System RAM Block 0',
	AddressStart: '0x20000000',
	AddressEnd: '0x2001ffff',
	Width: 8,
	Access: 'R/W',
	Type: 'RAM',
	Location: 'Internal',
	MinimumAlignment: minAlignment
});

describe('Memory Accordion', () => {
	describe('when displaying the block min alignment', () => {
		it('should not display anything when the min alignment is not provided', () => {
			const reduxStore = configurePreloadedStore(mock);

			const memoryBlock = buildMockMemoryBlock(undefined);

			cy.mount(
				<MemoryAccordion memoryBlock={memoryBlock} />,
				reduxStore
			);

			cy.dataTest(`accordion:${memoryBlock.Name}`)
				.should('be.visible')
				.click();

			cy.dataTest('min-alignment').should('not.be.visible');
		});

		it('should return KB when the min alignment is divisible by 1024', () => {
			const reduxStore = configurePreloadedStore(mock);

			const memoryBlock = buildMockMemoryBlock(1024);

			cy.mount(
				<MemoryAccordion memoryBlock={memoryBlock} />,
				reduxStore
			);

			cy.dataTest(`accordion:${memoryBlock.Name}`)
				.should('be.visible')
				.click();

			cy.dataTest('min-alignment')
				.should('be.visible')
				.and('have.text', '1 KB');
		});

		it('should return Bytes when the min alignment is not divisible by 1024', () => {
			const reduxStore = configurePreloadedStore(mock);

			const memoryBlock = buildMockMemoryBlock(500);

			cy.mount(
				<MemoryAccordion memoryBlock={memoryBlock} />,
				reduxStore
			);

			cy.dataTest(`accordion:${memoryBlock.Name}`)
				.should('be.visible')
				.click();

			cy.dataTest('min-alignment')
				.should('be.visible')
				.and('have.text', '500 Bytes');
		});
	});
});

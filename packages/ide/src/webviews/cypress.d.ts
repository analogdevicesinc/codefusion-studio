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
import {Soc} from './common/types/soc';

export {};

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Cypress {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface Chainable {
			/**
			 * Custom command to select DOM element by data-test attribute.
			 * @example cy.dataTest('greeting')
			 * @param {string} value - The value of the data-test attribute
			 */
			dataTest(value: string): Chainable<JQuery>;
			/**
			 * Extended mount command that wraps the component in a Redux Provider
			 * @param component - The component to mount
			 * @param reduxStore - The redux store to use
			 */
			mount(
				component: React.ReactNode,
				reduxStore?: ResolvedType<
					ReturnType<typeof getPreloadedStateStore>
				>
			): Chainable<MountReturn>;
			/**
			 * Custom command to import the mocked elf parser model (fixture)
			 * @returns {Chainable} - ELF data model
			 */
			mockElfParser(): Chainable<unknown>;
		}
	}
}

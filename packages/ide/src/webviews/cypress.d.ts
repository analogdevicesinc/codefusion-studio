/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
declare namespace Cypress {
	interface Chainable {
		/** Custom command to select DOM element by data-test attribute. */
		dataTest(value: string): Chainable<JQuery>;
		/** Extended mount command that wraps the component in a Redux Provider. */
		mount(
			component: React.ReactNode,
			reduxStore?: unknown
		): Chainable<MountReturn>;
		/** Custom command to import the mocked elf parser model (fixture). */
		mockElfParser(): Chainable<unknown>;
	}
}

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
import "./commands";
import { type MountReturn, mount } from "cypress/react18";
import { getWrapped } from "./getWrapped";
import { configurePreloadedStore } from "../../src/webviews/config-tools/src/state/store";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Chainable {
      mount(
        component: React.ReactNode,
        reduxStore?: ReturnType<typeof configurePreloadedStore>,
      ): Chainable<MountReturn>;
      lazyMount(
        componentPath: string,
        reduxStore: ReturnType<typeof configurePreloadedStore>,
      ): Chainable<MountReturn>;
    }
  }
}

// Example use:
// cy.mount(<MyComponent />)
Cypress.Commands.add("mount", (component, reduxStore) => {
  if (!reduxStore) return mount(component);

  const wrapped = getWrapped({ component, reduxStore });

  return mount(wrapped);
});

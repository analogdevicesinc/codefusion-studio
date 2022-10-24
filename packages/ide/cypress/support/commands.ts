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
import { Soc } from "../../src/webviews/common/types/soc";
import "cypress-real-events";

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Chainable {
      dataTest(value: string): Chainable<JQuery>;
      soc(socId: string): Chainable;
    }
  }
}

// Example use:
// cy.dataTest('sidebar')
Cypress.Commands.add("dataTest", (value) => cy.get(`[data-test="${value}"]`));

/**
 * Custom command to import an soc based on a provided soc id
 * @example cy.soc('max32690-tqfn')
 * @param {string} socId - The soc id to import
 * @returns {Soc} - The imported soc
 */
Cypress.Commands.add("soc", (socId: string) => {
  cy.readFile<Soc>(`../../../cli/src/socs/${socId}.json`).then((document) => {
    (window as any).__DEV_SOC__ = JSON.stringify(document);
    window.localStorage.setItem("SOC", JSON.stringify(document));

    return document;
  });
});

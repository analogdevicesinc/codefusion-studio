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

import { By, WebView, Key, WebElement } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

export const searchField: By = By.css(`#control-input`);
export const assignedPinsList: By = By.css("#peripheral-navigation > section");
export const pinDetailsContainer: By = By.css("#details-container");
export const configButton: By = By.css("[class^='_configButtonContainer_']");
export const pinTooltipTitle: By = By.css(
  "#pin-details-title > div:first-of-type > h3:first-of-type",
);
export const focusedPinBackdrop: By = By.css("#focused-pin-backdrop");

export async function pinDropdown(pinName: string): Promise<By> {
  return By.css(`[data-test="accordion:${pinName}"]`);
}

export async function pinToggle(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(`[data-test="${peripheralName}-${signalName}-span"]`);
}

export async function pinConfigButton(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(
    `section[data-test="${peripheralName}-${signalName}"] > div[class*='configButtonContainer']`,
  );
}

export async function pinConfigContainer(
  peripheralName: string,
  signalName: string,
): Promise<By> {
  return By.css(`section[data-test="${peripheralName}-${signalName}"]`);
}

export async function signalToggleWithIndex(index: number): Promise<By> {
  return By.css(
    `#pin-details-signals-container > div:nth-child(${index}) > section > label`,
  );
}

export async function signalControlDropdown(signalName: string): Promise<By> {
  return By.css(`#${signalName}-control-dropdown`);
}

export async function signalConflictIcon(signalName: string): Promise<By> {
  return By.css(`div#signal-${signalName}-conflict`);
}

export async function mainPanelPinOnLineAndColumn(
  lineIndex: number,
  columnIndex: number,
): Promise<By> {
  return By.css(
    `#pin-rows-container > div:nth-child(${lineIndex}) > div:nth-child(${columnIndex}) > div:nth-child(1)`,
  );
}

/**
 * Assigns a peripheral pin to a signal in the UI and verifies the assignment by checking the 'data-checked' attribute.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param pinconfig - An object containing:
 *   @property peripheral - The name of the peripheral to assign (e.g., "OWM").
 *   @property signal - The name of the signal to assign the peripheral to (e.g., "OWM-IO").
 * @returns A Promise that resolves when the assignment and verification are complete.
 */
export async function assignPinToSignal(
  view: WebView,
  pinconfig: {
    peripheral: string;
    signal: string;
  },
): Promise<void> {
  const { peripheral, signal } = pinconfig;
  await UIUtils.clickElement(view, `accordion:${peripheral}`);
  const pinValue = await (
    await UIUtils.clickElement(view, `${signal}-span`)
  ).getAttribute("data-checked");
  expect(pinValue).to.equal("true");
}

/**
 * Asserts whether the specified peripherals are present or absent in the pin configuration UI.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param peripheralNames - An array of peripheral names to check for presence or absence.
 * @param shouldBePresent - If true, asserts that peripherals should be present; if false, asserts they should be absent. Defaults to true.
 * @returns A Promise that resolves when all peripheral assertions are complete.
 * @throws {AssertionError} If any peripheral's presence doesn't match the expected state.
 */
export async function assertPeripheralsPresent(
  view: WebView,
  peripheralNames: string[],
  shouldBePresent: boolean = true,
): Promise<void> {
  for (const name of peripheralNames) {
    const elements = await view.findWebElements(
      By.id(`pincfg-peripheral-${name}`),
    );

    if (shouldBePresent) {
      expect(
        elements.length,
        `Peripheral '${name}' should be present but was not found`,
      ).to.be.greaterThan(0);
    } else {
      expect(
        elements.length,
        `Peripheral '${name}' should not be present but was found`,
      ).to.equal(0);
    }
  }
}

/**
 * Clears the search field and enters new search text.
 *
 * @param searchField - The WebElement representing the search input field.
 * @param text - The text to enter into the search field.
 * @returns A Promise that resolves when the text has been entered.
 */
export async function clearAndSearch(
  searchField: WebElement,
  text: string,
): Promise<void> {
  await searchField.click();
  await searchField.sendKeys(Key.CONTROL + "a");
  await searchField.sendKeys(Key.DELETE);
  await searchField.sendKeys(text);
}

/**
 * Verifies that a filter element has the expected appearance state.
 *
 * @param filterName - The name of the filter to verify (e.g., "pins", "peripherals", "signals").
 * @param expectedAppearance - The expected appearance state: "primary" for active/selected filters, or "disabled" for inactive filters.
 * @returns A Promise that resolves when the filter state has been verified.
 * @throws {AssertionError} If the filter's actual appearance doesn't match the expected state.
 */
export async function verifyPinsFilterState(
  view: WebView,
  filterName: string,
  expectedAppearance: "primary" | "disabled",
): Promise<void> {
  const filter = await UIUtils.findWebElement(
    view,
    By.css(`[data-test="filter-control:${filterName}"]`),
  );

  if (expectedAppearance === "primary") {
    const appearance = await filter.getAttribute("appearance");
    expect(appearance, `${filterName} filter should be active`).to.equal(
      "primary",
    );
  } else {
    const className = await filter.getAttribute("class");
    expect(className, `${filterName} filter should be disabled`).to.contain(
      "disabled",
    );
  }
}

/**
 * Verifies that a specific peripheral-signal is mapped to the expected pin.
 *
 * The peripheral and signal are validated via the data-test selector
 * (section[data-test="<peripheral>-<signal>"]), and the pin is verified
 * from the section text (e.g. "P0.14 C1").
 */
export async function assertPeripheralSignalMappedToPin(
  view: WebView,
  peripheral: string,
  signal: string,
  pin: string,
): Promise<void> {
  const containerSelector = await pinConfigContainer(peripheral, signal);
  const container = await UIUtils.findWebElement(view, containerSelector);
  const text = (await container.getText()).replace(/\s+/g, " ").trim();

  expect(
    text,
    `Signal '${signal}' for peripheral '${peripheral}' should be mapped to pin '${pin}'`,
  )
    .to.include(signal)
    .and.to.include(pin);
}

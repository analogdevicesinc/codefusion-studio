/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
/**
 * ClockLocators
 *
 * Provides Selenium `By` locators and identifiers for
 * clock configuration UI elements (MUX, Divider, Pin Input, Peripheral).
 */
import { WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { By } from "selenium-webdriver";

export const formContainer: By = By.css("[data-test='clock-details:options']");

export const clockDiagram: By = By.css("#adi_diagram");

export const diagramContentNode: By = By.css(
  "#a86d8eb0-1766-11ef-a073-695fa460553d > rect.adi_diagram_content_node",
);

export const backButton: By = By.css(
  `[data-test='details-view:container'] > div`,
);

export const pinInputBox: By = By.css(
  "[data-test='P3_5_FREQ-P3.5-control-input']",
);

export function accordion(name: string): By {
  return By.css(`[data-test='accordion:${name}']`);
}

export function muxType(type: string): By {
  return By.css(`[data-test='${type} Mux']`);
}

export function option(value: string): By {
  return By.css(`vscode-option[value='${value}']`);
}

export function toggle(peripheral: string): By {
  return By.css(`[data-test='ENABLE-${peripheral}-span']`);
}

export const clockErrorSign: By = By.css("[data-test='clock-config-error']");

export const clockConfig: By = By.css("[data-test='nav-item:clockconfig']");

/**
 * Configures a clock MUX node in the UI by selecting the specified input and source option,
 * then verifies the selected value.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param configClockSource - An object containing:
 *   @property muxType - The name of the clock input to select (e.g., "ERTCO Mux").
 *   @property muxSource - The name of the clock source to select (e.g., "MUX-ERTCO Mux").
 *   @property muxSourceOption - The option value to verify (e.g., "ERTCO_CLK").
 * @returns A Promise that resolves when the configuration and verification are complete.
 */

export async function configureClockMUXSettings(
  view: WebView,
  configClockSource: {
    muxSource: string;
    muxType: string;
    muxSourceOption: string;
  },
): Promise<void> {
  const { muxType, muxSource, muxSourceOption } = configClockSource;
  await UIUtils.clickElement(view, accordion("MUX"));
  await UIUtils.clickElement(view, muxType);
  await UIUtils.clickElement(view, muxSource);
  const CLKValue = await (
    await UIUtils.clickElement(view, option(muxSourceOption))
  ).getAttribute("value");
  expect(
    CLKValue,
    `Expected CLKValue (${CLKValue}) not found for muxSourceOption (${muxSourceOption})`,
  ).to.include(muxSourceOption);

  await UIUtils.clickElement(view, backButton);
}

/**
 * Configures a clock pin input in the UI by selecting the specified pin and entering the frequency,
 * then verifies the entered value.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param pin - The name of the pin to select (e.g., "P0.23").
 * @param frequencyEntered - The frequency value to enter for the pin (e.g., "1000").
 * @returns A Promise that resolves when the configuration and verification are complete.
 */

export async function configureClockPinInputSettings(
  view: WebView,
  pin: string,
  frequencyEntered: string,
): Promise<void> {
  await UIUtils.clickElement(view, accordion("PIN INPUT"));
  await UIUtils.clickElement(view, pin);

  const freqValue = await (
    await UIUtils.sendKeysToElements(
      view,
      By.css(`[data-test='P0_23_FREQ-P0.23-control-input']`),
      frequencyEntered,
    )
  ).getAttribute("value");

  expect(
    `Expected freqValue (${freqValue}) not found for frequencyEntered (${frequencyEntered})`,
  ).to.include(frequencyEntered);
  await UIUtils.clickElement(view, backButton);
}

/**
 * Switches on the toggle for a specified peripheral in the clock configuration UI and navigates back.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param peripheral - The name of the peripheral to toggle (e.g., "I2S").
 * @returns A Promise that resolves when the toggle action and navigation are complete.
 */
export async function configureClockPeripheralSettings(
  view: WebView,
  peripheral: string,
): Promise<void> {
  await UIUtils.clickElement(view, accordion("PERIPHERAL"));
  await UIUtils.clickElement(view, peripheral);
  const checkedValue = await UIUtils.clickElement(view, toggle(peripheral));
  expect(
    await checkedValue.getAttribute("data-checked"),
    "The toggle not switched on",
  ).to.equal("true");
  await UIUtils.clickElement(view, backButton);
}

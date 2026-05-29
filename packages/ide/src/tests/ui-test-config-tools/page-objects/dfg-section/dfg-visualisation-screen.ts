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
/**
 * DFGVisualisationLocators
 *
 * Provides Selenium `By` locators and identifiers for
 * DFG visualisation UI elements (streams, buffers, destinations).
 */

import { By } from "selenium-webdriver";

import { UIUtils } from "../../../ui-test-utils/ui-utils";

import { WebView } from "vscode-extension-tester";

export const dfgSection: By = By.css("[data-test='nav-item:dfg']");

export const createStreamButton: By = By.css("#create-stream-button");

export const panelHeading: By = By.xpath("//h5[text()='STREAM OPTIONS']");

export const streamSourceDropdown: By = By.css("[data-test='stream-source']");

export const destinationDropDown: By = By.css(
  "[data-test='stream-destination']",
);

export const sourceStreamDropdownContent: By = By.css(
  "[data-test='tied-stream-dropdown-content']",
);

export function selectSourceOption(value: string): By {
  return By.xpath(`//vscode-option[@value='${value}']`);
}

export function streamDestination(value: string): By {
  return By.css(`[data-test='multiselect-option-${value}']`);
}

export const sourceBufferSizeSelection: By = By.css(
  "[data-test='Source-buffer-size-selector']",
);

export const sourceBufferValue = (value: string): By => {
  return By.css(`#Source_${value}`);
};

export const streamDescriptionInput: By = By.css(
  "[data-test='stream-alias-control-input']",
);
export const createGroupAction: By = By.css(
  "[data-test='create-group-action']",
);

export const groupNameTextbox: By = By.css(
  "[data-test='new-group-name-input-control-input']",
);

export const groupDropdown: By = By.css(
  "button[data-test='group_dropdownbutton']",
);

export const destinationDropdown: By = By.css(
  "[id='Destinations-controlDropdown']",
);

export const tiedStreamDropdown: By = By.css(
  "[data-test='tied-stream-dropdown']",
);

export const createStreamSidePanelButton: By = By.css(
  "#sidepanel-create-stream",
);

// DFG Visualization navigation and view controls
export const dfgVisualisationButton: By = By.css(
  "[data-test='subscreen-button:dfgVisualisation']",
);

export const viewDropdownContainer: By = By.css(
  "[data-test='dfg:view-dropdown-container']",
);

export const groupViewOption: By = By.css(
  "[data-test='view-dropdown-option-group']",
);

export const gasketViewOption: By = By.css(
  "[data-test='view-dropdown-option-gasket']",
);

export function groupAccordion(groupName: string): By {
  return By.css(`[data-test='accordion:${groupName}']`);
}

export function gasketAccordion(gasketName: string): By {
  return By.css(`[data-test='accordion:${gasketName}']`);
}

export const streamDescription: By = By.css(
  "[data-test^='stream-'][data-test$='-description']",
);

/**
 * Opens a sidebar by clicking a button and returns the verification element.
 * @param view - The WebView instance to interact with
 * @param buttonSelector - The selector for the button to click
 * @param verificationSelector - The selector for the element that should appear when sidebar opens
 * @returns The verification element for further assertions in the caller
 */
export async function openSidebar(
  view: WebView,
  buttonSelector: By,
  verificationSelector: By,
) {
  await UIUtils.clickElement(view, buttonSelector);
  return UIUtils.waitForElement(view, verificationSelector);
}

/**
 * Selects a source option from a dropdown and returns the selected value for assertion in the caller.
 * @param view - The WebView instance to interact with
 * @param dropdownSelector - The selector for the dropdown element
 * @param optionSelector - The selector for the option to select within the dropdown
 * @param attributeName - The attribute name to read the selected value from (defaults to "current-value")
 * @returns The actual selected value for further assertions in the caller
 */
export async function selectSource(
  view: WebView,
  dropdownSelector: By,
  optionSelector: By,
  attributeName = "current-value",
) {
  await UIUtils.selectOptionFromDropdown(
    view,
    dropdownSelector,
    optionSelector,
  );
  const selectedElement = await UIUtils.findWebElement(view, dropdownSelector);
  return UIUtils.getAttributeFromWebElement(selectedElement, attributeName);
}

/**
 * Selects multiple destination options from a multi-select dropdown and returns the option
 * visibility states for assertion in the caller.
 * @param view - The WebView instance to interact with
 * @param dropdownSelector - The selector for the multi-select dropdown element
 * @param optionSelectors - Array of selectors for the options to select within the dropdown
 * @returns Array of selected option visibility states in the same order as optionSelectors
 */
export async function selectMultipleDestinations(
  view: WebView,
  dropdownSelector: By,
  optionSelectors: By[],
) {
  await UIUtils.clickElement(view, dropdownSelector);
  for (const optionSelector of optionSelectors) {
    await UIUtils.clickElement(view, optionSelector);
  }
  const selectedOptionsVisible = await Promise.all(
    optionSelectors.map((optionSelector) =>
      UIUtils.findWebElement(view, optionSelector).then((option) =>
        option.isDisplayed(),
      ),
    ),
  );
  await UIUtils.clickElement(view, dropdownSelector);
  return selectedOptionsVisible;
}

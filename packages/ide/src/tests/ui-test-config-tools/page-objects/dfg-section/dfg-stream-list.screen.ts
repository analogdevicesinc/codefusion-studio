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
 * DFGStreamListLocators
 *
 * Provides Selenium `By` locators and identifiers for
 * DFG stream list UI elements (streams, buffers, destinations).
 */

import { By } from "selenium-webdriver";

// Stream table validation selectors
export function tableCellByText(text: string): By {
  return By.xpath(`//vscode-data-grid-cell[text()='${text}']`);
}

export const destinationBufferValue = (value: string): By => {
  return By.css(`#Destinations_${value}`);
};

export function streamRow(source: string, destination: string): By {
  return By.xpath(
    `//vscode-data-grid-row[.//vscode-data-grid-cell[text()='${source}'] and .//vscode-data-grid-cell[text()='${destination}']]`,
  );
}

//  edit button for a specific stream row with description for unique identification
export function streamRowEditButtonWithDescription(
  source: string,
  destination: string,
  description: string,
): By {
  return By.xpath(
    `//vscode-data-grid-row[.//vscode-data-grid-cell[text()='${source}'] and .//vscode-data-grid-cell[text()='${destination}'] and .//vscode-data-grid-cell[text()='${description}']]//vscode-button[@appearance='icon']`,
  );
}

// Validate stream properties by finding row with source and checking other cells
export function validateStreamProperty(
  source: string,
  propertyValue: string,
): By {
  return By.xpath(
    `//vscode-data-grid-row[.//vscode-data-grid-cell[text()='${source}']]//vscode-data-grid-cell[text()='${propertyValue}']`,
  );
}

export const streamList: By = By.css(
  "[data-test='subscreen-button:dfgStreamList']",
);

export const exportAsCsvButton: By = By.css("[data-test='export-as-csv']");

// Filter controls
export const sourceFilterButton: By = By.css(
  "[data-test='dfg-source-filter'] button",
);

export const destinationFilterButton: By = By.css(
  "[data-test='dfg-destination-filter'] button",
);

export const groupFilterButton: By = By.css(
  "[data-test='dfg-group-filter'] button",
);

// Multiselect option locators
export function sourceMultiselectOption(source: string): By {
  return By.css(`[data-test='multiselect-option-${source}']`);
}

export function destinationMultiselectOption(destination: string): By {
  return By.css(`[data-test='multiselect-option-${destination}']`);
}

export function groupMultiselectOption(group: string): By {
  return By.css(`[data-test='multiselect-option-${group}']`);
}

// Stream table and grid
export const streamTableGrid: By = By.css("[data-test='stream-table-grid']");

// Search input
export const searchInput: By = By.css(
  "[data-test='dfg-search-input-control-input']",
);

// Row locators
export function streamRowByGroup(group: string): By {
  return By.xpath(
    `//vscode-data-grid-row[.//vscode-data-grid-cell[text()='${group}']]`,
  );
}

// Clear all filters button
export const clearAllFiltersButton: By = By.css(
  "[data-test='dfg-clear-all-filters']",
);

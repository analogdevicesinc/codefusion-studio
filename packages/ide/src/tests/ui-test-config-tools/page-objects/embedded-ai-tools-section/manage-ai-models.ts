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

/* This file contains page object locators and functions for managing AI models in the embedded AI tools section. */

import { By } from "vscode-extension-tester";

export const homePageTitle = By.css("div[class*='_socDetailsContainer'] h1");
export const manageAiModelsTab = By.css("[data-test='nav-item:aitools']");
export const addModel = By.xpath(
  " //vscode-button[contains(text(),'Add Model')]",
);
export const modelTargetDropdown = By.css(
  "[data-test='model-target-dropdown']",
);
export const modelTargetOption = By.css("[id='target_CM4::tflm']");
export const modelNameInput = By.css("[data-test='model-name-control-input']");
export const modelFileBrowseButton = By.xpath(
  "//vscode-text-field[@data-test='model-file-control-input']//vscode-button[contains(text(),'Browse')]",
);
export async function modelFileInput(modelFileName: string): Promise<By> {
  return By.xpath(`//h3[contains(text(),'${modelFileName}')]`);
}
export const useSelectedModelButton = By.css(
  "[data-test='model-zoo-use-model']",
);
export const memorySectionData = By.css(
  "[data-test='model-config-form:control-Section-control-input']",
);
export const symbolData = By.css(
  "[data-test='model-config-form:control-Symbol-control-input']",
);
export const arenaSizeModel = By.css(
  "[data-test='model-config-form:control-ArenaSize-control-input']",
);
export const memorySectionArena = By.css(
  "[data-test='model-config-form:control-ArenaSection-control-input']",
);
export const memorySectionDataset = By.css(
  "[data-test='model-config-form:control-DatasetSection-control-input']",
);
export const modelDatasetFileInput = By.css(
  "[data-test='model-dataset-file-control-input']",
);
export const modelSaveButton = By.css("[data-test='model-save-button']");
export function gridCellValue(row: number, column: number): By {
  return By.css(
    `vscode-data-grid-row:nth-child(${row}) vscode-data-grid-cell[grid-column="${column}"]`,
  );
}

export function editButton(modelName: string): By {
  return By.xpath(
    `(//vscode-data-grid-row[.//vscode-data-grid-cell[@grid-column='1'][normalize-space(.)='${modelName}']]//vscode-data-grid-cell[@grid-column='5']//vscode-button)[2]`,
  );
}

export function deleteButton(modelName: string): By {
  return By.xpath(
    `(//vscode-data-grid-row[.//vscode-data-grid-cell[@grid-column='1'][normalize-space(.)='${modelName}']]//vscode-data-grid-cell[@grid-column='5']//vscode-button)[3]`,
  );
}

export function includeToggle(modelName: string): By {
  return By.xpath(`//span[@data-test='include-toggle-${modelName}-span']`);
}

export const profileReport = By.css("[data-test='report-action']");

// Confirm button of the in-webview ConfirmDialog shown before deleting a model
export const deleteModelConfirmButton = By.xpath(
  "//vscode-button[contains(text(),'Confirm')]",
);

export function compatibilityState(modelName: string): By {
  return By.xpath(
    `//vscode-data-grid-row[.//vscode-data-grid-cell[@grid-column='1'][normalize-space(.)='${modelName}']]//vscode-data-grid-cell[@data-test="compatibility-column"]//*[@id="Success"]`,
  );
}

export const platformDropdown = By.css("[data-test='model-zoo-soc-filter']");

export function platformOption(optionText: string): By {
  return By.css(`[data-test="multiselect-option-${optionText}"]`);
}

export const modelNameError = By.css("[data-test='model-name-error']");

export const modelFileError = By.css("[data-test='model-file-error']");

export const symbolError = By.css(
  "[data-test='model-config-form:control-Symbol-error']",
);

export const arenaSizeError = By.css(
  "[data-test='model-config-form:control-ArenaSize-error']",
);

export const profileSummarySection = By.css(
  "[data-test='profile-summary-section']",
);

export const downArrowButton = By.css("vscode-button[class*='downArrow']");

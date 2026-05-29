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

import { By } from "vscode-extension-tester";

export const pinmuxSearchBox: By = By.css(`[data-test="search-control-input"]`);

export const pinmuxSearchFilterControlsContainer: By = By.css(
  `[data-test="pinmux-search:filterControlsContainer"]`,
);

export async function pinmuxFilterControls(controlsName: string): Promise<By> {
  return By.css(`[data-test="filter-control:${controlsName}"]`);
}

export async function pinmuxFilterControlsText(
  controlsName: string,
): Promise<By> {
  return By.css(`[data-test="filter-control:${controlsName}"]>div`);
}

export const pinmuxSearchResultsList: By = By.css(
  `[class*="resultsContainer"] [class*="searchResult"]`,
);

export async function pinmuxSearchResults(result: string): Promise<By> {
  return By.css(`[data-test*="search-result-${result}"]`);
}

export const pinmuxSearchClearButton: By = By.css(
  `[data-test="search-control-input"] vscode-button`,
);

export const pinmuxAssignedFilter: By = By.css(
  `[data-test="filter-control:assigned"]`,
);

export async function pinmuxToggleControl(controlName: string): Promise<By> {
  return By.css(`[data-test="${controlName}-span"]`);
}

export const pinmuxBackButton: By = By.xpath('//span[contains(text(),"Back")]');

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

import { By } from "vscode-extension-tester";

// ── Static selectors ────────────────────────────────────────────────────────

export const criticalErrorHeader: By = By.css(
  '[data-test="8-column-layout-header"]',
);

export const continueBtn: By = By.css(
  '[data-test="version-update:continue-btn"]',
);

export const systemPlannerButton: By = By.css(
  '[data-test="version-update:continue-to-system-planner-btn"]',
);

export const futureVersionCheckbox: By = By.xpath(
  '//vscode-checkbox[normalize-space(.)="Allow all future compatible versions"]',
);

export const missingPluginLabel: By = By.xpath(
  "//*[@id=':r0:']//div[contains(text(),'Missing Plugin')]",
);

export const peripheralCard: By = By.css('[data-test="peripheral-card"]');

export const troubleshootingLink: By = By.css(
  'vscode-link[href*="install-required"]',
);

// ── Dynamic selectors (component-id scoped) ──────────────────────────────────

export function pluginCompleteState(pluginId: string): By {
  return By.css(`[data-test="${pluginId}:complete-state"]`);
}

export function pluginDropdown(pluginId: string): By {
  return By.css(`[id="component-resolution-${pluginId}-controlDropdown"]`);
}

export function installLocallyAvailableVersionOption(pluginId: string): By {
  return By.css(`[id="component-resolution-${pluginId}_UPDATE_CFS_FILE"]`);
}

export function pluginNameLabel(pluginId: string): By {
  return By.xpath(`//span[contains(text(),'${pluginId}')]`);
}

export const homePageTitle = By.css(
  "div[class*='_dashboardLeftPanel'] div[class*='_socDetailsContainer'] h1",
);

export const headerCss = By.css(
  'div[class*="_configurationToolsContainer"] h2',
);

export const resolutionContainer = By.css('div[class*="_resolutionContainer"]');

export const missingDataModelLabel = By.xpath(
  "//div[contains(text(),'Missing Data Model')]",
);

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

// Will require some cleanup in the future

import { By, WebElement } from "vscode-extension-tester";
import { WebView } from "vscode-extension-tester";
import { UIUtils } from "../../ui-test-utils/ui-utils";
import { expect } from "chai";

export const sideCoresConfiguration: By = By.xpath(
  " //h6[contains(@class, 'stepTitle') and contains(text(), 'CORES & CONFIGURATION')]",
);

export const getCoresProjectNumbers = (coreCount: number): By => {
  return By.xpath(
    `//span[contains(@class, 'stepDescription') and contains(text(), '${coreCount} Core Projects')]`,
  );
};

export const armCoreDefaultSelection: By = By.css(
  "[data-test='cores-selection:corepart_01jrdgezp9eeya9367snjddfbn-card:checkbox']",
);

export const dataActiveStepCircle: By = By.css("[data-active='true']");

export const getTrustZoneBadge = (index: number): By => {
  return By.css(`[data-test='wizard-stepper:badge-container:${index}']`);
};

/**
 * Verifies that a TrustZone badge exists and contains the expected text
 * @param view - The WebView instance to search within
 * @param badge - The badge type to verify: "S" for Secure (index 0) or "NS" for Non-Secure (index 1)
 * @throws {Error} If the badge element is not found or doesn't contain the expected text
 * @returns Promise<void> - Resolves when verification is complete
 * @example
 * ```typescript
 *  Verify Secure badge exists and shows "S"
 * await verifyTrustZoneBadges(view, "S");
 *
 *  Verify Non-Secure badge exists and shows "NS"
 * await verifyTrustZoneBadges(view, "NS");
 * ```
 */
export async function verifyTrustZoneBadges(
  view: WebView,
  badge: "S" | "NS",
): Promise<void> {
  // Map badge type to index: 0 = S (Secure), 1 = NS (Non-Secure)
  const badgeIndex = badge === "S" ? 0 : 1;

  const trustzoneBadge = await UIUtils.clickElement(
    view,
    getTrustZoneBadge(badgeIndex),
  );
  const trustzoneBadgeText = await trustzoneBadge.getText();
  console.log(`TrustZone Badge Text ${badge}:`, trustzoneBadgeText);
  expect(
    trustzoneBadgeText,
    ` to contain '${badge}' but got '${trustzoneBadgeText}'`,
  ).to.include(badge);

  console.log(`✓ ${badge} badge verified successfully`);

  console.log("TrustZone badges verified successfully");
}

/**
 * Verifies that the project count displays the expected number of core projects
 * @param view - The WebView instance to search within
 * @param expectedCount - The expected number of core projects to verify
 * @throws {Error} If the project count element is not found or doesn't contain the expected count
 * @returns Promise<void> - Resolves when verification is complete
 * @example
 * ```typescript
 * Verify that 1 core project is displayed
 * await verifyProjectCount(view, 1);
 *
 * Verify that 2 core projects are displayed (e.g., with TrustZone enabled)
 * await verifyProjectCount(view, 2);
 * ```
 */
export async function verifyProjectCount(
  view: WebView,
  expectedCount: number,
): Promise<void> {
  const projectCountElement = await UIUtils.findWebElement(
    view,
    getCoresProjectNumbers(expectedCount),
  );
  const actualText = await projectCountElement.getText();

  expect(
    actualText,
    `Project count verification failed: Expected text to include '${expectedCount}' but got '${actualText}'`,
  ).to.include(expectedCount.toString());

  console.log(`✓ Project count verified: ${actualText}`);
}

/**
 * Verifies that the active step circle is active on a given screen.
 * @param view The WebView instance.
 * @param selector The selector for the active step circle element.
 * @param screenName The name of the screen being verified (for logging).
 * @returns A Promise that resolves to the active step circle WebElement.
 * @throws Error if the element's data-active attribute is not "true".
 */
export async function verifyActiveStepCircle(
  view: WebView,
  selector: By | string,
  screenName: string,
): Promise<WebElement> {
  const element = await UIUtils.clickElement(view, selector);
  const isActive = await element.getAttribute("data-active");

  if (isActive !== "true") {
    throw new Error(
      `Active step circle verification failed for ${screenName}: Expected data-active='true' but got '${isActive}'`,
    );
  }

  console.log(`Verified active step circle for ${screenName}`);
  return element;
}

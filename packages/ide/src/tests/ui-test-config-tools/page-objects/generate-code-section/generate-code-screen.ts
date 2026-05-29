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

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { By, WebView, Workbench } from "vscode-extension-tester";
import { expect } from "chai";

export const rVCheckbox: By = By.css(
  "[data-test='generate-code:core:RV:checkbox']",
);

export const generateCodeButton: By = By.css(
  "[data-test='generate-code:generate-btn']",
);

export const generatedFilesList: By = By.css(
  "[data-test='generated-files:list-container'] > li",
);

export const overwriteButton: By = By.css(
  '[data-test="generate-code:modal:overwrite"]',
);

export function getErrorSignal(projectId: string): By {
  return By.css(`[data-test='valid-status:${projectId}:error-state']`);
}

export function getReadySignal(projectId: string): By {
  return By.css(`[data-test='valid-status:${projectId}:ready-state']`);
}

export function errorContainerSelector(projectId: string): By {
  return By.css(
    `[data-test='cfsSelectionCard:${projectId}:content:errors-container']`,
  );
}

// Helper function to dismiss the overwrite modal if it appears
export async function dismissOverwriteModal(view: WebView): Promise<void> {
  try {
    const dismissBtn = await UIUtils.findWebElement(
      view,
      overwriteButton,
    ).catch(() => null);

    if (dismissBtn) {
      await dismissBtn.click();
      await UIUtils.sleep(3000);
      console.log("Dismissed overwrite modal");
    }
  } catch (_) {
    console.warn("no dismiss button found");
  }
}

/**
 * Triggers code generation in the UI, saves the current file, clicks the generate button,
 * dismisses the overwrite modal if present, and verifies that the generated files list contains "Generating".
 *
 * @param view - The WebView instance representing the current UI context.
 * @param wb - The Workbench instance used to execute save commands.
 * @returns A Promise that resolves when the code generation process and verification are complete.
 */
export async function generateCode(
  view: WebView,
  wb: Workbench,
): Promise<void> {
  await view.switchBack();
  console.log("Switched back to workbench");

  // Save the file via Workbench API to ensure latest changes are written
  await wb.executeCommand("workbench.action.files.save");
  console.log("Saved the file");

  // Switch back to WebView frame for UI interaction
  await view.switchToFrame();
  console.log("Switched to the WebView frame");

  // Click generate button and dismiss any overwrite modal
  await UIUtils.clickElement(view, generateCodeButton);
  await dismissOverwriteModal(view);
  console.log("Files are getting generated");
  /**
   * Waits for the generated files list to appear, extracts and normalizes the text content,
   * groups the items (assuming 3 elements per file entry), and verifies that each grouped
   * entry starts with "Generating" and ends with "OK".
   *
   * @param view - The WebView instance representing the current UI context.
   * @param generatedFilesList - The By selector for the generated files list container.
   * @throws {AssertionError} If any grouped text does not start with "Generating" or end with "OK".
   */
  await UIUtils.waitForElement(view, generatedFilesList);

  const generatedFilesListItems: string[] =
    await UIUtils.getTextFromWebElements(view, generatedFilesList);
  /**
   * The generated files list contains items with multiple lines and extra whitespace.
   * Example item format:
   *   "Generating\n   filename.ext\n   OK"
   * The regex below replaces any newline (and surrounding whitespace) with a single space,
   * so each item becomes a single line: "Generating filename.ext OK".
   */
  // Normalize whitespace and line breaks in each item as each text is different element though on UI it looks like single line
  const generatedFilesText = generatedFilesListItems.map((text) =>
    text.replace(/\s*\n\s*/g, " ").trim(),
  );
  console.log("Normalized items after removing spaces", generatedFilesText);
  // Group  text elements as items
  const grouped: string[] = [];
  for (let i = 0; i < generatedFilesText.length; i += 3) {
    grouped.push(
      `${generatedFilesText[i]} ${generatedFilesText[i + 1]} ${generatedFilesText[i + 2]}`.trim(),
    );
  }

  // Now assertion works with grouped text
  expect(
    grouped.every(
      (text) => text.startsWith("Generating") && text.endsWith("OK"),
    ),
  ).to.be.true;

  console.log("files generation verified");
}

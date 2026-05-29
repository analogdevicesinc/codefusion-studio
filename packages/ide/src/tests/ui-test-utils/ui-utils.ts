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

import {
  By,
  VSBrowser,
  WebElement,
  WebView,
  Workbench,
  until,
} from "vscode-extension-tester";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";

const execAsync = promisify(exec);

export class UIUtils {
  /**
   * Waits for an element in WebView and clicks it.
   * Uses a Selenium `By` selector with the `findWebElement` method.
   * @param view The WebView instance.
   * @param selector The Selenium By selector to locate the element.
   * @param timeout Timeout between retries in milliseconds. Default is 1000ms.
   * @param retries Number of retries to find and click the element. Default is 3.
   * @param wait Time to wait after clicking the element in milliseconds. Default is 1500ms.
   * @returns A Promise resolving to the clicked WebElement.
   * @throws Error if the element cannot be found after the specified retries.
   */

  static async clickElement(
    view: WebView,
    selector: By | string | WebElement,
    timeout = 1000,
    retries = 3,
    wait = 1500,
  ): Promise<WebElement> {
    // Retry logic to handle stale elements and transient click failures
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        let el: WebElement;

        if (typeof selector === "string") {
          // Use dataTest helper for data-test selectors
          el = await UIUtils.dataTest(view, selector, retries);
        } else if (selector instanceof By) {
          el = await UIUtils.findWebElement(view, selector, retries);
        } else {
          el = selector;
        }

        await el.click();

        if (typeof selector === "string" || selector instanceof By) {
          console.log(`Clicked element with selector: ${selector.toString()}`);
        } else {
          console.log(
            `Clicked element with data-test: ${await el.getAttribute("data-test")}`,
          );
        }

        // Wait after click to allow UI to respond
        await UIUtils.sleep(wait);

        return el;
      } catch (error: unknown) {
        if (attempt < retries - 1) {
          if (error instanceof Error) {
            console.log(
              `Click interaction for element with selector ${selector.toString()} failed, retrying... (attempt ${attempt + 1}/${retries})`,
            );
          }

          await UIUtils.sleep(timeout);
          continue;
        } else {
          let errorMessage = `Failed to click element with selector ${selector.toString()} after ${retries} attempts.`;

          if (error instanceof Error) {
            errorMessage += ` Last error: ${error.message}`;
          }

          throw new Error(errorMessage);
        }
      }
    }

    throw new Error(
      `Failed to click element with selector ${selector.toString()} after ${retries} attempts.`,
    );
  }

  /**
   * Finds an element in the Workbench and clicks it.
   * @param workbench The Workbench instance.
   * @param selector The selector to find the element.
   * @returns A Promise that resolves to the clicked WebElement.
   */
  static async clickElementworkbench(workbench: Workbench, selector: By) {
    const el = await workbench.findElement(selector);
    await el.click();
    await UIUtils.sleep(10000);
    return el;
  }

  /**
   * Selects an option from a dropdown inside a VS Code WebView.
   * @param {WebView} view - The WebView providing access to the underlying WebDriver.
   * @param {By} dropdownLocator - Selenium locator for the dropdown trigger element.
   * @param {By} optionLocator - Selenium locator for the option to select.
   * @returns {Promise<void>} Resolves when the option has been clicked (or throws on failure).
   **/
  static async selectOptionFromDropdown(
    view: WebView,
    dropdownLocator: By,
    optionLocator: By,
    retries = 3,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      await UIUtils.clickElement(view, dropdownLocator);
      try {
        const el = await UIUtils.findWebElement(view, optionLocator, retries);
        const isDisplayed = await el.isDisplayed();
        await UIUtils.clickElement(view, optionLocator);
        if (isDisplayed) {
          break;
        }
      } catch (e) {
        if (i === retries - 1) {
          throw new Error(
            `Element not visible after ${retries} retries: ${optionLocator.toString()}`,
          );
        }

        console.log(`Element not visible, retrying (${i + 1}/${retries})...`);
        await UIUtils.clickElement(view, dropdownLocator);
        await UIUtils.waitForElementToBeVisible(view, optionLocator);
        await UIUtils.clickElement(view, optionLocator);
      }
    }
  }

  /**
   *
   * @param view Webview instance
   * @param selector Selenium By selector
   * @param timeout Time to wait for the element (in milliseconds). Default is 6000ms.
   * @returns
   */
  static async waitForElement(view: WebView, selector: By, timeout = 6000) {
    const driver = view.getDriver();
    return driver.wait(until.elementLocated(selector), timeout);
  }

  /**
   * Waits until the element located by {@link selector} is **visible** inside the given WebView.
   * @param {WebView} view - VS Code WebView wrapper that provides the underlying WebDriver.
   * @param {By} selector - Selenium locator for the target element.
   * @param {number} [timeout=6000] - Maximum time to wait, in milliseconds.
   * @returns {Promise<WebElement>} Promise that resolves to the visible element.
   **/
  static async waitForElementToBeVisible(
    view: WebView,
    selector: By,
    timeout: number = 6000,
  ): Promise<WebElement> {
    const driver = view.getDriver();
    return driver.wait(
      until.elementIsVisible(await this.findWebElement(view, selector)),
      timeout,
    );
  }

  /**
   * Wait until the element located by `selector` has visible text that **contains** `text`.
   *
   * @param {WebView} view - The webview providing access to the underlying WebDriver.
   * @param {By} selector - Selenium locator for the target element.
   * @param {string} text - Substring expected to appear in the element’s visible text.
   * @param {number} [timeout=6000] - Maximum time to wait in milliseconds.
   * @returns {Promise<boolean>} Resolves to `true` when the condition is met.
   */
  static async waitForElementToContainVisibleText(
    view: WebView,
    selector: By,
    text: string,
  ) {
    const driver = view.getDriver();
    const element = await this.findWebElement(view, selector);

    return driver.wait(until.elementTextIs(element, text));
  }

  /**
   * Finds an element in the WebView.
   * @param view The WebView instance.
   * @param selector The selector to find the element.
   * @returns A Promise that resolves to the found WebElement.
   */
  static async findelementtosearch(view: WebView, selector: By) {
    const el = await view.findElement(selector);
    await UIUtils.sleep(2000);
    return el;
  }

  /**
   * Finds a WebElement in the WebView with retry logic.
   * @param view The WebView instance.
   * @param selector The selector to find the element.
   * @param retries The number of times to retry finding the element. Default is 3.
   * @returns A Promise that resolves to the found WebElement.
   * @throws Error if the element cannot be found after the specified retries.
   */
  static async findWebElement(
    view: WebView,
    selector: By,
    retries = 3,
  ): Promise<WebElement> {
    let el: WebElement | null = null;
    for (let i = 0; i < retries; i++) {
      try {
        el = await view.findWebElement(selector);
        if (el) {
          break;
        }
      } catch (_) {
        if (i === retries - 1) {
          throw new Error(
            `Element ${selector.toString()} not found after ${retries} retries: ${selector.toString()}`,
          );
        }

        console.log(
          `Element ${selector.toString()} not found, retrying (${i + 1}/${retries})...`,
        );

        await UIUtils.sleep(1000); // 1-second delay
      }
    }

    if (!el) {
      throw new Error(
        `Element not found after ${retries} retries: ${selector.toString()}`,
      );
    }

    console.log(`Found element with selector: ${selector.toString()}`);
    return el;
  }

  /**
   * Finds the first element matching the selector and returns its visible text.
   *
   * @param view - VS Code webview wrapper that provides the WebDriver instance.
   * @param selector - Selenium locator for the target element.
   * @returns Promise that resolves to the element's visible text.
   * @throws If the element cannot be located or becomes stale before reading text.
   */
  static async getTextFromWebElement(view: WebView, selector: By) {
    const element: WebElement = await this.findelementtosearch(view, selector);
    const text: string = await element.getText();
    console.log(`Found element with text: ${text}`);

    return text;
  }

  /**
   * Returns visible text for all elements matching the selector, in DOM order.
   *
   * @param view - VS Code webview wrapper that provides the WebDriver instance.
   * @param selector - Selenium locator for the target elements.
   * @returns Promise that resolves to an array of texts (empty if no elements match).
   * @throws If locating elements fails or any element becomes stale while reading.
   */
  static async getTextFromWebElements(view: WebView, selector: By) {
    const elements: WebElement[] = await view.findWebElements(selector);
    const texts = await Promise.all(elements.map((r) => r.getText()));
    console.log(`Found elements with texts: ${texts}`);

    return texts.length ? texts[0].split("\n") : [];
  }

  /**
   * Convenience wrapper: locates an element by selector and returns its specific attribute value
   * using {@link UIUtils.getAttributeFromWebElement}.
   *
   * @param view - VS Code webview wrapper providing the WebDriver instance.
   * @param selector - Selenium locator for the target element.
   * @param attribute - The type of attribute that is read.
   * @returns Promise that resolves to the element's current value string.
   * @throws If the element cannot be located.
   */
  static async getAttributeFromWebElementBy(
    view: WebView,
    selector: By,
    attribute: string,
  ) {
    const element: WebElement = await this.findWebElement(view, selector);

    return UIUtils.getAttributeFromWebElement(element, attribute);
  }

  /**
   * Reads a specific attribute from a given element.
   *
   * @param element - The element whose attribute is read.
   * @param attribute - The type of attribute that is read.
   * @returns Promise that resolves to the attribute value (empty string if missing).
   */
  static async getAttributeFromWebElement(
    element: WebElement,
    attribute: string,
  ) {
    const attributeValue: string = await element.getAttribute(attribute);
    console.log(`Found element with ${attribute} attribute: ${attributeValue}`);

    return attributeValue;
  }

  /**
   * Finds a WebElement in the WebView and sends keys to it.
   * @param view The WebView instance.
   * @param selector The selector to find the element.
   * @param keys The keys to send to the element.
   * @param timeout The time to wait after sending keys (in milliseconds). Default is 5000ms.
   * @param retries The number of times to retry finding the element. Default is 3.
   * @returns A Promise that resolves to the WebElement to which keys were sent.
   * @throws Error if the element cannot be found after the specified retries.
   */
  static async sendKeysToElements(
    view: WebView,
    selector: By,
    keys: string,
    timeout = 5000,
    retries = 3,
  ) {
    const el = await UIUtils.findWebElement(view, selector, retries);

    await el.sendKeys(keys);
    await UIUtils.sleep(timeout);

    console.log(
      `Sent keys "${keys}" to element with selector: ${selector.toString()}`,
    );

    return el;
  }

  /**
   * Pauses execution for a specified number of milliseconds.
   * @param ms The number of milliseconds to sleep.
   * @returns A Promise that resolves after the specified time.
   */
  static async sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Dismisses all notifications in the Workbench and a specific C/C++ extension toast if present.
   * @param wb The Workbench instance.
   * @param browser The VSBrowser instance.
   * @param timeout Optional implicit wait for notifications to appear (milliseconds). Default is 5000ms.
   * @returns A Promise that resolves when all dismiss actions are attempted.
   */
  static async dismissAllNotifications(
    wb: Workbench,
    browser: VSBrowser,
    timeout = 5000,
  ) {
    const driver = browser.driver;

    // Wait for notifications to be displayed
    try {
      await driver.wait(async () => {
        const notifications = await wb.getNotifications();
        return notifications.length >= 0;
      }, timeout);
    } catch (_) {
      console.log("Notification wait timeout");
    }

    await wb.getNotifications().then(async (notifications) => {
      await Promise.all(
        notifications.map(async (notification) => {
          await new Promise((resolve) => {
            notification.dismiss().then(() => {
              resolve("closed");
            });
          });
        }),
      );
    });

    try {
      const cExtensionToast = await browser.driver.findElement(
        By.xpath('//*[@id="list_id_1_0"]/div[1]/div[1]/div[2]/a[2]'),
      );

      // Dismisses the c extension toast notification
      if (cExtensionToast) {
        await cExtensionToast.click();
        console.log("C Extension toast dismissed");
      } else {
        console.log("No C Extension toast found");
      }
    } catch (_) {
      console.log("No C Extension toast to dismiss");
    } finally {
      await this.sleep(5000);
    }
  }

  /**
   * Finds a WebElement in the WebView using a `data-test` attribute.
   * @param view The WebView instance.
   * @param selector The value of the `data-test` attribute.
   * @param retries The number of times to retry finding the element. Default is 3.
   * @returns A Promise that resolves to the found WebElement.
   * @throws Error if the element with the specified `data-test` attribute cannot be found after the specified retries.
   */
  static async dataTest(
    view: WebView,
    selector: string,
    retries = 3,
  ): Promise<WebElement> {
    const el = await UIUtils.findWebElement(
      view,
      By.css(`[data-test='${selector}']`),
      retries,
    );

    // Error handling and logging are included in the findWebElement method.
    return el;
  }

  static async scrollToView(workbench: Workbench, scrollContainer: WebElement) {
    await workbench
      .getDriver()
      .executeScript(
        "arguments[0].scrollTop = arguments[0].scrollHeight",
        scrollContainer,
      );
  }

  /**
   * Restores a fixture file to its state on the current PR branch (HEAD).
   * This utility respects any changes committed to the fixture file as part of a PR,
   * while reverting modifications made during test execution.
   *
   * @param filePath The relative path to the fixture file from the repository root.
   * @returns A Promise that resolves when the restoration is complete.
   *          If the file was modified during the test, it's restored.
   *          If the file matches HEAD (no test modifications), it's left unchanged.
   *          If git fails, restoration is skipped gracefully.
   *
   * @example
   * afterEach(async () => {
   *   await UIUtils.restoreFixtureFileFromGit(
   *     'path/to/some-mocked.cfsconfig'
   *   );
   * });
   */
  static async restoreFixtureFileFromGit(filePath: string): Promise<void> {
    try {
      // Git needs repository-relative path, prepend packages/ide/ if needed
      const gitPath = filePath.startsWith("packages/ide/")
        ? filePath
        : `packages/ide/${filePath}`;

      // Get baseline from the current branch HEAD
      const { stdout: headContent } = await execAsync(
        `git show HEAD:"${gitPath}"`,
        { encoding: "utf-8" },
      );

      // Read current file content
      const currentContent = await readFile(filePath, "utf-8");

      // Restore only if test modified the file
      if (headContent !== currentContent) {
        await writeFile(filePath, headContent);
        console.log(`Restored fixture file: ${filePath}`);
      }
    } catch (error) {
      console.warn(
        `Could not restore fixture ${filePath}. This may be normal if the file is new to this PR. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Gracefully skip if git fails (e.g., file not in HEAD)
    }
  }
}

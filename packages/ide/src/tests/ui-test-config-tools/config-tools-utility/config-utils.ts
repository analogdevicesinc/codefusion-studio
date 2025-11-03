/* eslint-disable no-unused-vars */
/* eslint-disable no-dupe-class-members */
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
import * as fs from "fs";
import {
  signalConfigSidebarContainer,
  panelContainer,
} from "../page-objects/pin-config-section/signal-config-sidebar";

export class UIUtils {
  /**
   * Waits for an element in WebView and clicks it.
   * Uses a Selenium `By` selector with the `findWebElement` method.
   * @param view The WebView instance.
   * @param selector The Selenium By selector to locate the element.
   * @param timeout Time to wait after clicking (milliseconds). Default is 4000ms.
   * @param retries Number of retries to find the element. Default is 3.
   * @returns A Promise resolving to the clicked WebElement.
   * @throws Error if the element cannot be found after the specified retries.
   */
  static async clickElement(
    view: WebView,
    selector: By,
    timeout?: number,
    retries?: number,
  ): Promise<WebElement>;

  /**
   * Waits for an element in WebView and clicks it.
   * Uses a `data-test` attribute selector with the `dataTest` method.
   * @param view The WebView instance.
   * @param selector The string used as a data-test attribute selector.
   * @param timeout Time to wait after clicking (milliseconds). Default is 4000ms.
   * @param retries Number of retries to find the element. Default is 3.
   * @returns A Promise resolving to the clicked WebElement.
   * @throws Error if the element cannot be found after the specified retries.
   */
  static async clickElement(
    view: WebView,
    selector: string,
    timeout?: number,
    retries?: number,
  ): Promise<WebElement>;

  /**
   * Implementation of the clickElement method.
   */
  static async clickElement(
    view: WebView,
    selector: By | string,
    timeout = 4000,
    retries = 3,
  ) {
    let el: WebElement;
    if (typeof selector === "string") {
      // Use dataTest helper for data-test selectors
      el = await UIUtils.dataTest(view, selector, retries);
    } else {
      el = await UIUtils.findWebElement(view, selector, retries);
    }

    await el.click();
    console.log(`Clicked element with selector: ${selector.toString()}`);
    await UIUtils.sleep(timeout);
    return el;
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
        // eslint-disable-next-line no-await-in-loop
        el = await view.findWebElement(selector);
        if (el) {
          break;
        }
      } catch (_) {
        if (i === retries - 1) {
          throw new Error(
            `Element not found after ${retries} retries: ${selector.toString()}`,
          );
        }

        console.log(`Element not found, retrying (${i + 1}/${retries})...`);
        // eslint-disable-next-line no-await-in-loop
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
   * @returns A Promise that resolves when all dismiss actions are attempted.
   */
  static async dismissAllNotifications(wb: Workbench, browser: VSBrowser) {
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
   * Waits for the sidebar to become visible and not minimised.
   *
   * @param view - The VS Code webview wrapper providing the WebDriver instance.
   * @param timeout - Max time to wait in ms (default 2000).
   * @returns The located and visible sidebar panel element.
   * @throws If the panel never appears or remains minimised until timeout.
   */
  static async waitForSidebarToOpen(
    view: WebView,
    timeout = 2000,
  ): Promise<WebElement> {
    const driver = view.getDriver();

    // Wait for the container to appear
    await driver.wait(
      until.elementLocated(signalConfigSidebarContainer),
      timeout,
    );

    // Wait for the inner container to exist and be visible & not minimised
    let panel = await driver.wait(
      until.elementLocated(panelContainer),
      timeout,
    );
    console.log("INNER Container appeared");

    await driver.wait(
      async () => {
        try {
          const visible = await panel.isDisplayed();
          const cls = await panel.getAttribute("class");
          return visible && !/minimis(e)?d/i.test(cls);
        } catch {
          // Handle re-render/stale element by re-finding
          panel = await driver.findElement(panelContainer);
          const visible = await panel.isDisplayed().catch(() => false);
          const cls = (await panel.getAttribute("class").catch(() => "")) || "";
          return visible && !/minimis(e)?d/i.test(cls);
        }
      },
      timeout,
      "Sidebar did not open (still minimised or hidden)",
      200,
    );

    return panel;
  }
}

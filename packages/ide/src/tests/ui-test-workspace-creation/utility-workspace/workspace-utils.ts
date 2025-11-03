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
  WebElement,
  WebView,
  Workbench,
  VSBrowser,
} from "vscode-extension-tester";

export class UIUtils {
  /**
   * Waits for an element in WebView and clicks it.
   * @param view The WebView instance.
   * @param selector The selector to find the element.
   * @param timeout The time to wait after clicking the element (in milliseconds). Default is 3000ms.
   * @param retries The number of times to retry finding the element. Default is 3.
   * @returns A Promise that resolves to the clicked WebElement.
   * @throws Error if the element cannot be found after the specified retries.
   */
  static async clickElement(
    view: WebView,
    selector: By,
    timeout = 4000,
    retries = 3,
  ) {
    const el = await UIUtils.findWebElement(view, selector, retries);

    await el.click();
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

  static async waitForElement(view: WebView, selector: By, timeout = 6000) {
    const { until } = require("selenium-webdriver");
    const driver = view.getDriver();
    return driver.wait(until.elementLocated(selector), timeout);
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
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
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

  static async scrollToView(
    workbench: Workbench,
    scrollContainer: WebElement,
    timeout = 3000,
  ) {
    await workbench
      .getDriver()
      .executeScript(
        "arguments[0].scrollTop = arguments[0].scrollHeight",
        scrollContainer,
      );
    await UIUtils.sleep(timeout);
  }
}

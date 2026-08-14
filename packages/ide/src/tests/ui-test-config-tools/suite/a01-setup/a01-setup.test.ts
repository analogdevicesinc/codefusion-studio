/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import { describe, before } from "mocha";
import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

describe("Setup test environment", () => {
  before(async function () {
    this.timeout(60000);
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  it("should dismiss toast notifications @smoke", async function () {
    this.timeout(60000);
    const browser = VSBrowser.instance;
    const view = new WebView();
    const configPath = getConfigPathForFile("max32690-wlp.cfsconfig");

    await browser.openResources(configPath);
    await view.wait();
    await view.switchBack();
    await UIUtils.sleep(3000);

    await new Workbench().getNotifications().then(async (notifications) => {
      await Promise.all(
        notifications.map(
          (notification) =>
            new Promise((resolve) => {
              notification.dismiss().then(() => {
                resolve("closed");
              });
            }),
        ),
      );

      try {
        // Try to find the element with a short timeout
        const cExtensionToast = await browser.driver
          .findElement(
            By.xpath('//*[@id="list_id_1_0"]/div[1]/div[1]/div[2]/a[2]'),
          )
          .catch(() => null);

        // If the element exists, click it
        if (cExtensionToast) {
          await cExtensionToast.click();
          console.log("C Extension toast dismissed");
        } else {
          console.log("No C Extension toast found");
        }
      } catch (_) {
        // Element not found or other error
        console.log("No C Extension toast to dismiss");
      }
    });
  });
});

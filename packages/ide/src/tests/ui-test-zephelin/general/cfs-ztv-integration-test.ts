/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
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
 * These tests cover CFS integration with ZTV.
 */

import { expect } from "chai";
import { Workbench, ActivityBar, VSBrowser } from "vscode-extension-tester";
import { By, WebDriver } from "selenium-webdriver";
import {
  closeFolder,
  closeWindows,
  openFolder,
} from "../../ui-test-utils/file-utils";

let runId = 0;

const testDirectory = "src/tests/ui-test/data/Hello_World";

const delays = [1000, 1000, 1000, 1000, 1000, 5000, 1000, 1000, 1000, 1000, 1000, 1000];

describe("Live tracing ZTV server tests (Start Server)", () => {
  let workbench: Workbench;

  beforeEach(async () => {
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);

    workbench = new Workbench();
    await workbench.getDriver().sleep(4500);
    await closeWindows();

    await workbench.getDriver().sleep(delays[runId]);
    runId += 1;
  });

  afterEach(async () => {
    await workbench.getDriver().sleep(delays[runId]);
    await closeWindows();
    runId += 1;
  });

  it("Start server", async () => {
    await clickOnExtension();

    console.log("Selected extension");

    await workbench.getDriver().sleep(3000);

    const driver: WebDriver = VSBrowser.instance.driver;

    const button = (
      await searchForElement(driver, By.xpath('//vscode-button[normalize-space(.)="Configure capture"]'))
    ) ?? (
      await searchForElement(driver, By.css('vscode-button[data-test="configure-capture-btn"]'))
    );

    console.log("button: ", button);
    console.log("button outerHTML: ", await button!.getAttribute('outerHTML'));

    expect(button, "Expected to find button for configuration").to.not.equal(null);

    await driver.executeScript(
      "arguments[0].click();",
      button
    );

    console.log("Clicked configuration button");

    await driver.switchTo().defaultContent();

    await workbench.getDriver().sleep(2500);

    const checkbox = await searchForElement(driver, By.css('vscode-checkbox[aria-label="Enable Zephelin Live Tracing"]'));

    expect(checkbox, "Expected to find checkbox for accessing configuration").to.not.equal(null);

    console.log("Configuration checkbox: ", checkbox);
    console.log("Configuration checkbox outerHTML: ", await checkbox!.getAttribute('outerHTML'));

    await workbench.getDriver().sleep(1000);

    const checked = await checkbox!.getAttribute("current-checked")

    console.log("Currently checked: ", checked);

    if (checked !== "true") {
      console.log("Selecting first configuration option");

      await driver.executeScript(
        "arguments[0].click();",
        checkbox
      );

      console.log("Selected first configuration option");
    }

    await workbench.getDriver().sleep(2500);

    const pluginSettings = {
      "tcpServerHost": "127.0.0.1",
      "tcpServerPort": "5000",
      "backendHost": "127.0.0.1",
      "backendPort": "8000",
    };

    const textfield1 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(1) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield2 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(2) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield3 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(3) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield4 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(4) > div:nth-of-type(1) > div > vscode-text-field"));

    const shadowRoot1 = await textfield1.getShadowRoot();

    const inputElement1 = await shadowRoot1.findElement(
        By.css('input')
    );

    await inputElement1.clear();
    await inputElement1.sendKeys(pluginSettings["tcpServerHost"]);

    const shadowRoot2 = await textfield2.getShadowRoot();

    const inputElement2 = await shadowRoot2.findElement(
        By.css('input')
    );

    await inputElement2.clear();
    await inputElement2.sendKeys(pluginSettings["tcpServerPort"]);

    const shadowRoot3 = await textfield3.getShadowRoot();

    const inputElement3 = await shadowRoot3.findElement(
        By.css('input')
    );

    await inputElement3.clear();
    await inputElement3.sendKeys(pluginSettings["backendHost"]);

    const shadowRoot4 = await textfield4.getShadowRoot();

    const inputElement4 = await shadowRoot4.findElement(
        By.css('input')
    );

    await inputElement4.clear();
    await inputElement4.sendKeys(pluginSettings["backendPort"]);

    console.log("Choosing dropdown");

    const dropdown = await driver.findElement(By.css('vscode-dropdown#serial-port-controlDropdown'));

    console.log("dropdown: ", dropdown);
    console.log(await dropdown.getAttribute('outerHTML'));

    await driver.executeScript(
      "arguments[0].click();",
      dropdown
    );

    await workbench.getDriver().sleep(2000);

    // Check whether options exist on CI
    const options = await dropdown.findElements(By.css("vscode-option"));

    console.log("options:", options.length);

    for (const option of options) {
        console.log(await option.getAttribute("outerHTML"));
    }

    await workbench.getDriver().sleep(2000);

    await driver.executeScript(
      "arguments[0].click();",
      dropdown
    );

    await workbench.getDriver().sleep(2000);

    await driver.switchTo().defaultContent();

    await workbench.getDriver().sleep(5500);

    const startCaptureButton = await searchForElement(driver, By.xpath('//vscode-button[normalize-space(.)="Start Capture"]'));

    console.log("startCaptureButton: ", startCaptureButton);
    console.log(await startCaptureButton!.getAttribute('outerHTML'));

    await workbench.getDriver().sleep(2000);

    expect(startCaptureButton, "Expected to find button for starting capture").to.not.equal(null);

    console.log("Clicking startCaptureButton");

    await driver.executeScript(
      "arguments[0].click();",
      startCaptureButton
    );

    console.log("Clicked startCaptureButton");

    await workbench.getDriver().sleep(5000);

    await driver.switchTo().defaultContent();

    try {
      const response = await fetch(`http://${pluginSettings['backendHost']}:${pluginSettings['backendPort']}`);
      const body = await response.json();

      expect(body, "Expected to retrieve message from the server").to.deep.equal({
        detail: 'Not Found'
      });
      console.log("Retrieved message from the server - Success!");
    }
    catch(error) {
      console.log("Fail!");
      throw new Error(`Cannot reach server: ${error}`);
    }
  });
});

async function clickOnExtension() {
    const activityBar = new ActivityBar();
    const controls = await activityBar.getViewControl("CodeFusion Studio");
    expect(controls, "Expected plugin to be installed").to.not.equal(undefined);
    const _sideBar = await controls!.openView();
}

// This function assumes webdriver is at the root document (no iframe is switched into)
// It focuses on the innermost iframe containing element matching specified selector
// Remember to call `await driver.switchTo().defaultContent()` after this
async function searchForElement(driver : WebDriver, selector : By) {
  await driver.switchTo().defaultContent();
  const frames = await driver.findElements(By.css("iframe"));
  for (const frame of frames) {
    await driver.switchTo().frame(frame);

    const innerFrames = await driver.findElements(By.css("iframe"));
    if (innerFrames.length === 1) {
      const innerFrame = innerFrames[0];

      await driver.switchTo().frame(innerFrame);

      const elements = await driver.findElements(selector);
      if (elements.length === 1) {
        return elements[0];
      }

      await driver.switchTo().parentFrame();
    }

    await driver.switchTo().parentFrame();
  }

  return null;
}


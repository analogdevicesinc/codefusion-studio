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
 * These tests cover gathering traces from a server run by the plugin.
 */

import { expect } from "chai";
import { Workbench, ActivityBar, VSBrowser } from "vscode-extension-tester";
import { By, WebDriver } from "selenium-webdriver";
import {
  closeFolder,
  closeWindows,
  openFolder,
} from "../../ui-test-utils/file-utils";

const testDirectory = "src/tests/ui-test/data/Hello_World";

/**
 * Port the Zephelin backend is expected on.
 */
const backendPort = 8000;

let workbench: Workbench;

describe("Live tracing ZTV server tests (Gather traces)", () => {
  before(async () => {
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);

    workbench = new Workbench();

    await workbench.getDriver().sleep(4500);

    await closeWindows();

    await workbench.getDriver().sleep(1000);
  });

  it("Gather traces", async () => {
    await clickOnExtension();

    console.log("Extension clicked");

    await workbench.getDriver().sleep(3000);

    const driver: WebDriver = VSBrowser.instance.driver;

    const button = (
      await searchForElement(driver, By.xpath('//vscode-button[normalize-space(.)="Configure capture"]'))
    ) ?? (
      await searchForElement(driver, By.css('vscode-button[data-test="configure-capture-btn"]'))
    );

    expect(button, "Expected to find button for configuration").to.not.equal(null);

    console.log("Before configuration button clicked");

    await driver.executeScript(
      "arguments[0].click();",
      button
    );

    console.log("Configuration button clicked");

    await driver.switchTo().defaultContent();

    const checkbox = await searchForElement(driver, By.css('vscode-checkbox[aria-label="Enable Zephelin Live Tracing"]'));

    expect(checkbox, "Expected to find checkbox for accessing configuration").to.not.equal(null);

    await workbench.getDriver().sleep(1000);

    const checked = await checkbox!.getAttribute("current-checked")

    if (checked !== "true") {
      await driver.executeScript(
        "arguments[0].click();",
        checkbox
      );
    }

    console.log("Checkbox checked: ", checked);

    await workbench.getDriver().sleep(2000);

    const pluginSettings = {
      "tcpServerHost": "127.0.0.1",
      "tcpServerPort": "5000",
      "backendHost": "127.0.0.1",
      "backendPort": String(backendPort),
    };

    const textfield1 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(1) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield2 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(2) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield3 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(3) > div:nth-of-type(1) > div > vscode-text-field"));

    const textfield4 = await driver.findElement(By.css("body > div > div > main > div > section:nth-of-type(3) > div:nth-of-type(2) > div:nth-child(4) > div:nth-of-type(1) > div > vscode-text-field"));

    //

    const shadowRoot1 = await textfield1.getShadowRoot();

    const inputElement1 = await shadowRoot1.findElement(
        By.css('input')
    );

    await inputElement1.clear();
    await inputElement1.sendKeys(pluginSettings["tcpServerHost"]);

    //

    const shadowRoot2 = await textfield2.getShadowRoot();

    const inputElement2 = await shadowRoot2.findElement(
        By.css('input')
    );

    await inputElement2.clear();
    await inputElement2.sendKeys(pluginSettings["tcpServerPort"]);

    //

    const shadowRoot3 = await textfield3.getShadowRoot();

    const inputElement3 = await shadowRoot3.findElement(
        By.css('input')
    );

    await inputElement3.clear();
    await inputElement3.sendKeys(pluginSettings["backendHost"]);

    //

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

    console.log("Before first dropdown click");

    await driver.executeScript(
      "arguments[0].click();",
      dropdown
    );

    console.log("After first dropdown click");

    await workbench.getDriver().sleep(2000);

    console.log("Before second dropdown click");

    await driver.executeScript(
      "arguments[0].click();",
      dropdown
    );

    console.log("After second dropdown click");

    await workbench.getDriver().sleep(2000);

    await driver.switchTo().defaultContent();

    const startCaptureButton = await searchForElement(driver, By.xpath('//vscode-button[normalize-space(.)="Start Capture"]'));

    expect(startCaptureButton, "Expected to find button for starting capture").to.not.equal(null);

    console.log("Start Capture button found");

    await driver.executeScript(
      "arguments[0].click();",
      startCaptureButton
    );

    console.log("Start Capture button clicked");

    await workbench.getDriver().sleep(10000);

    const startStreamingButton = await searchForElement(driver, By.xpath('//button[normalize-space(.)="Start Streaming"]'));

    console.log("Before start streaming button clicked");

    await driver.executeScript(
      "arguments[0].click();",
      startStreamingButton
    );

    console.log("After start streaming button clicked");

    const liveBufferSpan = await searchForElement(driver, By.xpath('//span[starts-with(text(), "Live Buffer: ")]'));

    const liveBufferValues: number[] = [];

    for (let q = 0; q < 7; q += 1) {
      const value = await liveBufferSpan!.findElement(By.css('span')).getText();

      expect(value, "Expected element to be non-empty").to.not.equal("");
      expect(Number.isNaN(Number(value)), "Expected value to be convertible to number").to.equal(false);

      liveBufferValues.push(Number(value));

      await workbench.getDriver().sleep(500);
    }
    console.log("liveBufferValues: ", liveBufferValues);

    expect(liveBufferValues.every((v, i) => i === 0 || liveBufferValues[i - 1] <= v), "Expected values to be increasing").to.equal(true);
    expect(liveBufferValues.some((v) => v > 0), "Expected to gather any traces").to.equal(true);

    await workbench.getDriver().sleep(3000);

    await driver.switchTo().defaultContent();
  });
});

async function clickOnExtension() {
    await workbench.getDriver().sleep(500);
    const activityBar = new ActivityBar();
    await workbench.getDriver().sleep(500);
    const controls = await activityBar.getViewControl("CodeFusion Studio");
    await workbench.getDriver().sleep(500);
    expect(controls, "Expected plugin to be installed").to.not.equal(undefined);
    await workbench.getDriver().sleep(500);
    const _sideBar = await controls!.openView();
    await workbench.getDriver().sleep(500);
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

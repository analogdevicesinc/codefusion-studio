/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
  ModalDialog,
  TextEditor,
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

type Pin = {
  Pin: string;
  Peripheral: string;
  Signal: string;
  Config: Record<string, string>;
  ControlResetValues: Record<string, string>;
};

describe("Reset to Default", () => {
  let view: WebView;
  let browser: VSBrowser;
  let driver: WebDriver;

  before(async function () {
    this.timeout(60000);

    browser = VSBrowser.instance;
    driver = browser.driver;
    view = new WebView();

    await browser.waitForWorkbench();
  });

  after(async function () {
    this.timeout(60000);

    await view.switchBack();

    const wb = new Workbench();

    await wb.wait();

    await wb.executeCommand("view: close all editors");

    await new Promise((res) => {
      setTimeout(res, 1000);
    });

    const dialog = new ModalDialog();

    await dialog.pushButton("Don't Save");
  });

  it("Correctly resets function config to the default values - also in document", async () => {
    await VSBrowser.instance.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-tqfn.cfsconfig",
      ),
    );

    await view.wait();
    await view.switchToFrame();

    const pin = await view.findWebElement(
      By.css(
        "#pin-rows-container > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)",
      ),
    );

    await pin.click();

    expect(await view.findWebElement(By.css("#details-container"))).to.exist;

    const firstSignalToggle = await view.findWebElement(
      By.css(
        "#pin-details-signals-container > div:nth-child(1) > section > label",
      ),
    );

    await firstSignalToggle.click();

    const navItem = await view.findWebElement(By.css("#config"));

    await navItem.click();

    let dtNameInputField = await view.findWebElement(
      By.xpath(
        "/html/body/div/div/div[3]/div[3]/div/section/div[6]/div[2]/vscode-text-field",
      ),
    );

    expect(dtNameInputField).to.exist;

    await dtNameInputField.sendKeys("Invalid!");

    await view.switchBack();

    let quickAccess = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[2]/div/div/ul/li[1]/a',
      ),
    );

    expect(await quickAccess.getAttribute("aria-label")).to.equal(
      "(CFS) View Config File Source (JSON)",
    );

    await quickAccess.click();

    await new Promise((res) => {
      setTimeout(res, 1000);
    });

    let activeEditor = new TextEditor();
    let documentContent = await activeEditor.getText();
    let jsonObject: {
      Pins: Pin[];
    } = JSON.parse(documentContent);

    expect(jsonObject.Pins[0].Config["DT_NAME"]).to.equal("Invalid!");

    const extensionTab = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[1]/div[1]/div[1]',
      ),
    );

    expect(await extensionTab.getAttribute("aria-label")).to.equal(
      "max32690-tqfn.cfsconfig",
    );

    await extensionTab.click();

    await view.switchToFrame();

    const resetToDefBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/div[3]/div[3]/div/section/div[1]/h3'),
    );

    await resetToDefBtn.click();

    await new Promise((res) => {
      setTimeout(res, 1000);
    });

    expect(await dtNameInputField.getAttribute("current-value")).to.equal(
      "gpio_p2_26",
    );

    await view.switchBack();

    quickAccess = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[2]/div/div/ul/li[1]/a',
      ),
    );

    expect(await quickAccess.getAttribute("aria-label")).to.equal(
      "(CFS) View Config File Source (JSON)",
    );

    await quickAccess.click();

    activeEditor = new TextEditor();
    documentContent = await activeEditor.getText();
    jsonObject = JSON.parse(documentContent);

    expect(jsonObject.Pins[0].Config["DT_NAME"]).to.equal("gpio_p2_26");
  }).timeout(60000);
});

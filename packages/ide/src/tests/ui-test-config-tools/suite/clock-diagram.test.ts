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
import { By, EditorView, VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

describe("Clock Diagram", () => {
  it("Renders the clock diagram inside vscode", async () => {
    const browser = VSBrowser.instance;

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const view = new WebView();

    await view.wait(60000);

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css("#clockconfig"));

    await navItem.click();

    await new Promise((resolve) => setTimeout(resolve, 6000));

    // assert diagram rendered
    expect(await view.findWebElement(By.css("#adi_diagram"))).to.exist;

    const muxAccordion = await view.findWebElement(
      By.css("[data-test='accordion:MUX']"),
    );

    await muxAccordion.click();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const sysMux = await view.findWebElement(
      By.css("[data-test='SYS_OSC Mux']"),
    );

    await sysMux.click();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const formContainer = await view.findWebElement(
      By.css("[data-test='clock-details:options']"),
    );

    expect(formContainer).to.exist;

    const option = formContainer.findElement(
      By.css("[data-test='MUX-SYS_OSC Mux']"),
    );

    expect(option).to.exist;

    expect(
      await view.findWebElement(
        By.css(
          "#a86d8eb0-1766-11ef-a073-695fa460553d > rect.adi_diagram_content_node",
        ),
      ),
    ).to.exist;

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await view.switchBack();

    const ev = new EditorView();

    await ev.closeAllEditors();
  }).timeout(60000);
});

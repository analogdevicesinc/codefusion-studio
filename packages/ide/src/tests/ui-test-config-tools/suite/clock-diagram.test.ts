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
import { EditorView, VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import { clockTab } from "../page-objects/main-menu";
import {
  accordion,
  clockDiagram,
  diagramContentNode,
  formContainer,
  muxType,
} from "../page-objects/clock-config-section/clock-config-screen";

describe("Clock Diagram", () => {
  it("Renders the clock diagram inside vscode", async () => {
    const browser = VSBrowser.instance;
    const configPath = getConfigPathForFile("max32690-wlp.cfsconfig");

    await browser.openResources(configPath);
    await UIUtils.sleep(5000);
    const view = new WebView();
    await view.wait(60000);
    await view.switchToFrame();

    await UIUtils.clickElement(view, clockTab);
    await UIUtils.sleep(6000);

    // Assert diagram rendered
    expect(await view.findWebElement(clockDiagram)).to.exist;

    const muxAccordion = await UIUtils.findWebElement(view, accordion("MUX"));
    await muxAccordion.click();
    await UIUtils.sleep(1500);

    const sysMux = await UIUtils.findWebElement(view, muxType("SYS_OSC"));
    await sysMux.click();
    await UIUtils.sleep(1500);

    const container = await UIUtils.findWebElement(view, formContainer);
    expect(container).to.exist;

    const option = container.findElement(muxType("MUX-SYS_OSC"));
    expect(option).to.exist;
    expect(await UIUtils.findWebElement(view, diagramContentNode)).to.exist;

    await UIUtils.sleep(3000);
    await view.switchBack();
    const ev = new EditorView();
    await ev.closeAllEditors();
  }).timeout(60000);
});

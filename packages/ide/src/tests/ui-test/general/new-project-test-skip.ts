/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import { expect } from "chai";
import { existsSync } from "fs";
import {
  ActivityBar,
  InputBox,
  SideBarView,
  ViewControl,
  ViewSection,
  Workbench,
} from "vscode-extension-tester";

import { NEW_PROJECT_COMMAND_ID } from "../../../commands/constants";
import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";

const testDirectory = "src/tests/ui-test/data/Hello_World";
const projectName = "ExampleProject";
let projectPath: string;

describe("New Project Tests", () => {
  beforeEach(async () => {
    await closeFolder();
    deleteFolder(`${testDirectory}/.vscode`);
    await new Workbench().getDriver().sleep(1000);
    await openFolder(process.cwd() + `/${testDirectory}`);
    const workbench = new Workbench();
    await workbench.getDriver().sleep(10000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(5000);
    await closeWindows();
  });

  afterEach(async () => {
    if (projectPath) {
      deleteFolder(projectPath);
      await closeWindows();
    }
  });

  it("Create new MSDK project using command", async () => {
    const workbench = new Workbench();
    projectPath = process.cwd() + `/${testDirectory}/${projectName}`;
    await workbench.executeCommand(NEW_PROJECT_COMMAND_ID);
    await createMsdkProject();
    await workbench.getDriver().sleep(10000);
  });

  it("Create new MSDK project using context menu", async () => {
    await (
      (await new ActivityBar().getViewControl("Explorer")) as ViewControl
    ).openView();
    const content = new SideBarView().getContent();
    const section = (await content.getSection("Hello_World")) as ViewSection;
    const viewItem = await section.findItem("projects");
    expect(viewItem !== undefined);
    const menu = await viewItem?.openContextMenu();
    await menu?.select("(CFS) Create a new project");
    projectPath = process.cwd() + `/${testDirectory}/${projectName}`;
    await createMsdkProject();
  });
});

async function createMsdkProject() {
  let input;
  // set project location
  input = await InputBox.create();
  expect(await input.getPlaceHolder()).equals(
    "Select the new project location..."
  );
  // the first quick pick item should be the workspace folder
  await input.selectQuickPick(0);

  // set project name
  input = await InputBox.create();
  expect(await input.getPlaceHolder()).equals("MyProject");
  await input.setText(projectName);
  await input.confirm();

  // set target MCU
  input = await InputBox.create();
  await input.getPlaceHolder();
  const target = "MAX32655";
  await input.selectQuickPick(target);

  // set target board
  input = await InputBox.create();
  expect(await input.getPlaceHolder()).equals("Select the target board...");
  await input.selectQuickPick("EvKit_V1");

  // verify project exists
  const workbench = new Workbench();
  await workbench.getDriver().sleep(5000);
  expect(existsSync(`${projectPath}/Makefile`));
}

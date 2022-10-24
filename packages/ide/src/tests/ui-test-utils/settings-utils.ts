/**
 *
 * Copyright (c) 2023 Analog Devices, Inc.
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
import { InputBox, Workbench } from "vscode-extension-tester";

import { SELECT_SDK_PATH_COMMAND_ID } from "../../commands/constants";

export const CFS_IDE_VERSION = "0.9.1";

/**
 * Select the SDK path using the quick pick option
 * @returns a promise containing the selected SDK path
 */
export async function selectSdkPath(): Promise<string> {
  await new Workbench().executeCommand(SELECT_SDK_PATH_COMMAND_ID);
  return await selectQuickPick(`.*${CFS_IDE_VERSION}`);
}

/**
 * Select the quick pick option
 * @param pattern - The quick pick option pattern to look for
 * @returns a promise containing the selected option
 */
export async function selectQuickPick(pattern: string): Promise<string> {
  const input = await InputBox.create();
  const picks = await input.getQuickPicks();
  let value;
  for (const item of picks) {
    const text = await item.getText();
    if (text.match(pattern)) {
      value = text;
      break;
    }
  }
  expect(value).not.equal(undefined);
  if (value !== undefined) {
    await input.selectQuickPick(value);
  }
  return value ? value : "";
}

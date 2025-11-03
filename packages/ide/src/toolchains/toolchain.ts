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

import * as vscode from "vscode";

import { EXTENSION_ID } from "../constants";
import { ADI_SELECTED_TOOLCHAIN_SETTING } from "../utils/constants";

enum ToolchainNames {
  ARM_NONE_EABI = "arm-none-eabi",
  RISCV_NONE_ELF = "riscv-none-elf",
}

/**
 * This function returns the toolchain selected, if the toolchain
 *  is not selected it will present a user with options to choose
 *  from. Once the user selects the toolchain, it will set toolchain
 *  and return it.
 * @returns Promise that resolves to selected toolchain,
 * resolves to undefined if not selected
 */
export function getPreferredToolchain(): Promise<string | undefined> {
  return new Promise<string | undefined>(async (resolve) => {
    const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    let selectedToolchain: string | undefined = conf.get(
      ADI_SELECTED_TOOLCHAIN_SETTING,
    );
    if (selectedToolchain === undefined || selectedToolchain.length === 0) {
      await askUserToSetPreferredToolchain().then((userSelectedToolchain) => {
        selectedToolchain = userSelectedToolchain;
      });
    }
    resolve(selectedToolchain);
  });
}

/**
 * This function shows the user possible options for toolchain
 * and sets the preferred toolchain based on the selection.
 * @returns Promise resolving to selected toolchain.
 */
export async function askUserToSetPreferredToolchain(): Promise<
  string | undefined
> {
  let selectedToolchain = "";
  const conf = vscode.workspace.getConfiguration(EXTENSION_ID);

  await vscode.window
    .showQuickPick(Object.values(ToolchainNames), {
      canPickMany: false,
      placeHolder: "Select the toolchain to build with",
    })
    .then(async (result) => {
      if (result === undefined || result.length === 0) {
        return;
      }
      selectedToolchain = result;
      await conf.update(ADI_SELECTED_TOOLCHAIN_SETTING, result);
    });
  return selectedToolchain;
}

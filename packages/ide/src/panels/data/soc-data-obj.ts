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

/**
 * The purpose of this file is to read the `.json` files in `<install_dir>/Data/SoC`, and aggregate the information in one object.
 * The created object will be used as a source of truth for project creation.
 */

import * as fs from "node:fs";
import path from "node:path";
import { SocDataType } from "../../webview/common/types/soc-data";

/**
 * Represents a SocDataObj class that provides access to SocData.
 */
export class SocDataObj {
  private static instance: SocDataObj;

  protected data: SocDataType.Data;

  /**
   * Retrieves the SocData object.
   *
   * @returns The SocData object.
   */
  public getSocData(): SocDataType.Data {
    return this.data;
  }

  /**
   * Retrieves the instance of the SocDataObj class.
   *
   * @returns The instance of the SocDataObj class.
   */
  public static getInstance(): SocDataObj {
    if (!SocDataObj.instance) {
      SocDataObj.instance = new SocDataObj();
    }
    return SocDataObj.instance;
  }

  /**
   * Loads data from the <sdkPath>/Data/SoC.
   *
   * @param sdkPath - The path to the SDK.
   * @throws Error if the JSON path does not exist.
   */
  public loadData(sdkPath: string) {
    const jsonPath = path.join(sdkPath, "Data", "SoC");

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON path does not exist: ${jsonPath}`);
    }

    const files = fs.readdirSync(jsonPath);
    const aggregatedData: SocDataType.Data = {
      version: "",
      schemaVersion: "",
      data: {
        soc: [],
      },
    };

    let isVersionUpdated = false;
    files.forEach((file) => {
      if (file.endsWith(".json")) {
        const filePath = path.join(jsonPath, file);
        const fileData = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileData);
        if (!isVersionUpdated) {
          aggregatedData.schemaVersion = jsonData.schemaVersion;
          aggregatedData.version = jsonData.version;
          isVersionUpdated = true;
        }
        aggregatedData.data.soc.push(
          ...jsonData.data.soc.filter(
            (socItem) =>
              !aggregatedData.data.soc.some(
                (existingItem) => existingItem.name === socItem.name,
              ),
          ),
        );
      }
    });

    this.data = aggregatedData;
  }
}

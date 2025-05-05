/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
 * Represents the data structure for SocDataType.
 * This namespace contains various types related to SOC (System on Chip) data.
 */
export namespace SocDataType {
  export type Board = {
    name: string;
    displayName: string;
    packageName: string;
    msdkIdentifier?: string;
    zephyrIdentifier?: string;
    description: string;
    secure?: boolean;
  };

  export type Location =
    | { type: string; path: string; isRelative: boolean }
    | {
        type: "git";
        path: {
          baseUrl?: string;
          subdir?: string;
          ref: string;
        };
        isRelative: boolean;
      }
    | {
        type: "localFolder";
        path: string;
        isRelative: boolean;
      };

  export type TemplateFolder = {
    name: string;
    location: Location;
    boot?: boolean;
    segger: SeggerOptions;
  };

  export type SeggerOptions = {
    ozoneSvd: string;
  };

  export type Template = {
    name: string;
    description: string;
    folders: TemplateFolder[];
    configs?: CfsConfig[];
    supportedDomains: string[];
  };

  export type CfsConfig = {
    board: string;
    cfsconfig: unknown;
  };

  export type FirmwarePlatform = {
    name: string;
    displayName: string;
    location: Location;
    templates: Template[];
  };

  export type Package = {
    name: string;
    displayName: string;
    firmwarePlatform: FirmwarePlatform[];
  };

  export type SoC = {
    name: string;
    displayName: string;
    description: string;
    boards: Board[];
    packages: Package[];
  };

  export type Data = {
    version: string;
    schemaVersion: string;
    data: {
      soc: SoC[];
    };
  };
}

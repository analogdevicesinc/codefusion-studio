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

import { ConfigurationTarget } from "vscode";

import {
  ARM_AARCH32_GCC_PATH,
  ARM_AARCH64_GCC_PATH,
  BOARD,
  CMSIS,
  DEBUG_PATH,
  EXTENSION_ID,
  FIRMWARE_PLATFORM,
  NAME,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_PATH,
  OPENOCD_TARGET,
  PACK,
  PROGRAM_FILE,
  PROJECT,
  ROOT,
  SDK_PATH,
  SELECTED_TOOLCHAIN,
  SVD_FILE,
  SYMBOL_FILE,
  TARGET,
  TOOLCHAIN,
} from "./constants";

/**
 * Settings properties node class used to retrieve extension settings
 */
export class PropertyNode {
  propertyName: string;
  isPath: boolean;
  scope: ConfigurationTarget;

  constructor(
    propertyName: string,
    isPath = true,
    scope = ConfigurationTarget.Workspace,
  ) {
    this.propertyName = propertyName;
    this.isPath = isPath;
    this.scope = scope;
  }
}

/**
 * @returns The toolchain property name, including the gcc paths and the selected toolchain
 */
export const getToolchainProperties = (): Array<PropertyNode> => {
  const toolchainPropertyNode: Array<PropertyNode> = [];

  toolchainPropertyNode.push(
    new PropertyNode(`${TOOLCHAIN}.${ARM_AARCH64_GCC_PATH}`),
  );
  toolchainPropertyNode.push(
    new PropertyNode(`${TOOLCHAIN}.${ARM_AARCH32_GCC_PATH}`),
  );
  toolchainPropertyNode.push(
    new PropertyNode(`${TOOLCHAIN}.${SELECTED_TOOLCHAIN}`, false),
  );
  return toolchainPropertyNode;
};

/**
 * @returns The cmsis property name, including root, pack, svd_file
 */
export const getCMSISProperties = (): Array<PropertyNode> => {
  const cmsisProperties: Array<PropertyNode> = [];

  cmsisProperties.push(new PropertyNode(`${CMSIS}.${ROOT}`));
  cmsisProperties.push(new PropertyNode(`${CMSIS}.${PACK}`));
  cmsisProperties.push(new PropertyNode(`${CMSIS}.${SVD_FILE}`));

  return cmsisProperties;
};

/**
 * @returns The OpenOCD property name, including the OpenOCD path, interface, and target
 */
export const getOpenocdProperties = (): Array<PropertyNode> => {
  const ocdProperties: Array<PropertyNode> = [];

  ocdProperties.push(new PropertyNode(`${OPENOCD}.${OPENOCD_PATH}`));
  ocdProperties.push(new PropertyNode(`${OPENOCD}.${OPENOCD_INTERFACE}`));
  ocdProperties.push(new PropertyNode(`${OPENOCD}.${OPENOCD_TARGET}`));

  return ocdProperties;
};

/**
 * @returns The Adi-sdk property name, that includes sdkPath
 */
export const getSdkProperties = (): Array<PropertyNode> => {
  const sdkProperties: Array<PropertyNode> = [];

  sdkProperties.push(
    new PropertyNode(SDK_PATH, true, ConfigurationTarget.Global),
  );

  sdkProperties.push(new PropertyNode(`${PROGRAM_FILE}`));
  sdkProperties.push(new PropertyNode(`${SYMBOL_FILE}`));
  sdkProperties.push(new PropertyNode(`${DEBUG_PATH}`));

  return sdkProperties;
};

/**
 * @returns All Project properties
 */
export const getProjectProperties = (): Array<PropertyNode> => {
  const projectProperties: Array<PropertyNode> = [];

  projectProperties.push(new PropertyNode(`${PROJECT}.${TARGET}`));
  projectProperties.push(new PropertyNode(`${PROJECT}.${BOARD}`));
  projectProperties.push(new PropertyNode(`${PROJECT}.${NAME}`));
  projectProperties.push(new PropertyNode(`${PROJECT}.${FIRMWARE_PLATFORM}`));

  return projectProperties;
};

/**
 * @returns All Adi-sdk properties.
 */
export const getAllAdiSdkProperties = (): Array<PropertyNode> => {
  let allAdiSdkProperties: Array<PropertyNode> = [];

  allAdiSdkProperties = allAdiSdkProperties.concat(
    getToolchainProperties(),
    getCMSISProperties(),
    getOpenocdProperties(),
    getSdkProperties(),
    getProjectProperties(),
  );

  return allAdiSdkProperties;
};

/**
 *
 * @param configurationTitle - It is one of the following values SDK_PATH, PROGRAM_FILE, DEBUG_PATH, OPENOCD, TOOLCHAIN, CMSIS, or MSDK.
 * @param property - It is the property defined in the configuration.
 * @param isConfig - When set to true return the property name with a 'config:'
 * @returns Name of the property.
 */
export const getPropertyName = (
  configurationTitle: string,
  property?: string,
  isConfig = true,
): string => {
  let propName = EXTENSION_ID + "." + configurationTitle;
  propName = property === undefined ? propName : propName + "." + property;
  if (isConfig) {
    return "${config:" + propName + "}";
  }
  return propName;
};

/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {Config} from '@oclif/core';

import {CfsDataModelManager} from 'cfs-lib';

import {getPackageManager} from './package-manager.js';
import {checkIfFileExists, getDataModelSearchPaths} from './utils.js';

export async function getDataModelManager(
  config: Config,
  pkgManager?: Awaited<ReturnType<typeof getPackageManager>>,
  customSearchPaths?: string[]
) {
  // Function to dynamically retrieve data model search paths
  const getSearchPaths = (): string[] => {
    const basePaths = getDataModelSearchPaths(config);

    if (customSearchPaths && customSearchPaths.length > 0) {
      const filteredPaths = customSearchPaths.filter(
        (path) => path && checkIfFileExists(`${path}/.cfsdatamodels`)
      );

      return [...basePaths, ...filteredPaths];
    }

    return basePaths;
  };

  const dataModelManager = new CfsDataModelManager(
    pkgManager,
    getSearchPaths
  );

  return dataModelManager;
}

/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import type {CfsConfig as CfsConfigType} from 'cfs-types';

import {CfsConfigValidator, type CheckDiagnostic} from 'cfs-lib';

import {getDataModelManager} from './data-model-manager.js';
import {getPackageManager} from './package-manager.js';

/**
 * Load a `.cfsconfig` file, resolve the SoC data model it targets, and run the
 * shared {@link CfsConfigValidator.check} checks against it.
 *
 * This is the reusable code used by `validate config` - other commands
 * can call it to run identical validation without duplicating the data-model
 * resolution or the `check()` invocation. Data-model discovery may emit console
 * warnings or errors through its dependencies. Unrecoverable problems (a
 * missing file, invalid JSON, or a schema violation) are thrown as a
 * `CfsConfigError` for the caller to surface however suits it.
 *
 * If the data model cannot be resolved (for example it is not installed, or the
 * version is unavailable), data model resolution is skipped and a `warning` diagnostic
 * is added so the file's schema results are still reported.
 * @param filePath - The `.cfsconfig` file to validate.
 * @param cliConfig - The oclif config, used to resolve the data model search paths.
 * @param searchPaths - Additional data model search paths (from `--search-path`).
 * @returns The diagnostics produced for the file and parsed cfs config file (if valid).
 */
export async function validateCfsConfigFile(
  filePath: string,
  cliConfig: Config,
  searchPaths?: string[]
): Promise<{config?: CfsConfigType; diagnostics: CheckDiagnostic[]}> {
  const config = await CfsConfigValidator.fromFile(filePath);
  const {Soc, Package, DataModelVersion} = config.data;

  try {
    const pkgManager = await getPackageManager({
      acceptUndefined: true
    });
    const dmManager = await getDataModelManager(
      cliConfig,
      pkgManager,
      searchPaths
    );
    const dataModel = await dmManager.getDataModel(
      Soc,
      Package,
      DataModelVersion
    );

    return {
      config: config.data,
      diagnostics: config.check(dataModel).diagnostics
    };
  } catch {
    // Create a string containing the version, if it is defined.
    const version = DataModelVersion
      ? `, version ${DataModelVersion}`
      : '';

    return {
      diagnostics: [
        ...config.check().diagnostics,
        {
          severity: 'warning',
          ruleId: 'data-model-unavailable',
          message: `Could not load the SoC data model for '${Soc}' (package '${Package}'${version}). Only file validation and schema checking have been performed.`
        }
      ]
    };
  }
}

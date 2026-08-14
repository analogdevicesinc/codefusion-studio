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

import type {AIToolsPlugin} from 'cfs-lib';

import {
  CfsDataModelManager,
  MAX_MODEL_NAME_LENGTH,
  caseInsensitiveCompare
} from 'cfs-lib';
import {CfsSocDataModel} from 'cfs-types';
import path, {extname} from 'node:path';

import {RecoverableError} from './recoverable-error.js';

export async function getAndEnsureDataModel(
  soc: string,
  packageId: string,
  dmManager: CfsDataModelManager
): Promise<CfsSocDataModel> {
  try {
    return await dmManager.getDataModel(soc, packageId);
  } catch {
    throw new RecoverableError(
      `Could not load data model for SoC '${soc}', Package '${packageId}'`,
      {
        suggestion: 'Verify the SoC and Package are compatible',
        run: `cfsutil socs info ${soc} --packages`
      }
    );
  }
}

/**
 * If core is not provided, attempt to infer it. If multiple cores with AI support are present, throw an error
 * @param flags flags of the command to validate and potentially modify
 * @param dataModel data model to use for inference
 * @param warnings array of warnings that gets prepended to AiCommandResult events
 * @throws RecoverableError if multiple cores with AI support are present and no core is specified
 * @returns void, modifies flags in place
 */
export function ensureOrTryInferCoreFlags(
  flags: {core?: string},
  dataModel: CfsSocDataModel,
  warnings: string[]
): asserts flags is {core: string} {
  if (!flags.core) {
    if (dataModel.Cores.length === 1 && dataModel.Cores[0].Ai) {
      flags.core = dataModel.Cores[0].Id;
    } else {
      const aiCores = dataModel.Cores.filter((core) => core.Ai);
      if (aiCores.length === 1) {
        flags.core = aiCores[0].Id;
        warnings.push(
          `Multiple cores found for this SoC but only one has AI support. Defaulting to: '${flags.core}'`
        );
      } else if (aiCores.length > 1) {
        throw new RecoverableError(
          `Multiple cores with AI support found for SoC '${dataModel.Name}' but no core specified. Available cores: ${aiCores.map((core) => core.Id).join(', ')}`,
          {
            suggestion: 'Specify a core using --core',
            run: `cfsutil ai <command> --core CM4 --soc MAX32690 --model <model>`
          }
        );
      } else {
        throw new RecoverableError(
          `No cores with AI support found for SoC '${dataModel.Name}'`,
          {
            suggestion: 'Verify the SoC has AI capable cores',
            run: `cfsutil socs info ${dataModel.Name} --cores`
          }
        );
      }
    }
  }
}

export async function inferBackendFromFlags(
  aiPlugin: AIToolsPlugin,
  flags: {
    backend?: string;
    core: string;
    acc?: string;
    soc?: string;
    package?: string;
  },
  dataModel: CfsSocDataModel
): Promise<string | undefined> {
  return (
    flags.backend ??
    (
      await aiPlugin.getBackendFromTarget({
        Core: flags.core,
        Accelerator: flags.acc,
        Soc: flags.soc,
        Package: flags.package,
        Family: dataModel?.Cores.find((core) =>
          caseInsensitiveCompare(core.Id, flags.core)
        )?.Family
      })
    )?.Name
  );
}

export function getBaseName(filename: string): string {
  let name: string;

  try {
    // If it's a URL, parse it
    const url = new URL(filename);
    name = path.basename(url.pathname, path.extname(url.pathname));
  } catch {
    // Not a URL → treat as local path
    name = path.basename(filename, extname(filename));
  }

  if (name.length > MAX_MODEL_NAME_LENGTH) {
    throw new RecoverableError(
      `Derived model name exceeds ${MAX_MODEL_NAME_LENGTH} characters`,
      {
        suggestion: 'Rename the model file to a shorter name'
      }
    );
  }

  return name;
}

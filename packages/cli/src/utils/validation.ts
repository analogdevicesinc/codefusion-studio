/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type {SoC} from 'cfs-ccm-lib';

import {Config} from '@oclif/core';
import {type CfsPluginInfo} from 'cfs-types';
import fs from 'node:fs';

import {getSocCatalog} from '../utils/catalog-manager.js';
import {checkIfFileExists} from './utils.js';

export async function validateSoC(
  flags: {
    soc?: string;
    board?: string;
    core?: string;
    package?: string;
    'template-id'?: string;
    'template-version'?: string;
  },
  config: Config,
  isNew: boolean,
  errors: string[]
): Promise<boolean> {
  // Validate the SoC:
  // - SoC/board combination exists in catalog
  // - Package exists for the SoC (if specified)

  if (!isNew)
    // Assume that the workspace file is valid
    return true;

  const catalog = await getSocCatalog(config, false);
  const socs = await catalog.getAll();
  const soc = flags.soc ? findSocByName(socs, flags.soc) : undefined;

  if (soc) {
    // check if board and package exist for the SoC
    if (flags.board) {
      const board = soc.boards.find(
        (boardItem) =>
          boardItem.name.toLowerCase() ===
          (flags.board as string).toLowerCase()
      );
      if (!board) {
        errors.push(
          `Board '${flags.board}' not found for SoC '${flags.soc}'. Use "cfs soc info ${flags.soc} --boards" to list the supported boards.`
        );
      }
    }

    if (flags.package) {
      const packageItem = soc?.packages.find(
        (pkg) =>
          pkg.dataModelPackageID.toLowerCase() ===
          (flags.package as string).toLowerCase()
      );
      if (!packageItem) {
        errors.push(
          `Package '${flags.package}' not found for SoC '${flags.soc}'.`
        );
      }
    }

    if (flags.core) {
      const core = soc.cores.find(
        (core) =>
          core.dataModelCoreID.toLowerCase() ===
          flags.core?.toLowerCase()
      );

      if (!core) {
        errors.push(
          `Core '${flags.core}' not found for SoC '${flags.soc}'. Use "cfs soc info ${flags.soc} --cores" to list the supported cores.`
        );
      }
    }
  } else {
    errors.push(
      `SoC '${flags.soc}' not a supported processor. Use "cfs socs list" to list the supported processors.`
    );
  }

  return Boolean(soc);
}

export function isTemplateValid(
  plugin: CfsPluginInfo,
  flags: {
    soc?: string;
    board?: string;
    package?: string;
    core?: string;
  }
): boolean {
  return (plugin.supportedSocs ?? []).some(
    (supportedSoc) =>
      supportedSoc.name.toLowerCase() === flags.soc?.toLowerCase() &&
      (supportedSoc.cores && flags.core
        ? supportedSoc.cores.some(
            (core) => core.toLowerCase() === flags.core?.toLowerCase()
          )
        : true) &&
      supportedSoc.board.toLowerCase() ===
        flags.board?.toLowerCase() &&
      (flags.package
        ? supportedSoc.package.toLowerCase() ===
          flags.package?.toLowerCase()
        : true)
  );
}

export function findSocByName(
  socs: SoC[],
  name: string
): SoC | undefined {
  const lowerName = name.toLowerCase();
  return socs.find((soc) => soc.name.toLowerCase() === lowerName);
}

export async function validatePaths(
  flags: {
    'search-path'?: string[];
    input?: string;
    output?: string;
    name?: string;
  },
  isNew: boolean,
  errors: string[]
): Promise<void> {
  // Validate the paths and filenames. Check that:
  // - Search paths exist
  // - For new workspaces:
  //   - Workspace name is valid
  //   - Workspace path does not already exist
  // - For existing workspaces:
  //   - Workspace file exists

  // If search paths were provided, validate them
  if (flags['search-path']) {
    for (const searchPath of flags['search-path']) {
      if (
        !fs.existsSync(searchPath) ||
        !fs.lstatSync(searchPath).isDirectory()
      ) {
        errors.push(
          `Search path: ${searchPath} does not exist or is not a directory.`
        );
      }
    }
  }

  if (isNew) {
    // Validate workspace name (should not contain invalid characters)
    if (flags.name && !/^[\w-]+$/.test(flags.name)) {
      errors.push(
        `Workspace name ${flags.name} can only contain letters, numbers, underscores, and hyphens`
      );
    }

    // Validate that the workspace path does not already exist
    const workspacePath = `${flags.output}/${flags.name}`;
    if (fs.existsSync(workspacePath)) {
      errors.push(
        `Workspace path ${workspacePath} already exists. Please choose a different name or output path.`
      );
    }
  } else if (!checkIfFileExists(flags.input)) {
    // Validate that the workspace file exists
    errors.push(`Workspace file: ${flags.input} does not exist.`);
  }
}

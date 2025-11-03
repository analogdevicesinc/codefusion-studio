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

import {Command, Flags} from '@oclif/core';
import {CfsDataModelManager, CfsWorkspace} from 'cfs-lib';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  checkIfFileExists,
  lowercaseFirstLetterProps,
  readJsonFile
} from '../../utils/utils.js';

export default class WorkspaceCreate extends Command {
  static description =
    'Generates a workspace based on a configuration file.';

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional directory paths to search for plugins and data models. Can be used multiple times.',
      multiple: true,
      required: false
    }),
    'workspace-file-path': Flags.string({
      char: 'w',
      required: true,
      summary: '.cfsworkspace file path'
    })
  };

  async run() {
    const {flags} = await this.parse(WorkspaceCreate);
    const cfsWorkspaceFile = flags['workspace-file-path'];

    if (!checkIfFileExists(cfsWorkspaceFile)) {
      this.error(
        `Workspace file: ${cfsWorkspaceFile} does not exist.`
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      readJsonFile(cfsWorkspaceFile)
    ) as CfsWorkspace;

    const formattedProjects =
      cfsWorkspace.projects?.map((project) => ({
        ...lowercaseFirstLetterProps(project)
      })) ?? [];

    cfsWorkspace.projects = formattedProjects;

    const pkgManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager: CfsDataModelManager = await getDataModelManager(
      this.config,
      pkgManager,
      flags['search-path']
    );

    const pluginManager = getPluginManager(
      flags['search-path'],
      pkgManager,
      dmManager
    );

    await pluginManager.generateWorkspace(cfsWorkspace);
  }
}

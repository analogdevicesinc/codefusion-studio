/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import type {CfsWorkspace} from 'cfs-types';

import {Command, Flags} from '@oclif/core';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../utils/error-handler.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  checkIfFileExists,
  lowercaseFirstLetterProps,
  readJsonFile
} from '../../utils/utils.js';

export default class ProjectCreate extends Command {
  static description = 'Generates the project';

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional directory paths to search for plugins and data models. Can be used multiple times.',
      multiple: true
    }),
    'workspace-file-path': Flags.string({
      char: 'w',
      required: true,
      summary: '.cfsworkspace file path'
    }),
    'project-name': Flags.string({
      char: 'p',
      required: true,
      summary:
        'Name of the project to be generated as found in the workspace file.'
    })
  };

  async run() {
    const {flags} = await this.parse(ProjectCreate);
    const cfsWorkspaceFile = flags['workspace-file-path'];
    const projectName = flags['project-name'];

    if (!checkIfFileExists(cfsWorkspaceFile)) {
      this.error(
        `Workspace file: ${cfsWorkspaceFile} does not exist.`
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      readJsonFile(cfsWorkspaceFile)
    ) as CfsWorkspace;

    if (
      !cfsWorkspace.projects ||
      cfsWorkspace.projects.length === 0
    ) {
      this.error(
        'Projects cannot currently be generated from this type of workspace file.'
      );
    }

    const formattedProjects =
      cfsWorkspace.projects.map((project) => {
        const formattedProject = lowercaseFirstLetterProps(project);

        return {
          ...formattedProject,
          soc: formattedProject.soc ?? cfsWorkspace.soc,
          board: formattedProject.board ?? cfsWorkspace.board,
          package: formattedProject.package ?? cfsWorkspace.package
        };
      }) ?? [];

    cfsWorkspace.projects = formattedProjects;

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      flags['search-path']
    );

    const pluginManager = getPluginManager(
      dmManager,
      flags['search-path'],
      packageManager
    );

    try {
      await pluginManager.generateProject(cfsWorkspace, projectName);
    } catch (error) {
      handleMissingDependencyError(error);
      throw error;
    }
  }
}

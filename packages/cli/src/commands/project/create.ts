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

import {Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {CfsToolManager} from 'cfs-lib';
import path from 'node:path';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../utils/error-handler.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  checkIfFileExists,
  getCFSInstallPath,
  lowercaseFirstLetterProps
} from '../../utils/utils.js';
import {readJsonFile} from 'cfs-lib';

export default class ProjectCreate extends BaseCommand<
  typeof ProjectCreate
> {
  static description = 'Generates the project';
  static useResponseEnvelope = true;

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

  async run(): Promise<{projectName: string; workspacePath: string}> {
    const {flags} = this;
    const cfsWorkspaceFile = flags['workspace-file-path'];
    const projectName = flags['project-name'];

    if (!checkIfFileExists(cfsWorkspaceFile)) {
      this.error(
        `Workspace file: ${cfsWorkspaceFile} does not exist.`,
        {code: 'WORKSPACE_FILE_NOT_FOUND'}
      );
    }

    let workspaceFileContent: Record<string, unknown>;
    try {
      workspaceFileContent = readJsonFile(cfsWorkspaceFile);
    } catch (error) {
      // readJsonFile messages embed the path; pin a stable code instead.
      this.error(
        error instanceof Error ? error.message : String(error),
        {code: 'WORKSPACE_FILE_READ_FAILED'}
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      workspaceFileContent
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

    const installPath = getCFSInstallPath(this.config);
    const toolManager = new CfsToolManager(
      packageManager,
      installPath ? [installPath] : undefined,
      cfsWorkspace.soc
    );
    const zephyrTool =
      await toolManager.getInstalledToolById('zephyr');
    const zephyrBase = zephyrTool
      ? path.join(zephyrTool.rootPath, 'zephyr')
      : undefined;

    try {
      await pluginManager.generateProject(cfsWorkspace, projectName, {
        zephyrBase
      });
    } catch (error) {
      handleMissingDependencyError(error);
      this.error(
        error instanceof Error ? error.message : String(error),
        {
          code: 'PROJECT_CREATE_FAILED'
        }
      );
    }

    return {
      projectName,
      workspacePath: path.resolve(
        cfsWorkspace.location,
        cfsWorkspace.workspaceName
      )
    };
  }
}

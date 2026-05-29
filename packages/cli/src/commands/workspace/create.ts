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

import type {CfsPluginInfo, CfsWorkspace} from 'cfs-types';

import {Command, Flags} from '@oclif/core';
import {CfsDataModelManager} from 'cfs-lib';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  checkIfFileExists,
  lowercaseFirstLetterProps,
  readJsonFile
} from '../../utils/utils.js';
import {validatePaths, validateSoC} from '../../utils/validation.js';
import {
  checkErrors,
  createWorkspaceConfig,
  generateWorkspaceFromConfig,
  getPackageNameFromTemplate,
  getValidTemplate
} from '../../utils/workspace-utils.js';

export default class WorkspaceCreate extends Command {
  static description =
    'Generates a workspace based on a configuration file or command line arguments.';

  static examples = [
    '<%= config.bin %> <%= command.id %> --workspace-file-path ./my_workspace.cfsworkspace',
    '<%= config.bin %> <%= command.id %> -o c:/tmp --name myNewWorkspace --soc ADSP-SC835 --board ADSPSC835-EV-SOM --template-id com.analog.sharcfx.example --template-version 1.0.1'
  ];

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true,
      required: false
    }),
    input: Flags.string({
      char: 'i',
      required: false,
      aliases: ['workspace-file-path', 'w'],
      summary: 'File path for existing .cfsworkspace file'
    }),
    output: Flags.string({
      char: 'o',
      required: false,
      summary:
        'Output path for new workspace (excluding workspace name)'
    }),

    name: Flags.string({
      required: false,
      summary: 'Name for new workspace'
    }),
    soc: Flags.string({
      required: false,
      summary: 'SoC name'
    }),
    board: Flags.string({
      required: false,
      summary: 'Board name'
    }),
    package: Flags.string({
      required: false,
      summary: 'Package name'
    }),
    'template-id': Flags.string({
      required: false,
      summary: 'Template ID'
    }),
    'template-version': Flags.string({
      required: false,
      summary: 'Template version'
    })
  };

  createWorkspaceFromFile(
    cfsWorkspaceFile: string,
    workspaceName: string | undefined,
    workspaceFolder: string | undefined,
    errors: string[]
  ): CfsWorkspace {
    // Use the provided .cfsworkspace file to generate the workspace
    this.log(`Generating workspace from file: ${cfsWorkspaceFile}`);

    if (!checkIfFileExists(cfsWorkspaceFile)) {
      errors.push(
        `Workspace file: '${cfsWorkspaceFile}' does not exist.`
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      readJsonFile(cfsWorkspaceFile)
    ) as CfsWorkspace;

    if (workspaceName) {
      cfsWorkspace.workspaceName = workspaceName;
    }

    if (workspaceFolder) {
      cfsWorkspace.location = workspaceFolder;
    }

    // confirm that the workspace name and location are valid
    if (
      !cfsWorkspace.workspaceName ||
      cfsWorkspace.workspaceName === ''
    ) {
      errors.push(
        'Workspace name is not specified in the workspace file or command line.'
      );
    }

    if (!cfsWorkspace.location || cfsWorkspace.location === '') {
      errors.push(
        'Workspace location is not specified in the workspace file or command line.'
      );
    }

    const formattedProjects =
      cfsWorkspace.projects?.map((project) => ({
        ...lowercaseFirstLetterProps(project)
      })) ?? [];

    cfsWorkspace.projects = formattedProjects;

    return cfsWorkspace;
  }

  async run() {
    const {flags} = await this.parse(WorkspaceCreate);
    const isNew = flags.input === undefined;
    let validSoc = false;

    const pkgManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager: CfsDataModelManager = await getDataModelManager(
      this.config,
      pkgManager,
      flags['search-path']
    );

    const pluginManager = getPluginManager(
      dmManager,
      flags['search-path'],
      pkgManager
    );

    // Collect all validation errors
    const errors: string[] = [];

    // Validate the flags - check for required/invalid combinations
    this.validateFlags(flags, isNew, errors);

    // Validate the path names and file names
    await validatePaths(flags, isNew, errors);

    // Validate the SoC info if the SoC is provided
    if (flags.soc) {
      validSoc = await validateSoC(flags, this.config, isNew, errors);
    }

    checkErrors(errors, this);

    let template: CfsPluginInfo | undefined;

    if (flags['template-id'] && validSoc && isNew) {
      template = await getValidTemplate(flags, pluginManager, errors);
    }

    checkErrors(errors, this);

    let workspaceConfig: CfsWorkspace | undefined;

    if (isNew) {
      // If the package name is not provided, attempt to find it based on the provided board and SoC names
      if (!flags.package) {
        flags.package = getPackageNameFromTemplate(
          template as CfsPluginInfo,
          flags.soc as string,
          flags.board as string,
          errors
        );
      }

      checkErrors(errors, this);

      // We're creating a workspace based on cmd-line args.
      workspaceConfig = createWorkspaceConfig({
        soc: flags.soc as string,
        package: flags.package as string,
        board: flags.board as string,
        workspaceName: flags.name as string,
        location: flags.output as string,
        workspacePluginId: template?.pluginId as string,
        workspacePluginVersion: template?.pluginVersion as string
      });

      this.log(
        `Creating workspace '${flags.name}' at location: ${flags.output}`
      );
      this.log(
        // Print the soc and board, and print the package if specified
        `SoC: '${flags.soc}', Board: '${flags.board}'` +
          (flags.package ? `, Package: '${flags.package}'` : '')
      );
      this.log(
        `Template: ${template?.pluginId} (version ${template?.pluginVersion})`
      );
    } else if (flags.input) {
      workspaceConfig = this.createWorkspaceFromFile(
        flags.input,
        flags.name,
        flags.output,
        errors
      );
    } else {
      errors.push(
        'Input file path is required but was not provided.'
      );
    }

    // If there are any errors, display them all and exit
    checkErrors(errors, this);

    if (workspaceConfig) {
      await generateWorkspaceFromConfig(
        workspaceConfig,
        pluginManager,
        this
      );
    }
  }

  validateFlags(
    flags: {
      'search-path'?: string[];
      input?: string;
      output?: string;
      name?: string;
      soc?: string;
      board?: string;
      package?: string;
      'template-id'?: string;
      'template-version'?: string;
    },
    isNew: boolean,
    errors: string[]
  ): void {
    // If we're creating a new workspace, we require all of the following
    const requiredNewFlags = [
      'soc',
      'board',
      'template-id',
      'name',
      'output'
    ];

    // If we're creating a new workspace, we need to exclude the following
    const excludedNewFlags = ['input'];

    // If we're working with an existing workspace file, we need to exclude the following
    const excludedExistFlags = [
      'soc',
      'board',
      'package',
      'template-id',
      'template-version'
    ];

    if (isNew) {
      // Ensure we're not passing unwanted workspace flags
      for (const flag of excludedNewFlags) {
        if (flags[flag as keyof typeof flags]) {
          errors.push(
            `--${flag} should not be specified when creating a new workspace.`
          );
        }
      }

      // And ensure we're passing all required flags
      for (const flag of requiredNewFlags) {
        if (!flags[flag as keyof typeof flags]) {
          errors.push(
            `--${flag} is required when creating a new workspace.`
          );
        }
      }
    } else {
      // Ensure we're not passing unwanted workspace flags
      for (const flag of excludedExistFlags) {
        if (flags[flag as keyof typeof flags]) {
          errors.push(
            `--${flag} should not be used when generating a workspace using workspace file.`
          );
        }
      }
    }
  }
}

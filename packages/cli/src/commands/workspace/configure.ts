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

import type {
  CfsPluginProperty,
  CfsProject,
  CfsSocDataModel,
  CfsWorkspace
} from 'cfs-types';

import {Command, Flags} from '@oclif/core';
import {CfsDataModelManager} from 'cfs-lib';
import {writeFileSync} from 'node:fs';

import {getSocCatalog} from '../../utils/catalog-manager.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  convertToPascalCase,
  findSocByName,
  getLatestPluginVersion,
  getPackageName
} from '../../utils/utils.js';
import {
  checkErrors,
  getValidTemplate
} from '../../utils/workspace-utils.js';

interface CoreInfo extends CfsProject {
  core: string;
  firmwarePlatform: string; // From plugin
}

interface TemplateValidationInfo {
  board: string;
  cores: CoreInfo[];
  soc: string;
  socPackage?: string;
}

export default class WorkspaceConfigure extends Command {
  static description =
    'Generate a CFS configuration file from the command line options. The file can be edited then used as an input to the workspace create command.';

  static examples = [
    '<%= config.bin %> <%= command.id %> --soc ADSP-SC835 --core FX --template-id com.analog.project.sharcfx.plugin --core CM33 --template-id com.analog.project.sharcfx.plugin -o c:/tmp --name myNewWorkspace --board ADSPSC835-EV-SOM -w myWorkspaceConfig.json',
    '<%= config.bin %> <%= command.id %>  -w myWorkspaceConfig.json // Creates workspace at c:/tmp/myNewWorkspace'
  ];

  static flags = {
    'workspace-file': Flags.file({
      char: 'w',
      required: false,
      summary:
        'Name of the generated CFS workspace configuration file.',
      default: 'cfsworkspace.json'
    }),
    name: Flags.string({
      required: false,
      summary: 'Name for new workspace'
    }),
    output: Flags.directory({
      char: 'o',
      summary: 'Output directory for the workspace.'
    }),
    soc: Flags.string({
      required: true,
      summary: 'SoC name'
    }),
    board: Flags.string({
      required: true,
      summary: 'Board name'
    }),
    package: Flags.string({
      required: false,
      summary: 'Package name'
    }),
    core: Flags.string({
      required: true,
      summary:
        'Core name. Can be specified more than once, each followed by --template-id',
      multiple: true
    }),
    'template-id': Flags.string({
      required: true,
      summary:
        'Template ID for the preceding --core flag. Must be specified for each --core',
      multiple: true
    }),
    'template-version': Flags.string({
      required: false,
      summary:
        'Optional template version for the preceding --template-id flag. Can be specified more than once',
      multiple: true
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true
    }),
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Verbose output.'
    })
  };

  /*
   * Check that the number of --core and --template-id flags are the same, and that at least one is provided
   * This is probably unnecessary as the validation function *should* catch this.
   * @param coreCount - The number of --core flags provided
   * @param templateIdCount - The number of --template-id flags provided
   * @param errors - The array to push error messages into
   * @returns void
   *
   */
  checkCoreCount(
    coreCount: number,
    templateIdCount: number,
    errors: string[]
  ): void {
    if (coreCount !== templateIdCount) {
      errors.push(
        `Mismatch between --core ('${coreCount}') and --template-id ('${templateIdCount}') flags. ` +
          'Each --core must be paired with a --template-id.'
      );
    }

    if (coreCount === 0) {
      errors.push(
        'At least one --core and --template-id pair must be specified.'
      );
    }
  }

  /**
   * Check that the parameters following the current parameter are valid:
   * - The next arg should be a value (i.e. not starting with '--')
   * - The argument after that should be another flag
   * This is made more complicated by the fact that we can specify args
   * as --flag value --flag=value, so we have to account for both cases.
   * @param args - The argument array
   * @param index - The index into the array
   * @param errors - The array to push error messages into
   * @returns void
   */
  checkValue(args: string[], index: number, errors: string[]): void {
    if (args[index].includes('=')) {
      if (
        args.length > index + 1 &&
        !args[index + 1].startsWith('-')
      ) {
        errors.push(
          `${args[index]} flag accepts only one value. Found multiple values after ${args[index]}.`
        );
      }
    } else {
      if (
        args.length <= index + 1 ||
        args[index + 1].startsWith('-')
      ) {
        errors.push(
          `${args[index]} flag requires exactly one value.`
        );
      }

      if (
        args.length > index + 2 &&
        !args[index + 2].startsWith('-')
      ) {
        errors.push(
          `${args[index]} flag accepts only one value. Found multiple values after ${args[index]}.`
        );
      }
    }
  }

  /**
   * Generate a cfs workspace config file based on the provided flags and core information
   * @param flags - The command line flags provided by the user
   * @param cores - Information about the cores
   * @returns void
   */
  async createCfsConfigFile(
    flags: {
      fileName: string;
      name: string;
      output: string;
      soc: string;
      board: string;
      socPackage: string;
    },
    cores: CoreInfo[]
  ) {
    const workspace: CfsWorkspace = {
      Copyright:
        '(C) Analog Devices, Inc 2026. Generated by CodeFusion Studio CLI',
      Timestamp: new Date().toISOString(),
      soc: flags.soc.toUpperCase(),
      package: flags.socPackage,
      board: flags.board,
      workspaceName: flags.name,
      location: flags.output,
      workspacePluginId: '',
      workspacePluginVersion: '',
      projects: []
    };

    // Set up the projects
    for (const core of cores) {
      workspace.projects?.push({
        ...core
      });
    }

    // Finally, convert the workspace object to PascalCase and write to file
    const pascalCasedWorkspace = convertToPascalCase(workspace);

    writeFileSync(
      flags.fileName,
      JSON.stringify(pascalCasedWorkspace, null, 2),
      'utf8'
    );
  }

  /**
   * Gather information about each core into an array of CoreInfo objects
   * Information comes from the catalog, data model and plugin.
   * @param templateIds - array of template IDs passed with --template-id
   * @param templateVersions - array of optional template versions passed with --template-version
   * @param coreNames - array of core names passed with --core
   * @param socName - SoC name
   * @param packageName - package name. Might have been passed using --package, or taken from the catalog
   * @param dmManager - The data model manager
   * @param pluginManager - The plugin manager
   * @param errors - An array to collect any validation error messages.
   * @returns A promise that resolves when validation is complete.   */
  // eslint-disable-next-line max-params
  async gatherCoreInfo(
    templateIds: string[],
    templateVersions: string[],
    coreNames: string[],
    socName: string,
    packageName: string,
    dataModel: CfsSocDataModel,
    pluginManager: ReturnType<typeof getPluginManager>,
    board: string,
    errors: string[]
  ): Promise<CoreInfo[]> {
    const cores: CoreInfo[] = [];

    const catalog = await getSocCatalog(this.config, false);
    const socs = await catalog.getAll();
    const soc = findSocByName(socs, socName);
    const pluginListInfo = await pluginManager.getPluginsInfoList();

    for (let i = 0; i < (coreNames?.length ?? 0); i++) {
      const coreId = coreNames?.[i];
      let templateVersion: string | undefined = templateVersions[i];
      if (coreId) {
        // If template version is not specified, get the latest one we can find
        if (!templateVersion) {
          templateVersion = getLatestPluginVersion(
            templateIds[i],
            pluginListInfo
          );
          if (!templateVersion) {
            // If we get an error at this point, we can't really continue for this core
            errors.push(
              `Template '${templateIds[i]}' not found in available plugins.`
            );

            continue;
          }
        }

        const pluginProjectProperties =
          await pluginManager.getProperties(
            templateIds[i],
            templateVersion,
            'project',
            {soc: socName, boardId: board, package: packageName}
          );

        // For each property, extract the id and the default value into a simple record
        const platformConfig: Record<string, string> = {};
        for (const prop of pluginProjectProperties as CfsPluginProperty[]) {
          platformConfig[prop.id] = prop.default as string;
          // Hack: Override ProjectName with core Id. It's not defined when we read it from the plugin.
          if (prop.id === 'ProjectName') {
            platformConfig[prop.id] = coreId;
          }
        }

        // Get core data from the data model. If the supplied core name is invalid,
        // issue an error.
        const dmCore = dataModel.Cores.find(
          (core) => core.Id === coreNames[i]
        );
        if (!dmCore) {
          errors.push(
            `Core '${coreNames[i]}' not found for SoC '${socName}' and Package '${packageName}'.`
          );

          continue;
        }

        // Find the core information from the catalog
        const core = soc?.cores.find(
          (core) => core.dataModelCoreID === coreNames[i]
        );

        if (!core) {
          errors.push(
            `Core information for Core '${coreNames[i]}' not found in catalog for SoC '${socName}'.`
          );
          continue;
        }

        const firmwarePlatform = pluginListInfo.find(
          (pluginInfo) =>
            pluginInfo.pluginId === templateIds[i] &&
            pluginInfo.pluginVersion === templateVersion
        )?.firmwarePlatform;

        cores.push({
          core: coreNames[i],
          project: '',
          path: '',
          soc: socName.toUpperCase(),
          package: packageName,
          coreId: coreNames[i],
          id: core.id ?? '',
          name: core.name ?? '',
          firmwarePlatform: firmwarePlatform ?? '',
          isPrimary: dmCore?.IsPrimary ?? false,
          isEnabled: true,
          pluginId: templateIds[i],
          pluginVersion: templateVersion,
          platformConfig
        });
      }
    }

    return cores;
  }

  async run() {
    const {flags} = await this.parse(WorkspaceConfigure);
    const errors: string[] = [];

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

    // If the package name is not provided, attempt to find it based on the provided board and SoC names
    if (!flags.package) {
      flags.package = await getPackageName(
        this.config,
        flags.board,
        flags.soc,
        errors
      );
    }

    // Validate that --core and --template-id cmd-line switches are properly paired
    this.validateCoreTemplatePairs(errors);

    // If there are any errors, display them all and exit
    checkErrors(errors, this);

    // The error checking above will have caught this already, but TypeScript doesn't know that,
    // so we have to assert that flags.package is defined for the rest of the function.
    if (!flags.package) {
      this.error(
        `Package name is required but could not be determined from the provided board and SoC names. Please specify the package name using the --package flag.`
      );
    }

    const dataModel = await dmManager.getDataModel(
      flags.soc,
      flags.package
    );

    // Issue an error if the data model cannot be found for the specified soc/package combination, as we need the data model to extract the core information for the .cfsconfig
    if (!dataModel) {
      this.error(
        `Data model not found for SoC '${flags.soc}' and Package '${flags.package}'. A data model is required to generate the .cfsconfig file.`
      );
    }

    // Place the cores, template IDs and optional versions into an array of objects for easier handling
    const cores: CoreInfo[] = await this.gatherCoreInfo(
      flags[`template-id`],
      flags[`template-version`] ?? [],
      flags.core,
      flags.soc,
      flags.package, // If a value wasn't set for flags.package, we'll have issued an error already.
      dataModel,
      pluginManager,
      flags.board,
      errors
    );

    // Validate that the specified templates are compatible with the specified soc/board/package combination
    await this.validateTemplates(
      {
        board: flags.board,
        soc: flags.soc,
        socPackage: flags.package,
        cores
      },
      pluginManager,
      flags.verbose,
      errors
    );

    // If there are any errors, display them all and exit
    checkErrors(errors, this);

    // If validation passed, generate the .cfsconfig file
    await this.createCfsConfigFile(
      {
        fileName: flags['workspace-file'],
        name: flags.name ?? '',
        output: flags.output ?? '',
        board: flags.board,
        soc: flags.soc,
        socPackage: flags.package
      },
      cores
    );

    this.log(`${flags['workspace-file']} generated successfully.`);
  }

  /*
   * Validates that the --core and --template-id flags are properly paired and that at least one pair is provided.
   * Each --core flag must be immediately followed by a --template-id flag, and optionally a --template-version flag.
   * Valid: --core A --template-id B --core C --template-id D
   * Valid: --core A --template-id B --template-version V1 --core C --template-id D
   * Invalid: --core A --core C --template-id D --template-id B
   * Invalid: --core A --template-id B --template-version V1 --template-id D
   * Invalid: --core A --template-version V1 --template-id B
   *
   * @param errors - The array to push error messages into
   * @returns void
   */
  validateCoreTemplatePairs(errors: string[]): void {
    // Get the raw command line arguments
    const args = this.argv;

    // Track state machine for flag order validation
    let expectingTemplateId = false;
    let expectingVersion = false;
    let coreCount = 0;
    let templateIdCount = 0;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--core') || arg.match('-c')) {
        if (expectingTemplateId) {
          errors.push(
            'Invalid flag order: --template-id must immediately follow --core.\n'
          );
        }

        this.checkValue(args, i, errors);

        coreCount++;
        expectingTemplateId = true;
        expectingVersion = false;

        if (!arg.includes('=')) {
          i++; // Skip the value
        }
      } else if (arg.startsWith('--template-id')) {
        if (!expectingTemplateId) {
          errors.push(
            'Invalid flag order: --template-id must immediately follow --core.\n'
          );
        }

        this.checkValue(args, i, errors);

        templateIdCount++;
        expectingTemplateId = false;
        expectingVersion = true; // May be followed by --template-version

        if (!arg.includes('=')) {
          i++; // Skip the value
        }
      } else if (arg.startsWith('--template-version')) {
        if (!expectingVersion) {
          errors.push(
            'Invalid flag order: --template-version must immediately follow --template-id.\n' +
              'Valid: --core A --template-id B --template-version V1'
          );
        }

        this.checkValue(args, i, errors);

        if (!arg.includes('=')) {
          i++; // Skip the value
        }
      } else if (arg.startsWith('-')) {
        // Another flag encountered
        if (expectingTemplateId) {
          errors.push(
            'Invalid flag order: --template-id must immediately follow --core.\n'
          );
        }

        // If expectingVersion is set, just reset the flag
        expectingVersion = false;
      }
    }

    this.checkCoreCount(coreCount, templateIdCount, errors);
  }

  /**
   * Validates that the specified templates are compatible with the specified soc/board/package combination.
   * @param templateInfo - An object containing the board, soc, socPackage and templates to validate.
   * @param pluginManager - The plugin manager instance to use for retrieving template information.
   * @param verbose - Whether to log verbose output during validation.
   * @param errors - An array to collect any validation error messages.
   * @returns A promise that resolves when validation is complete.
   */
  async validateTemplates(
    templateInfo: TemplateValidationInfo,
    pluginManager: ReturnType<typeof getPluginManager>,
    verbose: boolean,
    errors: string[]
  ) {
    const {cores, board, soc, socPackage} = templateInfo;
    for (let i = 0; i < (cores.length || 0); i++) {
      const {core, pluginId, pluginVersion} = cores[i];

      if (pluginId) {
        await getValidTemplate(
          {
            soc,
            board,
            package: socPackage,
            'template-id': pluginId,
            'template-version': pluginVersion,
            core
          },
          pluginManager,
          errors
        );
        if (verbose) {
          console.log(
            `Template validation passed for Core '${core}', plugin ID '${pluginId}' and version '${pluginVersion ?? 'latest'}'.`
          );
        }
      } else {
        errors.push(
          `Each --core value must be paired with a --template-id. Missing --template-id for Core '${core}'.`
        );
      }
    }
  }
}

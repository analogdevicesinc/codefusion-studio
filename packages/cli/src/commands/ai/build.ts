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
import {Flags} from '@oclif/core';
import {getAiToolsPlugin, getValidExtensions} from 'cfs-lib';
import AIToolsPlugin from 'cfs-lib/dist/ai-tools/index.js';
import {AIModelBackend, CfsConfig, CfsSocDataModel} from 'cfs-types';
import {promises as fs} from 'node:fs';
import path, {extname} from 'node:path';

import {
  BaseCommand,
  type CliRunResponse
} from '../../utils/base-command.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {getAuthConfig} from '../../utils/session-manager.js';
import {
  getCfsConfig,
  getCfsaiPath,
  getVersionFromConfig
} from '../../utils/utils.js';

export default class Build extends BaseCommand<typeof Build> {
  static description = `Compile a model into source code.`;

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --soc MAX32690 --core CM4 --model PATH_TO_MODEL',
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG'
  ];

  static flags = {
    config: Flags.string({
      summary: 'Path to .cfsconfig file',
      required: false
    }),
    soc: Flags.string({
      char: 's',
      summary: 'Target SoC',
      required: false
    }),
    package: Flags.string({
      char: 'p',
      summary: 'SoC package',
      required: false
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target core',
      required: false
    }),
    acc: Flags.string({
      char: 'a',
      summary: 'Target accelerator.',
      required: false
    }),
    model: Flags.string({
      char: 'm',
      summary: 'Path or URL to the model file',
      required: false
    }),
    dataset: Flags.string({
      required: false,
      summary: 'Path or URL to the sample dataset for the model'
    }),
    cwd: Flags.string({
      summary: 'Change the working directory to a specified path',
      required: false,
      default: '.'
    }),
    'output-path': Flags.string({
      char: 'o',
      summary:
        'Output directory for generated files, relative to cwd',
      required: false
    }),
    'network-config': Flags.string({
      summary:
        'Path or URL to the Izer network configuration YAML. Required when `--backend` is "izer"',
      required: false
    }),
    backend: Flags.string({
      char: 'b',
      summary: 'Name of backend to use',
      required: false
    }),
    extension: Flags.string({
      char: 'e',
      summary: 'Backend specific fields provided as key=value pairs',
      multiple: true
    }),
    'search-path': Flags.string({
      char: 'x',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true
    }),
    'ignore-cache': Flags.boolean({
      name: 'ignore-cache',
      summary: 'Bypass cache and fetch latest remote files'
    })
  };

  async run(): Promise<CliRunResponse> {
    const {flags} = this;

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      getVersionFromConfig(this.config)
    );
    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      flags['search-path']
    );

    let config: CfsConfig;
    // Config file provided, read into structure
    if (flags.config) {
      if (flags.soc || flags.core || flags.model) {
        this.warn(
          '--soc, --core and --model are ignored if --config is provided.'
        );
      }

      const fileContent = await fs.readFile(flags.config, 'utf8');
      config = JSON.parse(fileContent) as CfsConfig;
    } else if (flags.soc && flags.core && flags.model) {
      // Change cases to match datamodel expectations
      flags.soc = flags.soc?.toLowerCase();
      flags.core = flags.core?.toUpperCase();
      flags.package = flags.package?.toLowerCase();
      flags.acc = flags.acc?.toUpperCase();

      if (!flags.package) {
        flags.package = await dmManager.getFirstPackageIdForSoc(
          flags.soc
        );
        if (!flags.package) {
          throw new RecoverableError(
            `No packages found for SoC '${flags.soc}'`,
            {
              suggestion:
                'Verify the SoC name is correct or required package is available',
              run: `cfsutil socs list`
            }
          );
        }
      }

      const backend: AIModelBackend | undefined =
        await this.createAIModelBackend(
          aiPlugin,
          flags.extension ?? [],
          flags.backend
        );

      // Construct CfsConfig
      config = {
        Copyright: '',
        DataModelVersion: '',
        DataModelSchemaVersion: '',
        Soc: flags.soc,
        Pins: [],
        ClockNodes: [],
        Timestamp: '',
        Package: flags.package,
        BoardName: '',
        Projects: [
          {
            CoreId: flags.core,
            ProjectId: '.',
            PlatformConfig: {ProjectName: flags.cwd},
            FirmwarePlatform: 'cfsai',
            ExternallyManaged: false,
            Partitions: [],
            Peripherals: [],
            PluginId: 'cfsai',
            PluginVersion: '0.0.0',
            AIModels: [
              {
                Name: getBaseName(flags.model),
                Files: {
                  Model: flags.model,
                  ...(flags['network-config'] && {
                    NetworkConfig: flags['network-config']
                  }),
                  ...(flags.dataset && {
                    Dataset: flags.dataset
                  })
                },
                OutDir: flags['output-path'] || '.',
                Target: {
                  Core: flags.core,
                  Accelerator: flags.acc
                },
                ...(backend && {Backend: backend}),
                Enabled: true
              }
            ]
          }
        ]
      };
    } else {
      const {config: cfsConfig, pathToConfig} = getCfsConfig();
      this.log(`Using config located at:`, pathToConfig);
      config = cfsConfig;
    }

    // get datamodel
    const dataModel: CfsSocDataModel | undefined =
      await dmManager.getDataModel(config.Soc, config.Package);
    if (!dataModel) {
      throw new RecoverableError(
        `Could not load data model for SoC '${config.Soc}', Package '${config.Package}'`,
        {
          suggestion: 'Verify the SoC and Package are compatible',
          run: `cfsutil socs info ${config.Soc} --packages`
        }
      );
    }

    aiPlugin.setJsonMode(this.jsonEnabled());

    const authConfig = getAuthConfig();

    const output = await aiPlugin.generateFromConfig(
      config,
      dataModel,
      flags.cwd,
      authConfig,
      undefined,
      flags['ignore-cache']
    );

    return this.handlePythonOutput(output);
  }

  private async createAIModelBackend(
    aiPlugin: AIToolsPlugin,
    extensions: string[],
    name?: string
  ): Promise<AIModelBackend | undefined> {
    if (!name) {
      if (extensions.length > 0) {
        throw new RecoverableError(
          '--backend is required if --extension is provided',
          {
            suggestion:
              'Ensure you specify a valid backend when providing extensions',
            run: 'cfsutil ai backends list'
          }
        );
      } else {
        // No backend name or extensions specified
        return undefined;
      }
    }

    const validProperties =
      await aiPlugin.getPropertiesFromName(name);

    const validExtensions = getValidExtensions(
      extensions,
      validProperties
    );

    return {
      Name: name,
      Extensions: validExtensions
    };
  }
}

function getBaseName(filename: string): string {
  try {
    // If it's a URL, parse it
    const url = new URL(filename);
    return path.basename(url.pathname, path.extname(url.pathname));
  } catch {
    // Not a URL → treat as local path
    return path.basename(filename, extname(filename));
  }
}

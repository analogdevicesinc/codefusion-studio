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
import type {AIToolsPlugin} from 'cfs-lib';
import type {
  AIModelBackend,
  AiCommandResult,
  CfsConfig as CfsConfigType,
  CfsSocDataModel,
  SocControl
} from 'cfs-types';

import {Flags} from '@oclif/core';
import {
  CURRENT_SCHEMA_VERSION,
  CfsConfigError,
  getAiToolsPlugin,
  getValidExtensions
} from 'cfs-lib';
import path from 'node:path';

import {
  ensureOrTryInferCoreFlags,
  getAndEnsureDataModel,
  getBaseName,
  getModelFormat,
  inferBackendFromFlags
} from '../../utils/ai-command-utils.js';
import {getApiClient} from '../../utils/api-client.js';
import {BaseAiCommand} from '../../utils/base-ai-command.js';
import {validateCfsConfigFile} from '../../utils/config-validation.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {
  getCfsConfig,
  getCfsaiPath,
  getVersionFromConfig
} from '../../utils/utils.js';

export default class Build extends BaseAiCommand<typeof Build> {
  static useResponseEnvelope = true;

  static description = `Compile a model into source code.`;

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --soc MAX32690 --core CM4 --model PATH_TO_MODEL',
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG',
    '<%= config.bin %> <%= command.id %> --soc ae822fa0e5597xx0 --core M55_HP --model model.tflite --backend vela -e Optimise=Size'
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

  async run(): Promise<AiCommandResult> {
    const {flags} = this;
    const warnings: string[] = [];

    const apiClient = await getApiClient({optional: true}, this);

    const packageManager = await getPackageManager(
      {
        acceptUndefined: true
      },
      apiClient,
      this
    );

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      getVersionFromConfig(this.config),
      packageManager
    );

    // Set plugin modes before backend inference
    aiPlugin.setJsonMode(this.jsonEnabled());
    aiPlugin.setVerbose(flags.verbose);
    aiPlugin.setQuiet(flags.quiet);

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      flags['search-path']
    );

    let dataModel: CfsSocDataModel | undefined;
    let cwd: string | undefined;
    let config: CfsConfigType;

    // Config file provided, read into structure
    if (flags.config) {
      if (flags.soc || flags.core || flags.model) {
        warnings.push(
          '--soc, --core and --model are ignored if --config is provided.'
        );
      }

      config = await this.getValidConfigFromPath(
        flags.config,
        this.config,
        flags['search-path']
      );
    } else if (flags.soc && flags.model) {
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
              run: `cfsutil socs list`,
              code: 'SOC_PACKAGE_NOT_FOUND'
            }
          );
        }
      }

      dataModel = await getAndEnsureDataModel(
        flags.soc,
        flags.package,
        dmManager
      );

      ensureOrTryInferCoreFlags(flags, dataModel, warnings);

      const backend: AIModelBackend | undefined =
        await this.createAIModelBackend(
          aiPlugin,
          flags.extension ?? [],
          await inferBackendFromFlags(aiPlugin, flags, dataModel)
        );

      // Construct CfsConfig
      config = {
        Copyright: '',
        SchemaVersion: CURRENT_SCHEMA_VERSION,
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
            PlatformConfig: {ProjectName: '.'},
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
      const {pathToConfig} = getCfsConfig();
      config = await this.getValidConfigFromPath(
        pathToConfig,
        this.config,
        flags['search-path']
      );
      this.log(`Using config located at:`, pathToConfig);
      // set cwd relative to workspace
      cwd = path.resolve(path.dirname(pathToConfig), '..');
    }

    // get datamodel
    dataModel ??= await getAndEnsureDataModel(
      config.Soc,
      config.Package,
      dmManager
    );

    const effectiveModel =
      flags.model ?? config.Projects[0]?.AIModels?.[0]?.Files?.Model;

    this.telemetryMetadata = {
      soc: config.Soc,
      core: config.Projects[0]?.CoreId,
      backend: config.Projects[0]?.AIModels?.[0]?.Backend?.Name,
      modelFormat: getModelFormat(effectiveModel)
    };

    if (cwd && flags.cwd !== '.') {
      warnings.push(
        '--cwd is ignored when .cfsconfig path is inferred.'
      );
    }

    const hasSlowBackend = await this.hasSlowBackend(
      aiPlugin,
      config,
      dataModel
    );

    if (hasSlowBackend) {
      this.log(
        'INFO: Invoking code generation may take several minutes. Please wait...'
      );
    }

    const result = await aiPlugin.generateFromConfig(
      config,
      dataModel,
      cwd ?? path.resolve(flags.cwd),
      apiClient,
      undefined,
      flags['ignore-cache']
    );

    return this.handleResult(result, warnings);
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

    let validProperties: SocControl[] = [];

    try {
      validProperties = await aiPlugin.getPropertiesFromName(name);
    } catch (error) {
      // swallow thrown error for recoverable one
      throw new RecoverableError(
        error instanceof Error
          ? error.message
          : `No backend properties found for '${name}'`,
        {
          suggestion: 'Verify the backend is properly configured',
          run: `cfsutil ai backends list --name ${name}`,
          code: 'BACKEND_PROPERTIES_NOT_FOUND'
        }
      );
    }

    const validExtensions = getValidExtensions(
      extensions,
      validProperties
    );

    return {
      Name: name,
      Extensions: validExtensions
    };
  }

  private async hasSlowBackend(
    aiPlugin: AIToolsPlugin,
    config: CfsConfigType,
    dataModel: CfsSocDataModel
  ): Promise<boolean> {
    for (const project of config.Projects) {
      for (const model of project.AIModels ?? []) {
        if (String(model.Enabled).toLowerCase() !== 'true') continue;

        const core = model.Target.Core;
        const isSlow = await aiPlugin.isBackendSlow({
          Soc: config.Soc,
          Core: core,
          Family: dataModel.Cores.find(
            (c) => c.Id.toLowerCase() === core.toLowerCase()
          )?.Family
        });

        if (isSlow) return true;
      }
    }

    return false;
  }

  private async getValidConfigFromPath(
    configPath: string,
    cliConfig: Config,
    searchPaths?: string[]
  ): Promise<CfsConfigType> {
    try {
      const {config: cfsConfig, diagnostics} =
        await validateCfsConfigFile(
          configPath,
          cliConfig,
          searchPaths
        );

      if (
        !cfsConfig ||
        diagnostics.some((d) => d.severity === 'critical')
      ) {
        throw new RecoverableError(
          'Configuration validation failed.',
          {
            suggestion: 'Run validate config to see all issues',
            run: `cfsutil validate config -i ${configPath}`
          }
        );
      }

      return cfsConfig;
    } catch (error) {
      if (error instanceof CfsConfigError) {
        if (error.code === 'SCHEMA_INVALID') {
          throw new RecoverableError(`${error.message}`, {
            suggestion: 'Run validate config to see all issues',
            run: `cfsutil validate config -i ${configPath}`,
            code: 'SCHEMA_INVALID'
          });
        }

        this.error(error.message, {code: error.code});
      }

      throw error;
    }
  }
}

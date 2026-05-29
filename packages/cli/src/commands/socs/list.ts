/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {CorePart} from 'cfs-ccm-lib';
import {DataModelMetaData} from 'cfs-lib';

// Type required for legacy output format
import type {Soc} from '../../types/soc.js';

import {getSocCatalog} from '../../utils/catalog-manager.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../utils/error-handler.js';
import {getPackageManager} from '../../utils/package-manager.js';

export default class List extends Command {
  static aliases = ['soc:list'];

  static description = `Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search paths.`;

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --verbose'
  ];

  static flags = {
    format: Flags.string({
      char: 'f',
      default: 'text',
      summary: 'Set the data encoding format',
      options: ['text', 'json']
    }),
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Include additional SoC details.'
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional custom search path for SoC data models. Can be used multiple times',
      multiple: true
    }),
    legacy: Flags.boolean({
      char: 'l',
      summary: 'Use legacy format for output.'
    })
  };

  formatDetailedSocMetaData = async (
    metadataList: DataModelMetaData[],
    catalogSocsDict: Record<string, CorePart[]>
  ) =>
    metadataList.map((soc) => {
      const aiCompatibleCores =
        catalogSocsDict[soc.name.toLowerCase()]
          ?.filter((core) => core.supportsAI)
          .map((core) => core.dataModelCoreID) ?? [];

      return {
        Name: soc?.name.toLocaleLowerCase(),
        Package: soc?.package.toLocaleLowerCase(),
        Version: soc?.version,
        Timestamp: soc?.timestamp,
        Description: soc?.description,
        Schema: soc?.schema,
        AICores: aiCompatibleCores.join(', ')
      };
    });

  async run() {
    const {flags} = await this.parse(List);

    const customSearchPaths = flags['search-path'] ?? [];

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      customSearchPaths
    );

    let socList: DataModelMetaData[];

    try {
      socList = await dmManager.listDataModels();
    } catch (error) {
      handleMissingDependencyError(error);
      this.error((error as Error).message);
    }

    if (flags.legacy) {
      this.warn(
        'This is a legacy format and will be removed in future releases.'
      );

      const formatDetailedSocMetaDataLegacy = async (
        metadataList: DataModelMetaData[]
      ) => {
        const formattedMetadataList = metadataList.map((soc) => ({
          [`${soc?.name.toLowerCase()}-${soc?.package.toLowerCase()}`]:
            {
              Version: soc?.version,
              Timestamp: soc?.timestamp,
              Name: soc?.name,
              Description: soc?.description,
              Schema: soc?.schema
            }
        }));

        const detailedSocsInfo: Record<
          string,
          Partial<Soc>
        > = Object.assign({}, ...formattedMetadataList);

        return detailedSocsInfo;
      };

      if (flags.verbose) {
        const socMetaData =
          await formatDetailedSocMetaDataLegacy(socList);

        if (flags.format === 'json') {
          this.log(JSON.stringify(socMetaData, null, 2));
        } else {
          for (const [socName, socDetail] of Object.entries(
            socMetaData
          )) {
            this.log(socName);
            this.log(`Version: ${socDetail.Version}`);
            this.log(`Timestamp: ${socDetail.Timestamp}`);
            this.log(`Name: ${socDetail.Name}`);
            this.log(`Description: ${socDetail.Description}`);
            this.log(`Schema: ${socDetail.Schema}`);
            this.log('');
          }
        }
      } else {
        const socNames = [
          ...new Set(
            socList.map(
              (soc) =>
                `${soc.name.toLocaleLowerCase()}-${soc.package.toLocaleLowerCase()}`
            )
          )
        ];

        this.log(
          flags.format === 'json'
            ? JSON.stringify(socNames, null, 2)
            : socNames.join('\n')
        );
      }

      return;
    }

    if (flags.verbose) {
      const socDict = await this.getSocDict();

      const socMetaData = await this.formatDetailedSocMetaData(
        socList,
        socDict
      );

      if (flags.format === 'json') {
        this.log(JSON.stringify(socMetaData, null, 2));
      } else {
        for (const soc of socMetaData) {
          this.log(`Name: ${soc.Name}`);
          this.log(`Package: ${soc.Package}`);
          this.log(`Version: ${soc.Version}`);
          this.log(`Timestamp: ${soc.Timestamp}`);
          this.log(`Description: ${soc.Description}`);
          this.log(`Schema: ${soc.Schema}`);
          this.log(`AI Compatible cores: ${soc?.AICores}`);
          this.log('');
        }
      }

      if (Object.keys(socDict).length === 0) {
        this.log('');
        this.log(
          'Error reading catalog data. Some information might be incorrect. '
        );
      }
    } else {
      const socNames: Record<string, Set<string>> = {};

      for (const soc of socList) {
        const socName = soc.name.toLocaleLowerCase();
        if (!(socName in socNames)) {
          socNames[socName] = new Set();
        }

        socNames[socName].add(soc.package.toLocaleLowerCase());
      }

      // Replace set by array for stringification
      const socNamesArray = Object.fromEntries(
        Object.entries(socNames).map(([key, value]) => [
          key,
          [...value]
        ])
      );

      this.log(
        flags.format === 'json'
          ? JSON.stringify(socNamesArray, null, 2)
          : Object.entries(socNamesArray)
              .map(([soc, pkgs]) => `${soc} (${pkgs.join(', ')})`)
              .join('\n')
      );
    }
  }

  private async getSocDict(): Promise<Record<string, CorePart[]>> {
    try {
      const catalog = await getSocCatalog(this.config, false);
      const socs = await catalog.getAll();

      const socsDict = {} as Record<string, CorePart[]>;
      for (const soc of socs) {
        socsDict[soc.name.toLowerCase()] = soc.cores;
      }

      return socsDict;
    } catch {
      return {};
    }
  }
}

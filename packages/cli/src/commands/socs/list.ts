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
import {DataModelMetaData} from 'cfs-lib';

import type {Soc} from '../../types/soc.js';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';

export default class List extends Command {
  static description = `
		Lists all SoCs that have been installed through the package manager,
		as well as the ones present in custom search paths.`;

  static flags = {
    format: Flags.string({
      char: 'f',
      default: 'text',
      summary: 'Set the data encoding format.',
      options: ['text', 'json']
    }),
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Include additional SoC details.'
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional custom search path(s) for SoC data models.',
      multiple: true
    })
  };

  formatDetailedSocMetaData = async (
    metadataList: DataModelMetaData[]
  ) => {
    const formattedMetadataList = metadataList.map((soc) => ({
      [`${soc?.name.toLowerCase()}-${soc?.package.toLowerCase()}`]: {
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

    const socList = await dmManager
      .listDataModels()
      .catch((error: Error) => this.error(error.message));

    if (flags.verbose) {
      const socMetaData =
        await this.formatDetailedSocMetaData(socList);

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
  }
}

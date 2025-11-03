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

import type {CfsPluginInfo} from 'cfs-lib';

import {Command, Flags} from '@oclif/core';
import {CfsFeatureScope} from 'cfs-lib';

import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';

export default class PluginList extends Command {
  static description = 'Lists available plugins';

  static examples: Command.Example[] = [
    {
      description: 'List all available plugins',
      command: 'cfsutil cfsplugins list'
    },
    {
      description: 'Filter plugins by SoC',
      command: 'cfsutil cfsplugins list --soc MAX32690'
    },
    {
      description: 'Filter plugins by board',
      command: 'cfsutil cfsplugins list --board EvKit_V1'
    },
    {
      description: 'Filter plugins by service type',
      command: 'cfsutil cfsplugins list --service workspace'
    },
    {
      description: 'Combine multiple filters',
      command:
        'cfsutil cfsplugins list --soc MAX32690 --board EvKit_V1 --service project'
    },
    {
      description: 'Show configuration options',
      command: 'cfsutil cfsplugins list --config-options'
    },
    {
      description: 'Use custom plugin search path',
      command: 'cfsutil cfsplugins list -s /path/to/plugins'
    },
    {
      description: 'Multiple search paths with filtering',
      command:
        'cfsutil cfsplugins list -s /path1 -s /path2 --soc MAX78000'
    }
  ];

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional plugin search path. Can be used multiple times.',
      multiple: true
    }),
    soc: Flags.string({
      summary: 'Filter results by supported SoC name',
      helpValue: '<soc>'
    }),
    board: Flags.string({
      summary: 'Filter results by supported board name',
      helpValue: '<board>'
    }),
    service: Flags.string({
      summary: 'Filter results by service type',
      helpValue: 'service',
      options: Object.values(CfsFeatureScope)
    }),
    'config-options': Flags.boolean({
      summary:
        'Include configuration options (properties.project) in output'
    })
  };

  async run() {
    const {flags} = await this.parse(PluginList);
    const packageManager = await getPackageManager({
      acceptUndefined: true
    });
    const pluginManager = getPluginManager(
      flags['search-path'],
      packageManager
    );

    // Create filter function based on provided flags
    const filter = (pluginInfo: CfsPluginInfo): boolean => {
      // Filter by SoC
      if (flags.soc) {
        const socMatch = pluginInfo.supportedSocs?.some(
          (soc) =>
            soc.name?.toLowerCase() === flags.soc!.toLowerCase()
        );
        if (!socMatch) return false;
      }

      // Filter by board
      if (flags.board) {
        const boardMatch = pluginInfo.supportedSocs?.some(
          (soc) =>
            soc.board?.toLowerCase() === flags.board!.toLowerCase()
        );
        if (!boardMatch) return false;
      }

      // Filter by service
      if (flags.service) {
        const serviceMatch =
          pluginInfo.features &&
          Object.keys(pluginInfo.features).includes(flags.service!);
        if (!serviceMatch) return false;
      }

      return true;
    };

    const pluginListInfo =
      await pluginManager.getPluginsInfoList(filter);

    if (Array.isArray(pluginListInfo) && pluginListInfo.length > 0) {
      for (let index = 0; index < pluginListInfo.length; index++) {
        const pluginInfo = pluginListInfo[index];
        this.log(pluginInfo.pluginName);
        this.log(pluginInfo.pluginId);
        this.log(pluginInfo.pluginVersion);

        // Include config options if requested
        if (
          flags['config-options'] &&
          pluginInfo.properties?.project
        ) {
          this.log('Configuration Options:');
          for (const prop of pluginInfo.properties.project) {
            this.log(
              `  ${prop.name}: ${prop.description || 'No description'}`
            );
          }
        }

        if (index < pluginListInfo.length - 1) {
          this.log('');
        }
      }
    } else {
      // Handle case when no results are found
      const filterMessages = [];
      if (flags.soc) filterMessages.push(`SoC: ${flags.soc}`);
      if (flags.board) filterMessages.push(`Board: ${flags.board}`);
      if (flags.service)
        filterMessages.push(`Service: ${flags.service}`);

      const filterText =
        filterMessages.length > 0
          ? ` for ${filterMessages.join(', ')}`
          : '';

      this.error(`No plugins found${filterText}.`);
    }
  }
}

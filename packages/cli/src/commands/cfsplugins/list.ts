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

import {getPluginManager} from '../../utils/plugin-manager.js';

export default class PluginList extends Command {
  static description: 'Lists available plugins';

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional plugin search path. Can be used multiple times.',
      multiple: true
    })
  };

  async run() {
    const {flags} = await this.parse(PluginList);
    const pluginManager = getPluginManager(flags['search-path']);
    const pluginListInfo = await pluginManager.getPluginsInfoList();

    if (Array.isArray(pluginListInfo) && pluginListInfo.length > 0) {
      for (const [index, pluginInfo] of pluginListInfo.entries()) {
        this.log(pluginInfo.pluginName);
        this.log(pluginInfo.pluginId);
        this.log(pluginInfo.pluginVersion);
        if (index < pluginListInfo.length - 1) {
          this.log('');
        }
      }
    }
  }
}

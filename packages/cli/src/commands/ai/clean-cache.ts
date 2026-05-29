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
import {getCFSCachePath} from 'cfs-lib';
import fs from 'node:fs/promises';

import {
  BaseCommand,
  type CliRunResponse
} from '../../utils/base-command.js';
import {getVersionFromConfig} from '../../utils/utils.js';

export default class CleanCache extends BaseCommand<
  typeof CleanCache
> {
  static description = 'Clear the cache which stores remote files.';

  static examples: string[] = ['<%= config.bin %> <%= command.id %>'];

  async run(): CliRunResponse {
    const cacheDir = getCFSCachePath(
      getVersionFromConfig(this.config)
    );

    cacheDir &&
      (await fs.rm(cacheDir, {recursive: true, force: true}));

    this.log('CFS AI cache cleared.');
    return {msg: 'CFS AI cache cleared'};
  }
}

/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {Command} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export default class CfsPackageListRemotes extends Command {
  static description =
    'Lists all remote servers that have been registered for package retrieval';

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    const remotes = await packman.listRemotes();
    if (remotes.length === 0) {
      this.log('No registered remotes');
      return;
    }

    this.log('Registered remotes: ');
    for (const {name, url, auth, custom} of remotes) {
      const authDetails = auth
        ? auth.credentialProvider
          ? '\t(' + auth.credentialProvider + ' session)'
          : '\t(username: ' + auth.username + ')' // manually logged in
        : ''; // no auth
      this.log(
        `\t- ${name}: ${url}${authDetails}${custom ? '\t[custom]' : ''}`
      );
    }
  }
}

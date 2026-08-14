/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import Table from 'cli-table3';
import {stripVTControlCharacters, styleText} from 'node:util';

import {getPackageManager} from '../../utils/package-manager.js';
import {tableOutputStyles} from '../../utils/utils.js';

export const pkgListRemotesDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageListRemotes extends Command {
  static description =
    'Lists all remote servers that have been registered for package retrieval.';

  async run(): Promise<void> {
    await this.parse(CfsPackageListRemotes);
    const packman = await pkgListRemotesDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );
    const remotes = await packman.listRemotes();
    if (remotes.length === 0) {
      this.log('No registered package remotes');
      return;
    }

    // when a remote has an error we'll limit the width of the status column so that it wraps and more likely fits the terminal width
    let remoteHasError = false;
    const data = remotes
      .map((r) => {
        remoteHasError = remoteHasError || Boolean(r.configError);
        const authDetails =
          r.custom && r.disabled
            ? 'N/A'
            : r.auth.public
              ? 'None'
              : 'credentialProvider' in r.auth
                ? `${r.auth.credentialProvider} session`
                : `username: ${r.auth.username}`;
        return {
          name: r.name,
          url: r.url.href,
          auth: authDetails,
          custom: r.custom ? 'Yes' : 'No',
          status: r.configError
            ? `Error: ${r.configError.message ?? r.configError.code ?? String(r.configError)}`
            : r.disabled
              ? 'Disabled'
              : 'OK'
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const table = new Table({
      head: ['Name', 'URL', 'Auth', 'Custom', 'Status'],
      wordWrap: true,
      wrapOnWordBoundary: true,
      colWidths: [null, null, null, null, remoteHasError ? 20 : null],
      ...tableOutputStyles()
    });

    for (const remote of data) {
      table.push([
        {content: remote.name, wrapOnWordBoundary: false},
        {content: remote.url, wrapOnWordBoundary: false},
        remote.auth,
        remote.custom,
        remote.status
      ]);
    }

    // table.width is inaccurate when displaying in a terminal due
    // to the ansi control characters used for color and styling.
    const horzTable = table.toString();
    const horzTableWidth = stripVTControlCharacters(
      horzTable.split('\n')[0]
    ).length;

    if (
      !process.stdout.isTTY ||
      horzTableWidth < process.stdout.columns
    ) {
      // horizontal table fits
      this.log(horzTable);
    } else {
      // switch to vertical tables
      for (const remote of data) {
        const verticalTable = new Table({
          wordWrap: true,
          wrapOnWordBoundary: true,
          colWidths: [
            null,
            process.stdout.columns - 15 > 20
              ? process.stdout.columns - 15
              : null
          ],
          ...tableOutputStyles()
        });
        verticalTable.push(
          {
            [styleText('red', 'Name')]: {
              content: remote.name,
              wrapOnWordBoundary: false
            }
          },
          {
            [styleText('red', 'URL')]: {
              content: remote.url,
              wrapOnWordBoundary: false
            }
          },
          {[styleText('red', 'Auth')]: remote.auth},
          {[styleText('red', 'Custom')]: remote.custom},
          {[styleText('red', 'Status')]: remote.status}
        );
        this.log(verticalTable.toString());
      }
    }
  }
}

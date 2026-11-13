/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {BaseCommand} from '../../utils/base-command.js';

import {getPackageManager} from '../../utils/package-manager.js';
import {getSessionManager} from '../../utils/session-manager.js';

export default class CfsMyAnalogLogout extends BaseCommand<
  typeof CfsMyAnalogLogout
> {
  static aliases = ['auth:logout'];
  static deprecateAliases = true;
  static description = 'Log out of the current myAnalog session.';

  static hiddenAliases = ['myAnalog:logout'];
  static useResponseEnvelope = true;

  async run(): Promise<{loggedOut: boolean}> {
    let session;
    let sessionManager;
    try {
      sessionManager = getSessionManager();
      session = await sessionManager.getSession();
    } catch (error) {
      this.error(
        new Error(
          'An error occurred while checking authentication status.  If the issue persists, please reinstall this utility.',
          {
            cause: error
          }
        )
      );
    }

    if (!session) {
      this.log('You are not logged in to myAnalog.');
      return {loggedOut: false};
    }

    try {
      await session.endSession();

      // Reconfigure package manager
      try {
        delete process.env.CFS_API_KEY;
        await getPackageManager(
          {
            acceptUndefined: false,
            useRemotes: true
          },
          undefined,
          this
        );
      } catch (pkgError) {
        this.warn(
          new Error(
            'An error occurred while reconfiguring the package manager.',
            {
              cause: pkgError
            }
          )
        );
      }

      this.log('You have been logged out of myAnalog successfully.');
      return {loggedOut: true};
    } catch (error) {
      this.error(
        new Error(
          'An error occurred while trying to log out of myAnalog.',
          {
            cause: error
          }
        )
      );
    }
  }
}

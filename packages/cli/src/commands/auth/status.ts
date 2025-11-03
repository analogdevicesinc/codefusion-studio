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

import {getSessionManager} from '../../utils/session-manager.js';

export default class CfsAuthStatus extends Command {
  static description = 'Show authentication status.';
  static flags = {
    verbose: Flags.boolean({
      char: 'v'
    })
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(CfsAuthStatus);
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
      this.log('You are not logged in.');
      this.exit();
    }

    this.log(`You are logged in as ${session.userEmail}.`);
    if (flags.verbose) {
      this.log(`Session details:
	User ID: ${session.userId}
	Scopes: ${session.scopes.join(', ')}`);
    }
  }
}

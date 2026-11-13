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

import {getSessionManager} from '../../utils/session-manager.js';

export default class CfsMyAnalogStatus extends BaseCommand<
  typeof CfsMyAnalogStatus
> {
  static aliases = ['auth:status'];
  static deprecateAliases = true;
  static description = 'Show myAnalog session status.';
  static useResponseEnvelope = true;

  static hiddenAliases = ['myAnalog:status'];

  async run(): Promise<
    | {loggedIn: false}
    | {
        loggedIn: true;
        userEmail: string;
        userId: string;
        scopes: string[];
      }
  > {
    const {flags} = this;
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
      if (this.jsonEnabled()) {
        return {loggedIn: false};
      }
      this.exit();
    }

    this.log(
      `You are logged in to myAnalog as ${session.userEmail}.`
    );
    if (flags.verbose) {
      this.log(`Session details:
	User ID: ${session.userId}
	Scopes: ${session.scopes.join(', ')}`);
    }

    return {
      loggedIn: true,
      userEmail: session.userEmail,
      userId: session.userId,
      scopes: session.scopes
    };
  }
}

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

import {
  createSessionManager,
  createStderrSessionUrlHandler,
  getSessionManager
} from '../../utils/session-manager.js';

type LoginResult = {
  alreadyLoggedIn: boolean;
  loggedIn: true;
  scopes: string[];
  userEmail: string;
  userId: string;
};

function buildLoginResult(
  session: Pick<LoginResult, 'scopes' | 'userEmail' | 'userId'>,
  alreadyLoggedIn: boolean
): LoginResult {
  return {
    loggedIn: true,
    alreadyLoggedIn,
    userEmail: session.userEmail,
    userId: session.userId,
    scopes: session.scopes
  };
}

export default class CfsMyAnalogLogin extends BaseCommand<
  typeof CfsMyAnalogLogin
> {
  static aliases = ['auth:login'];
  static deprecateAliases = true;
  static description =
    'This will attempt to open your default web browser to log in to your myAnalog account.  It will also display a URL you can open manually if the browser does not open automatically.  The URL must be opened within 5 minutes and on the same machine this command is ran on.';

  static hiddenAliases = ['myAnalog:login'];
  static summary = 'Log in with a myAnalog account.';
  static useResponseEnvelope = true;

  async run(): Promise<LoginResult> {
    const {flags} = this;
    let session;
    let sessionManager;
    try {
      sessionManager = this.jsonEnabled()
        ? createSessionManager(
            createStderrSessionUrlHandler((message) =>
              process.stderr.write(message)
            )
          )
        : getSessionManager();
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

    if (session) {
      this.log(
        `You are already logged in to myAnalog as ${session.userEmail}.`
      );
      this.log(
        'To log in with a different account, please log out first.'
      );
      return buildLoginResult(session, true);
    }

    try {
      session = await sessionManager.createSession();
    } catch (error) {
      this.error(
        new Error(
          'An error occurred while trying to log in to myAnalog.',
          {
            cause: error
          }
        )
      );
    }

    this.log(
      `You are logged in to myAnalog as ${session.userEmail}.`
    );
    if (flags.verbose) {
      this.log(`Session details:
	User ID: ${session.userId}
	Scopes: ${session.scopes.join(', ')}`);
    }

    return buildLoginResult(session, false);
  }
}

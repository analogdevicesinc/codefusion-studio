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

import {
  env,
  ExtensionContext,
  ProgressOptions,
  ProgressLocation,
  Uri,
  window,
} from "vscode";
import { registerCommand } from "./commands";
import { type AuthConfig, SessionManager } from "cfs-lib";
import { CLOUD_CATALOG_AUTH } from "./constants";
import { AuthConfigParser } from "../utils/auth-config";
import { AuthFlowError, TokenCodeExchangeInitiator } from "cfs-ccm-lib";

/**
 * Auth related commands
 */

export class AuthCommandManager {
  private sessionManager: SessionManager;

  static registerAllCommands(context: ExtensionContext) {
    try {
      const authConfig = new AuthConfigParser().getConfig();
      authConfig.sessionUrlHandler = createFlowInitiator;
      const instance = new AuthCommandManager(authConfig);
      const callbackWithProgress = <T, A extends unknown[]>(
        callback: (this: AuthCommandManager, ...args: A) => Promise<T>,
        progressTitle: string
      ) => {
        const progressOptions: ProgressOptions = {
          location: ProgressLocation.Window,
          title: progressTitle,
          cancellable: false,
        };

        return (...args: A) =>
          window.withProgress(progressOptions, () =>
            callback.call(instance, ...args)
          );
      };

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.STATUS,
        callbackWithProgress(
          instance.statusCommandCallback,
          "Checking myAnalog login status..."
        ),
        instance
      );

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.LOGIN,
        callbackWithProgress(
          instance.loginCommandCallback,
          "Logging in to myAnalog..."
        ),
        instance
      );

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.LOGOUT,
        callbackWithProgress(
          instance.logoutCommandCallback,
          "Logging out of myAnalog..."
        ),
        instance
      );
    } catch (error) {
      const errorCommandCallback = () => {
        window.showWarningMessage(
          `myAnalog auth related commands are not available. ${
            (error as Error).message
          }`
        );
      };

      registerCommand(context, CLOUD_CATALOG_AUTH.STATUS, errorCommandCallback);
      registerCommand(context, CLOUD_CATALOG_AUTH.LOGIN, errorCommandCallback);
      registerCommand(context, CLOUD_CATALOG_AUTH.LOGOUT, errorCommandCallback);
    }
  }

  constructor(private authConfig: AuthConfig) {
    this.sessionManager = new SessionManager(this.authConfig);
  }

  private async statusCommandCallback(notify = true): Promise<boolean> {
    try {
      const session = await this.sessionManager.getSession();
      if (!session) {
        if (notify) {
          window.showInformationMessage("You are not logged in to myAnalog");
        }
        return false;
      }

      if (notify) {
        window.showInformationMessage(
          `You are logged in to myAnalog as ${session.userEmail}`
        );
      }
      return true;
    } catch {
      if (notify) {
        window.showErrorMessage(
          "An error occurred while checking myAnalog login status"
        );
      }
      return false;
    }
  }

  private async loginCommandCallback() {
    let session;
    try {
      session = await this.sessionManager.getSession();
      if (session) {
        window.showInformationMessage(
          `You are already logged in to myAnalog as ${session.userEmail}`
        );
        window.showInformationMessage(
          "To log in with a different myAnalog account, please log out first"
        );
        return;
      }

      session = await this.sessionManager.createSession();
    } catch (err) {
      if (err instanceof AuthFlowError && err.type === "CALLBACK_TIMEOUT") {
        try {
          // User may have had another successful login before
          // this one timed out, so check before reporting failure
          session = await this.sessionManager.getSession();
        } catch {
          // discard error
        }
      }

      if (!session) {
        window.showErrorMessage(
          "An error occurred while trying to login to myAnalog"
        );
        return;
      }
    }

    window.showInformationMessage(
      `You are logged in to myAnalog as ${session.userEmail}`
    );
  }

  private async logoutCommandCallback() {
    try {
      const session = await this.sessionManager.getSession();
      if (!session) {
        window.showInformationMessage("You are not logged in to myAnalog");
        return;
      }

      await session.endSession();

      window.showInformationMessage(
        "You have been logged out of myAnalog successfully"
      );
    } catch {
      window.showErrorMessage(
        "An error occurred while trying to logout of myAnalog"
      );
    }
  }
}

const createFlowInitiator: TokenCodeExchangeInitiator = async (
  authUrl: URL
) => {
  const result = window.showInformationMessage(
    `Attempting to automatically open the authorization page in your default browser. \
    If the browser does not open, use the button to copy the link and paste it in your browser.`,
    "Copy link"
  );

  void env.openExternal(Uri.parse(authUrl.href));

  if ((await result) === "Copy link") {
    env.clipboard.writeText(authUrl.href);
  }
};

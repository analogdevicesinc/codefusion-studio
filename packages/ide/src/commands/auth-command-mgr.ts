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

import {
  ExtensionContext,
  window,
  commands,
  Uri,
  workspace,
  env,
} from "vscode";
import { registerCommand } from "./commands";
import {
  AuthConfig,
  SessionManager,
  MyAnalogCloudsmithCredentialProvider,
} from "cfs-lib";

import { CLOUD_CATALOG_AUTH } from "./constants";
import { AuthConfigParser } from "../utils/auth-config";
import { CfsApiClient, TokenCodeExchangeInitiator } from "cfs-ccm-lib";
import { PACKAGE_MANAGER_CREDENTIAL_PROVIDER } from "../constants";
import {
  CfsPackageManagerProvider,
  CfsPackageRemoteCredentialProvider,
} from "cfs-package-manager";

/**
 * Auth related commands
 */

export class AuthCommandManager {
  private sessionManager: SessionManager;
  private credentialProvider: CfsPackageRemoteCredentialProvider | undefined;

  static registerAllCommands(
    context: ExtensionContext,
    packageManager?: CfsPackageManagerProvider,
  ) {
    try {
      const authConfig = new AuthConfigParser().getConfig();
      authConfig.sessionUrlHandler = createFlowInitiator;
      const instance = new AuthCommandManager(authConfig, packageManager);

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.STATUS,
        instance.statusCommandCallback,
        instance,
      );

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.LOGIN,
        instance.loginCommandCallback,
        instance,
      );

      registerCommand(
        context,
        CLOUD_CATALOG_AUTH.LOGOUT,
        instance.logoutCommandCallback,
        instance,
      );
    } catch (error) {
      console.error(error);

      const errorCommandCallback = () => {
        window.showWarningMessage(
          `Auth related commands are not available. ${(error as Error).message}`,
        );
      };

      registerCommand(context, CLOUD_CATALOG_AUTH.STATUS, errorCommandCallback);
      registerCommand(context, CLOUD_CATALOG_AUTH.LOGIN, errorCommandCallback);
      registerCommand(context, CLOUD_CATALOG_AUTH.LOGOUT, errorCommandCallback);
    }
  }

  constructor(
    private authConfig: AuthConfig,
    private packageManager?: CfsPackageManagerProvider,
  ) {
    this.sessionManager = new SessionManager(this.authConfig);
  }

  private async statusCommandCallback(): Promise<boolean> {
    try {
      const session = await this.sessionManager.getSession();
      if (!session) {
        window.showInformationMessage("You are not logged in");
        return false;
      }

      window.showInformationMessage(
        `You are logged in as ${session.userEmail}`,
      );
      return true;
    } catch (err) {
      window.showErrorMessage("An error occurred while checking login status");
      return false;
    }
  }

  private async loginCommandCallback() {
    let session;
    try {
      session = await this.sessionManager.getSession();
      if (session) {
        window.showInformationMessage(
          `You are already logged in as ${session.userEmail}`,
        );
        window.showInformationMessage(
          "To log in with a different account, please log out first",
        );
        return;
      }

      session = await this.sessionManager.createSession();

      // Test if user is logged in
      const client = new CfsApiClient({
        baseUrl: this.authConfig.ccmUrl,
        authorizer: session.authorizer,
      });
      await client.testConnection();

      // Update package manager credentials
      if (this.packageManager) {
        this.credentialProvider = new MyAnalogCloudsmithCredentialProvider(
          client,
        );
        await this.packageManager.registerCredentialProvider(
          this.credentialProvider,
        );
      }

      window.showInformationMessage(
        `You are logged in as ${session.userEmail}`,
      );
    } catch (err) {
      try {
        await session?.endSession();
      } catch (endErr) {
        // discard error
      }
      if (
        err instanceof Error &&
        err.message.includes("Token exchange timed out")
      ) {
        try {
          // User may have had another successful login before
          // this one timed out, so check before reporting failure
          session = await this.sessionManager.getSession();
          if (session) {
            return;
          }
        } catch {
          // discard error
        }
      }

      window.showErrorMessage("An error occurred while trying to login");
    }
  }

  private async logoutCommandCallback() {
    try {
      const session = await this.sessionManager.getSession();
      if (!session) {
        window.showInformationMessage("You are not logged in");
        return;
      }

      // Remove package manager credentials
      if (this.packageManager) {
        await this.packageManager.unregisterCredentialProvider(
          this.credentialProvider ?? PACKAGE_MANAGER_CREDENTIAL_PROVIDER,
        );
      }

      await session.endSession();
      window.showInformationMessage("You have been logged out successfully.");
    } catch (err) {
      window.showErrorMessage("An error occurred while trying to logout");
    }
  }
}

const createFlowInitiator: TokenCodeExchangeInitiator = async (
  authUrl: URL,
) => {
  const result = window.showInformationMessage(
    `Attempting to automatically open the authorization page in your default browser. \
    If the browser does not open, use the button to copy the link and paste it in your browser.`,
    "Copy link",
  );

  void env.openExternal(Uri.parse(authUrl.href));

  if ((await result) === "Copy link") {
    env.clipboard.writeText(authUrl.href);
  }
};

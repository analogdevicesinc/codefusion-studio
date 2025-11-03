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

import path from "node:path";
import envPaths from "env-paths";
import { fileURLToPath } from "node:url";

import { AuthConfig, checkIfFileExists, readJsonFile } from "cfs-lib";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultSessionFile = path.join(
  envPaths("com.analog.cfs", { suffix: "" })[
    process.platform === "darwin" ? "config" : "data"
  ],
  "session",
);

try {
  // Look for a .env file to load
  const dotenv = require("dotenv");
  dotenv.config({
    path: [
      // First match wins
      path.resolve(process.cwd(), ".env"), // cwd
      path.resolve(dirname, "../..", ".env"), // this package
      path.resolve(dirname, "../../../..", ".env"), // root package
    ],
  });
} catch {
  // dotenv may not be available outside of dev environment
}

export class AuthConfigParser {
  private authConfig: Partial<AuthConfig> = {};

  constructor() {
    const authConfigFile = path.resolve(dirname, "../../auth.json");
    if (checkIfFileExists(authConfigFile)) {
      this.authConfig = readJsonFile(authConfigFile) as Partial<
        Omit<AuthConfig, "sessionFile">
      >;
    }
  }

  getConfig(): AuthConfig {
    const authCallbacks = this.parseAuthCallbacks();
    const authUrl = this.parseAuthUrl();
    const ccmUrl = this.parseCcmUrl();
    const clientId = this.parseClientId();
    const sessionFile = this.parseSessionFile();
    const scopes = this.parseScopes();

    if (
      [authCallbacks, authUrl, ccmUrl, clientId, sessionFile].includes(
        undefined,
      )
    ) {
      throw new Error("Missing required auth config fields");
    }

    return {
      authCallbacks,
      authUrl,
      ccmUrl,
      clientId,
      sessionFile,
      scopes,
    } as AuthConfig;
  }

  private parseAuthCallbacks() {
    return (
      process.env.CFS_AUTH_CALLBACK?.split(/\s+/) ||
      this.authConfig?.authCallbacks
    )?.map((url) => new URL(url)); // validate URLs
  }

  private parseAuthUrl() {
    if (process.env.CFS_AUTH_URL) {
      return new URL(process.env.CFS_AUTH_URL);
    }

    if (this.authConfig?.authUrl) {
      return new URL(this.authConfig?.authUrl);
    }

    return;
  }

  private parseCcmUrl() {
    if (process.env.CFS_API_URL) {
      return new URL(process.env.CFS_API_URL);
    }

    if (this.authConfig.ccmUrl) {
      return new URL(this.authConfig.ccmUrl);
    }

    return;
  }

  private parseClientId() {
    return process.env.CFS_AUTH_CLIENT_ID?.trim() || this.authConfig?.clientId;
  }

  private parseSessionFile() {
    if (process.env.CFS_SESSION_FILE) {
      return path.resolve(process.env.CFS_SESSION_FILE);
    }

    return defaultSessionFile;
  }

  private parseScopes() {
    if (process.env.CFS_AUTH_SCOPE) {
      return process.env.CFS_AUTH_SCOPE.split(/\s+/).map((scope) =>
        scope.trim(),
      );
    }

    return this.authConfig?.scopes;
  }
}

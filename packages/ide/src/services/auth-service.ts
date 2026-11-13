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

import * as path from "path";
import * as vscode from "vscode";
import debounce from "lodash.debounce";
import {
  SessionManager,
  type AuthConfig,
  type TokenAuthSession,
} from "cfs-lib";
import type { TokenCodeExchangeInitiator } from "cfs-ccm-lib";
import { AuthConfigParser } from "../utils/auth-config";
import { logger } from "../utils/logger";

/** Payload of {@link AuthService.onDidLoadSession}. */
export interface AuthSessionLoadEvent {
  /** The loaded session, or undefined when logged out. */
  session: TokenAuthSession | undefined;
  /** Identifies the signed-in user, see {@link getAuthSignature}. */
  signature: string;
}

/**
 * Returns a value that identifies the signed-in user of a session.
 * @param session - The session, or undefined when logged out
 * @returns The user id, "logged-in" when there is no user id, or "logged-out"
 */
export function getAuthSignature(
  session: TokenAuthSession | undefined,
): string {
  return session ? (session.userId ?? "logged-in") : "logged-out";
}

/**
 * Owns the myAnalog auth config and session for the extension.
 *
 * Loading a session refreshes its access token over the network, so the
 * session is cached and concurrent callers share the request in flight. The
 * cache is cleared on login, logout and whenever the session file changes
 * (for example when the CLI logs in or out).
 */
export class AuthService implements vscode.Disposable {
  private readonly _onDidLoadSession =
    new vscode.EventEmitter<AuthSessionLoadEvent>();

  /**
   * Fires whenever a session was loaded, including after login, logout and
   * session file changes. It does not fire when the cached session is reused.
   * The signed-in user is not necessarily different from the previous load,
   * so listeners compare {@link AuthSessionLoadEvent.signature} themselves.
   */
  readonly onDidLoadSession = this._onDidLoadSession.event;

  /** The auth config, or undefined when the IDE was built without one. */
  readonly config: AuthConfig | undefined;

  /** Why the auth config could not be loaded, if it could not. */
  readonly configError: Error | undefined;

  private readonly sessionManager: SessionManager | undefined;
  private readonly disposables: vscode.Disposable[] = [this._onDidLoadSession];
  private cachedSession: Promise<TokenAuthSession | undefined> | undefined;
  /** Incremented whenever the cache is cleared, to discard stale requests. */
  private generation = 0;

  constructor() {
    try {
      this.config = new AuthConfigParser().getConfig();
      this.sessionManager = new SessionManager({
        ...this.config,
        sessionUrlHandler: openLoginPage,
      });
      this.watchSessionFile(this.config.sessionFile);
      // Start loading the session right away, it needs network requests.
      // Callers of getSession() share this request and its result or error.
      this.getSession().catch((error) => {
        logger.warn(
          "Failed to load myAnalog session:",
          error instanceof Error ? error.message : error,
        );
      });
    } catch (error) {
      this.config = undefined;
      this.sessionManager = undefined;
      this.configError =
        error instanceof Error ? error : new Error(String(error));
      logger.warn(
        "myAnalog authentication unavailable:",
        this.configError.message,
      );
    }
  }

  /**
   * Returns the auth config.
   * @throws The config error when the IDE was built without an auth config
   */
  requireConfig(): AuthConfig {
    if (!this.config) {
      throw this.configError;
    }
    return this.config;
  }

  /**
   * Returns the current myAnalog session, loading it if it is not cached.
   * @param options.forceRefresh - Ignore the cached session and load it again
   * @returns The session, or undefined when logged out
   * @throws When there is no auth config or the session could not be loaded
   */
  async getSession(options?: {
    forceRefresh?: boolean;
  }): Promise<TokenAuthSession | undefined> {
    const sessionManager = this.requireSessionManager();
    if (options?.forceRefresh) {
      this.clearCache();
    }

    if (!this.cachedSession) {
      const generation = this.generation;
      const request = sessionManager.getSession();
      this.cachedSession = request;
      request.then(
        (session) => {
          if (generation === this.generation) {
            this.fireDidLoadSession(session);
          }
        },
        () => {
          if (generation === this.generation) {
            // Do not cache failures so the next caller retries
            this.cachedSession = undefined;
          }
        },
      );
    }

    return this.cachedSession;
  }

  /**
   * Starts the myAnalog login flow in the browser.
   * @returns The new session
   */
  async login(): Promise<TokenAuthSession> {
    const session = await this.requireSessionManager().createSession();
    this.clearCache();
    this.cachedSession = Promise.resolve(session);
    this.fireDidLoadSession(session);
    return session;
  }

  /**
   * Ends the given session and reloads the current session.
   * @param session - The session to end
   */
  async logout(session: TokenAuthSession): Promise<void> {
    try {
      await session.endSession();
    } finally {
      await this.getSession({ forceRefresh: true }).catch((error) =>
        logger.error("Failed to reload myAnalog session after logout:", error),
      );
    }
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private requireSessionManager(): SessionManager {
    if (!this.sessionManager) {
      throw this.configError;
    }
    return this.sessionManager;
  }

  private clearCache(): void {
    this.cachedSession = undefined;
    this.generation++;
  }

  private fireDidLoadSession(session: TokenAuthSession | undefined): void {
    this._onDidLoadSession.fire({
      session,
      signature: getAuthSignature(session),
    });
  }

  /**
   * Reloads the session when the session file changes, for example when the
   * CLI logs in or out, so {@link onDidLoadSession} fires for those too.
   */
  private watchSessionFile(sessionFile: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(path.dirname(sessionFile)),
        path.basename(sessionFile),
      ),
    );

    const handleSessionFileChange = debounce(() => {
      this.getSession({ forceRefresh: true }).catch((error) => {
        logger.error(
          "Failed to reload myAnalog session:",
          error instanceof Error ? error.message : error,
        );
      });
    }, 50);

    this.disposables.push(
      watcher,
      watcher.onDidCreate(handleSessionFileChange),
      watcher.onDidChange(handleSessionFileChange),
      watcher.onDidDelete(handleSessionFileChange),
      new vscode.Disposable(() => handleSessionFileChange.cancel()),
    );
  }
}

const openLoginPage: TokenCodeExchangeInitiator = async (authUrl: URL) => {
  const result = vscode.window.showInformationMessage(
    `Attempting to automatically open the authorization page in your default browser. \
    If the browser does not open, use the button to copy the link and paste it in your browser.`,
    "Copy link",
  );

  void vscode.env.openExternal(vscode.Uri.parse(authUrl.href));

  if ((await result) === "Copy link") {
    vscode.env.clipboard.writeText(authUrl.href);
  }
};

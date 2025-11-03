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
	BrowserResponse,
	SessionInfo,
	TokenAuthSession,
	TokenCodeExchangeFlows,
	TokenCodeExchangeInitiator,
	TokenCodeExchangeReporter,
	TokenSessionFileStorage
} from "cfs-ccm-lib";

import fs from "node:fs/promises";

export interface AuthConfig {
	scopes?: string[];
	authUrl: URL;
	ccmUrl: URL;
	clientId: string;
	authCallbacks: URL[];
	sessionFile: string;
	sessionUrlHandler?: TokenCodeExchangeInitiator;
}

const successHTML = "web/auth/AuthSuccess.html";
const failureHTML = "web/auth/AuthFailure.html";

export class SessionManager {
	private tokenFlow: TokenCodeExchangeFlows;

	constructor(private authCfg: AuthConfig) {
		this._validateAuthConfig(authCfg);
		this.tokenFlow = new TokenCodeExchangeFlows(
			{
				authUrl: authCfg.authUrl,
				clientId: authCfg.clientId
			},
			authCfg.authCallbacks,
			authCfg.sessionUrlHandler,
			this.loginUXHandler
		);
	}

	// function to get the current auth session
	public async getSession(
		userEmail?: string
	): Promise<TokenAuthSession | undefined> {
		const sessions = await this.getAuthSessions(false, userEmail);
		if (sessions.length === 0) {
			return undefined;
		}

		return sessions[0];
	}

	// function to create a new auth session
	public async createSession(
		userEmail?: string
	): Promise<TokenAuthSession> {
		const sessions = await this.getAuthSessions(true, userEmail);
		if (sessions.length === 0) {
			throw new Error("Failed to create a new session.");
		}

		return sessions[0];
	}

	public async getAllSessions(
		userEmail?: string
	): Promise<TokenAuthSession[]> {
		return this.getAuthSessions(false, userEmail);
	}

	// function to setup the token store
	private async getTokenStorage(): Promise<TokenSessionFileStorage> {
		let storage: TokenSessionFileStorage;
		try {
			storage = await TokenSessionFileStorage.createTokenStore(
				this.authCfg.sessionFile
			);
		} catch {
			// file might be corrupt, delete it and recreate the store
			await fs.rm(this.authCfg.sessionFile, { force: true });
			storage = await TokenSessionFileStorage.createTokenStore(
				this.authCfg.sessionFile
			);
		}
		return storage;
	}

	// function to get all matching stored auth sessions
	// or create a new one if `createIfNotExists` is true
	private async getAuthSessions(
		createIfNotExists = false,
		userEmail?: string
	): Promise<TokenAuthSession[]> {
		return (
			await TokenAuthSession.getSessions(
				{
					storage: await this.getTokenStorage(),
					flows: this.tokenFlow
				},
				{
					scopes: this.authCfg.scopes,
					userEmail
				},
				createIfNotExists
			)
		).sort((a, b) => {
			// sort alphabetically by userEmail, then by number of scopes
			if (a.userEmail < b.userEmail) return -1;
			if (a.userEmail > b.userEmail) return 1;
			return b.scopes.length - a.scopes.length; // prefer sessions with more scopes
		});
	}

	// Provides the UX for the user login flow
	private loginUXHandler: TokenCodeExchangeReporter = (
		session?: SessionInfo,
		error?: Error
	): BrowserResponse | undefined => {
		if (session) {
			const details = Buffer.from(
				JSON.stringify({
					userId: session.userId,
					userEmail: session.userEmail,
					userScopes: session.scopes
				})
			).toString("base64");

			const redirect = new URL(successHTML, this.authCfg.ccmUrl);
			redirect.search = details;

			return {
				statusCode: 302,
				location: redirect.href
			};
		}

		if (error) {
			const details = Buffer.from(
				JSON.stringify({
					errorDetail: error.message,
					errorCode: "code" in error ? String(error.code) : "UNKNOWN",
					errorType:
						"error_description" in error
							? error.error_description
							: "error" in error
								? error.error
								: error.name
				})
			).toString("base64");

			const redirect = new URL(failureHTML, this.authCfg.ccmUrl);
			redirect.search = details;

			return {
				statusCode: 302,
				location: redirect.href
			};
		}
	};

	private _validateAuthConfig(
		authConfig: AuthConfig
	): asserts authConfig is AuthConfig {
		/* eslint-disable @typescript-eslint/no-unnecessary-condition */
		if (!authConfig.authUrl || !(authConfig.authUrl instanceof URL)) {
			throw new Error("authUrl is required in auth config");
		}
		if (!authConfig.ccmUrl || !(authConfig.ccmUrl instanceof URL)) {
			throw new Error("ccmUrl is required in auth config");
		}
		if (
			!authConfig.clientId ||
			typeof authConfig.clientId !== "string"
		) {
			throw new Error("clientId is required in auth config");
		}
		if (
			!authConfig.authCallbacks ||
			!Array.isArray(authConfig.authCallbacks) ||
			authConfig.authCallbacks.length === 0 ||
			authConfig.authCallbacks.some(
				(callback) => !(callback instanceof URL)
			)
		) {
			throw new Error("authCallbacks are required in auth config");
		}
		if (
			!authConfig.sessionFile ||
			typeof authConfig.sessionFile !== "string"
		) {
			throw new Error("sessionFile is required in auth config");
		}
		if (authConfig.scopes) {
			if (
				!Array.isArray(authConfig.scopes) ||
				authConfig.scopes.some((scope) => typeof scope !== "string")
			) {
				throw new Error("scopes must be an array of strings");
			}
		}
		/* eslint-enable @typescript-eslint/no-unnecessary-condition */
	}
}

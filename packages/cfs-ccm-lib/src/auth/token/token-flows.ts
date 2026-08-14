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

import {
    AuthFlowError,
    type AuthFlows,
    type SessionInfo,
} from '../session.js';
import * as openid from 'openid-client';
import { jwtDecode } from 'jwt-decode';
import express from 'express';
import open from 'open';
import type { AccessToken } from './token-authorizer.js';
import type { TokenSessionInfo } from './token-session.js';

// The auth service to obtain tokens from
export interface TokenServiceConfig {
    authUrl: string | URL; // the oauth2 authorization URL
    clientId: string; // the client ID for the application
}

// A message to display to the user in their browser at the callback URL
interface BrowserContentResponse {
    statusCode: number;
    contentType: string;
    body: string;
}

// A redirect to send the user to a different URL
interface BrowserRedirectResponse {
    statusCode: 302;
    location: string;
}

// What the callback URL returns to the browser
export type BrowserResponse =
    | BrowserRedirectResponse
    | BrowserContentResponse;

// A function to call when the token exchange is initiated (eg. to open a browser window or prompt the user)
export type TokenCodeExchangeInitiator = (
    authUrl: URL,
) => void | Promise<void>;
// A function to call when the token exchange is completed (eg. to display a message to the user)
// If a value is returned it will be sent to the browser
export type TokenCodeExchangeReporter = (
    session?: SessionInfo,
    error?: Error,
) =>
    | BrowserResponse
    | undefined
    | Promise<BrowserResponse | undefined>;

// A function to call after the token exchange completes to allow verifying the access token/session
// Should throw an error if the session is not valid
export type TokenCodeExchangeValidator = (
    session: TokenSessionInfo,
    accessToken: AccessToken,
) => void | Promise<void>;

const defaultCreateFlowInitiator: TokenCodeExchangeInitiator = async (
    authUrl: URL,
) => {
    // Console message to the user
    console.log(
        '\nAttempting to automatically open the authorization page in your default browser.',
        'If the browser does not open, please copy and paste the following URL into your browser:\n',
        '\n' + authUrl.href + '\n',
    );
    // Open the auth URL in the default browser
    await open(authUrl.href, {
        wait: false,
        background: false,
    });
};

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const defaultCreateFlowReporter: TokenCodeExchangeReporter = (
    session?: SessionInfo,
    error?: Error,
) => {
    // If there was an error, display an error message
    if (error) {
        return {
            statusCode: 500,
            contentType: 'text/html',
            body: `<html><body><h1>Token exchange failed</h1><p>${escapeHtml(error.message)}</p></body></html>`,
        };
    }
    // If the session is valid, display a success message
    if (session) {
        return {
            statusCode: 200,
            contentType: 'text/html',
            body: `<html><body><h1>Token obtained successfully</h1><p>User ID: ${escapeHtml(session.userId)}</p><p>User email: ${escapeHtml(session.userEmail)}</p><p>Scopes: ${escapeHtml(
                session.scopes.join(', '),
            )}</p><p>You can close this window and return to the application.</p></body></html>`,
        };
    }
    // If there was no error, but no session, display a generic message
    return {
        statusCode: 500,
        contentType: 'text/html',
        body: `<html><body><h1>Token exchange failed</h1><p>No session information available</p></body></html>`,
    };
};

// Implementation of authorization code flow for token exchange
export class TokenCodeExchangeFlows
    implements AuthFlows<TokenSessionInfo, AccessToken>
{
    #openIdConfig?: Promise<openid.Configuration>;
    private readonly callbacks: URL[];
    /**
     *
     * @param config
     * @param callbacks
     * @param createFlowInitiator
     * @param createFlowReporter
     */
    constructor(
        private readonly config: TokenServiceConfig,
        callbacks: URL[],
        private readonly createFlowInitiator: TokenCodeExchangeInitiator = defaultCreateFlowInitiator,
        private readonly createFlowReporter: TokenCodeExchangeReporter = defaultCreateFlowReporter,
        private readonly validateFlowSession?: TokenCodeExchangeValidator,
    ) {
        // Validate the callback URLs
        this.callbacks = callbacks.filter(
            (callback): callback is URL => callback instanceof URL,
        );
        if (this.callbacks.length === 0) {
            throw new AuthFlowError({
                message: 'No callback URLs provided',
                type: 'CONFIGURATION_ERROR',
            });
        }
        this.callbacks.forEach((callback) => {
            if (
                callback.protocol !== 'http:' ||
                callback.hostname !== 'localhost' ||
                isNaN(Number.parseInt(callback.port))
            ) {
                throw new AuthFlowError({
                    message:
                        'Invalid callback URL - must be http://localhost:<port>',
                    type: 'CONFIGURATION_ERROR',
                    cause: callback,
                });
            }
        });
    }

    public static DEFAULT_ACCESS_TOKEN_EXPIRY_SECS: number = 60 * 60; // 1 hour
    public static ACCESS_TOKEN_REFRESH_THRESHOLD_SECS: number =
        5 * 60; // 5 minutes
    public static TOKEN_EXCHANGE_TIMEOUT_SECS: number = 5 * 60; // 5 minutes
    public static ID_TOKEN_USER_ID_CLAIM: string = 'sub'; // the claim to use for the user ID

    // Lazy load the OpenID configuration
    private get openIdConfig(): Promise<openid.Configuration> {
        this.#openIdConfig ??= openid.discovery(
            // Discover the OpenID Connect configuration
            new URL(this.config.authUrl),
            this.config.clientId,
        );

        return this.#openIdConfig.catch((err) => {
            this.#openIdConfig = undefined;
            throw new AuthFlowError({
                cause: err,
                message: `Failed to load OpenID configuration from ${this.config.authUrl}`,
                type: 'SETUP_FAILED',
            });
        });
    }

    // This flow obtains a refresh, access, and ID token from the auth service
    /**
     *
     * @param session
     * @returns
     */
    async create(
        session?: Partial<SessionInfo>,
    ): Promise<[TokenSessionInfo, AccessToken]> {
        if (session?.scopes) {
            // make sure the scopes are valid non-empty strings
            session.scopes = session.scopes.filter(
                (scope) =>
                    typeof scope === 'string' && scope.length > 0,
            );
        }
        const openIdConfig = await this.openIdConfig;
        const { codeVerifier, codeChallenge, state, nonce } =
            await this._setupTokenExchangeConfig();

        if (
            session?.scopes &&
            session.scopes.length > 0 &&
            !session.scopes.includes('openid')
        ) {
            // If scopes were specified, make sure openid is included
            // so that we get the id_token
            session.scopes.push('openid');
        }

        // start the express server on the first callback host and port
        let callbackIdx = 0;
        let callbackUrl = this.callbacks[callbackIdx]!;
        const expressApp = express();
        const expressServer = expressApp.listen(
            Number(callbackUrl.port),
            callbackUrl.hostname,
        );

        // Use a timeout to abort the token exchange if it takes too long
        let timeout: NodeJS.Timeout | undefined = undefined;

        const authCallback = new Promise<
            [TokenSessionInfo, AccessToken]
        >((resolve, reject) => {
            expressServer.on('error', (err) => {
                // If the port was busy, try the next callback URL
                if ('code' in err && err.code === 'EADDRINUSE') {
                    callbackIdx++;
                    if (callbackIdx < this.callbacks.length) {
                        callbackUrl = this.callbacks[callbackIdx]!;
                        // Restart the express server on the next callback URL
                        expressServer.close();
                        expressServer.listen(
                            Number(callbackUrl.port),
                            callbackUrl.hostname,
                        );
                    } else {
                        reject(
                            new AuthFlowError({
                                message: `No available localhost port for callback (attempted: ${this.callbacks.map((c) => c.port.toString()).join(', ')})`,
                                cause: err,
                                type: 'SETUP_FAILED',
                            }),
                        );
                    }
                } else {
                    // Some other error occurred
                    reject(
                        new AuthFlowError({
                            message: `Failed to listen for callback on ${callbackUrl.toString()}`,
                            cause: err,
                            type: 'SETUP_FAILED',
                        }),
                    );
                }
            });

            // Express server started successfully
            expressServer.on('listening', async () => {
                // reject if the server is closed
                expressServer.on('close', () => {
                    reject(
                        new AuthFlowError({
                            message: `Failed to listen for callback on ${callbackUrl.toString()}: port closed unexpectedly`,
                            type: 'SETUP_FAILED',
                        }),
                    );
                });

                // set the timeout
                timeout = setTimeout(() => {
                    reject(
                        new AuthFlowError({
                            message: `Token exchange timed out. No callback received within ${TokenCodeExchangeFlows.TOKEN_EXCHANGE_TIMEOUT_SECS} seconds on ${callbackUrl.toString()}`,
                            type: 'CALLBACK_TIMEOUT',
                        }),
                    );
                }, TokenCodeExchangeFlows.TOKEN_EXCHANGE_TIMEOUT_SECS * 1000);

                // Create the authorization request URL
                let authRequestUrl: URL;
                try {
                    authRequestUrl = openid.buildAuthorizationUrl(
                        openIdConfig,
                        {
                            redirect_uri: callbackUrl.toString(),
                            scope: session?.scopes?.join(' ') ?? '',
                            state,
                            nonce,
                            code_challenge: codeChallenge,
                            code_challenge_method: 'S256',
                            login_hint:
                                session?.userId ??
                                session?.userEmail ??
                                '',
                        },
                    );
                } catch (err) {
                    reject(
                        new AuthFlowError({
                            message: `Failed to build authorization URL: ${err instanceof Error ? err.message : String(err)}`,
                            cause: err,
                            type: 'SETUP_FAILED',
                        }),
                    );
                    return;
                }

                // Add a route to handle the callback from the auth server
                expressApp.get(
                    callbackUrl.pathname,
                    async (req, res) => {
                        // Exchange the auth code for access, refresh, and identity tokens
                        let tokenError: Error | undefined;
                        let tokenSession:
                            | TokenSessionInfo
                            | undefined;
                        let accessToken: AccessToken | undefined;
                        try {
                            const tokenExchange =
                                await openid.authorizationCodeGrant(
                                    openIdConfig,
                                    new URL(req.url, callbackUrl), // req.url is relative to the callback URL
                                    {
                                        // validation checks
                                        pkceCodeVerifier:
                                            codeVerifier,
                                        expectedState: state,
                                        expectedNonce: nonce,
                                        idTokenExpected: true,
                                    },
                                );
                            // Check the tokens are as expected
                            const { refresh_token } = tokenExchange;
                            if (
                                !refresh_token ||
                                typeof refresh_token !== 'string'
                            ) {
                                throw new AuthFlowError({
                                    cause: new Error(
                                        'Missing refresh token',
                                    ),
                                    message:
                                        'Failed to parse token response from authorization server',
                                    type: 'UNEXPECTED_RESPONSE',
                                });
                            }

                            const {
                                accessToken: access,
                                userEmail,
                                userId,
                                scopes,
                            } = this._parseTokenResponse(
                                tokenExchange,
                                session?.scopes,
                            );

                            tokenSession = {
                                userId,
                                userEmail,
                                scopes,
                                refreshToken: refresh_token,
                                clientId: this.config.clientId,
                            };
                            accessToken = access;

                            // Validate the session if a validator is provided
                            if (this.validateFlowSession) {
                                await this.validateFlowSession(
                                    tokenSession,
                                    accessToken,
                                );
                            }
                        } catch (err) {
                            tokenError =
                                err instanceof Error
                                    ? err
                                    : new Error(String(err));
                        }

                        // Run the reporter and return the response to the browser
                        try {
                            const sessionInfo = tokenSession
                                ? {
                                      userId: tokenSession.userId,
                                      userEmail:
                                          tokenSession.userEmail,
                                      scopes: tokenSession.scopes,
                                  }
                                : undefined;

                            const reporterResponse =
                                await this.createFlowReporter(
                                    sessionInfo,
                                    tokenError,
                                );
                            if (reporterResponse) {
                                // If the response is a redirect, send the 302 response
                                if ('location' in reporterResponse) {
                                    res.redirect(
                                        reporterResponse.statusCode,
                                        reporterResponse.location,
                                    );
                                }
                                // Otherwise, send the response body
                                else if ('body' in reporterResponse) {
                                    // Set the content type and status code
                                    res.contentType(
                                        reporterResponse.contentType,
                                    )
                                        .status(
                                            reporterResponse.statusCode,
                                        )
                                        .send(reporterResponse.body);
                                }
                            }
                        } catch {
                            // Ignore errors from the reporter
                        } finally {
                            // close the connection
                            try {
                                res.end();
                            } catch {
                                // Ignore errors
                            }
                        }

                        // Handle the result of the token exchange
                        if (tokenError) {
                            reject(tokenError);
                        } else if (tokenSession && accessToken) {
                            resolve([tokenSession, accessToken]);
                        } else {
                            reject(
                                new AuthFlowError({
                                    message:
                                        'Failed to create token session',
                                    type: 'UNHANDLED_ERROR',
                                }),
                            );
                        }
                    },
                );
                // Initiate the user authorization flow
                await this.createFlowInitiator(authRequestUrl);
            });
        });

        try {
            return await authCallback;
        } finally {
            // cancel the timeout
            clearTimeout(timeout);
            // close the express server
            expressServer.close();
            expressServer.closeAllConnections();
            expressServer.unref();
        }
    }

    // This flow revokes the refresh token (and it's access tokens)
    /**
     *
     * @param session
     * @returns
     */
    async revoke(session: TokenSessionInfo): Promise<void> {
        const openIdConfig = await this.openIdConfig;
        try {
            await openid.tokenRevocation(
                openIdConfig,
                session.refreshToken,
            );
        } catch (err) {
            throw new AuthFlowError({
                cause: err,
                message: `Failed to revoke token`,
                type: 'UNHANDLED_ERROR',
            });
        }
    }

    // This flow refreshes the session
    // It returns a new access token and a new expiration time
    // The refresh token is not changed
    /**
     *
     * @param session
     * @returns
     */
    async refresh(session: TokenSessionInfo): Promise<AccessToken> {
        const openIdConfig = await this.openIdConfig;
        let tokenResponse: openid.TokenEndpointResponse &
            openid.TokenEndpointResponseHelpers;
        try {
            tokenResponse = await openid.refreshTokenGrant(
                openIdConfig,
                session.refreshToken,
            );
        } catch (err) {
            if (
                err instanceof openid.ResponseBodyError &&
                err.status === 400 &&
                err.error === 'invalid_grant'
            ) {
                throw new AuthFlowError({
                    cause: err,
                    message: `Failed to refresh token`,
                    type: 'REFRESH_REJECTED',
                });
            }

            throw new AuthFlowError({
                cause: err,
                message: `Failed to refresh token`,
                type: 'UNHANDLED_ERROR',
            });
        }

        // Check the tokens are as expected
        const { accessToken } = this._parseTokenResponse(
            tokenResponse,
            session.scopes,
        );

        return accessToken;
    }

    private async _setupTokenExchangeConfig() {
        try {
            const codeVerifier = openid.randomPKCECodeVerifier();
            const codeChallenge =
                await openid.calculatePKCECodeChallenge(codeVerifier);
            const state = openid.randomState();
            const nonce = openid.randomNonce();

            return {
                codeVerifier,
                codeChallenge,
                state,
                nonce,
            };
        } catch (err) {
            throw new AuthFlowError({
                cause: err,
                type: 'SETUP_FAILED',
                message:
                    'Failed to create PKCE code verifier and challenge',
            });
        }
    }

    private _parseTokenResponse(
        tokenResponse: openid.TokenEndpointResponse &
            openid.TokenEndpointResponseHelpers,
        scopes?: string[],
    ): {
        accessToken: AccessToken;
        userId: string;
        userEmail: string;
        scopes: string[];
    } {
        try {
            if (tokenResponse.token_type.toLowerCase() !== 'bearer') {
                throw new Error('Invalid token type');
            }
            const { access_token, id_token } = tokenResponse;
            if (
                !access_token ||
                !id_token ||
                typeof access_token !== 'string' ||
                typeof id_token !== 'string'
            ) {
                throw new Error('Missing id/access tokens');
            }

            // Check the user info
            const userId =
                tokenResponse.claims()?.[
                    TokenCodeExchangeFlows.ID_TOKEN_USER_ID_CLAIM
                ];
            const userEmail = tokenResponse.claims()?.email;
            if (
                !userId ||
                !userEmail ||
                typeof userId !== 'string' ||
                typeof userEmail !== 'string'
            ) {
                throw new Error('Missing user info');
            }
            // Check the scopes in the access token claims (note tokenResponse.claims()?.scope is the id_token)
            const accessTokenClaims = jwtDecode(access_token);
            const tokenScopes =
                'scope' in accessTokenClaims &&
                typeof accessTokenClaims.scope === 'string'
                    ? accessTokenClaims.scope.split(/\s+/)
                    : [];

            // Check all the requested scopes are included
            if (
                scopes &&
                !scopes.every((scope) => tokenScopes.includes(scope))
            ) {
                throw new Error('Missing requested scopes');
            }

            return {
                accessToken: {
                    accessToken: access_token,
                    expiresAt: new Date(
                        Date.now() +
                            (tokenResponse.expiresIn() ??
                                TokenCodeExchangeFlows.DEFAULT_ACCESS_TOKEN_EXPIRY_SECS) *
                                1000,
                    ),
                },
                userId,
                userEmail,
                scopes: tokenScopes,
            };
        } catch (err) {
            throw new AuthFlowError({
                cause: err,
                message:
                    'Failed to parse token response from authorization server',
                type: 'UNEXPECTED_RESPONSE',
            });
        }
    }
}

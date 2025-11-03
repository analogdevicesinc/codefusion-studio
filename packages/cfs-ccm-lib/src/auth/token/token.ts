/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import { AuthorizerBase, AuthConfigBase } from '../authorizer.js';
import {
    AuthFlows,
    AuthSession,
    SessionInfo,
    SessionStorage,
} from '../session.js';
import {
    MiddlewareCallbackParams,
    MiddlewareOnResponse,
} from 'openapi-fetch';
import * as openid from 'openid-client';
import { jwtDecode } from 'jwt-decode';
import express from 'express';
import open from 'open';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface TokenAuthConfig extends Partial<AuthConfigBase> {
    accessToken: string | (() => string | Promise<string>);
    refreshHandler?(): string | Promise<string>;
}

export class TokenAuthorizer extends AuthorizerBase {
    public static DEFAULT_HTTP_HEADER: string = 'Authorization';
    public static DEFAULT_HTTP_PREFIX: string = 'Bearer ';

    private accessToken: TokenAuthConfig['accessToken'];
    private readonly refresh?: TokenAuthConfig['refreshHandler'];

    /**
     *
     * @param authConfig
     */
    public constructor(authConfig: TokenAuthConfig) {
        super({
            httpHeader:
                authConfig.httpHeader ||
                TokenAuthorizer.DEFAULT_HTTP_HEADER,

            httpPrefix:
                authConfig.httpPrefix ??
                TokenAuthorizer.DEFAULT_HTTP_PREFIX,
        });

        if (
            typeof authConfig.accessToken === 'string' &&
            authConfig.accessToken.length === 0
        ) {
            throw new Error('invalid empty access token');
        }

        this.accessToken = authConfig.accessToken;
        this.refresh = authConfig.refreshHandler;
    }

    /**
     *
     * @param args0
     * @param args0.request
     * @returns
     */
    public async onRequest({ request }: MiddlewareCallbackParams) {
        const token =
            typeof this.accessToken === 'string'
                ? this.accessToken
                : await this.accessToken();
        if (typeof token === 'string' && token.length > 0) {
            return this.setAuthHeader({ request, auth: token });
        } else {
            throw new Error('invalid access token');
        }
    }

    /**
     *
     * @param args0
     * @param args0.response
     * @param args0.request
     * @param args0.options
     * @returns
     */
    public async onResponse({
        response,
        request,
        options,
    }: Parameters<MiddlewareOnResponse>[0]) {
        if (response.status === 401 && this.refresh) {
            // If we weren't authorised and we have a refresh handler, try to refresh the token
            try {
                const newToken = await this.refresh();

                if (
                    typeof newToken === 'string' &&
                    newToken.length > 0
                ) {
                    // Store the new token for future requests
                    if (typeof this.accessToken === 'string') {
                        this.accessToken = newToken;
                    }

                    // retry the request with the new token

                    // This is to workaround a bug in openapi-fetch where the options.fetch object is incorrectly typed as globalThis.fetch
                    // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.d.ts#L128)
                    // when it is actually the custom fetch function we passed in the options
                    // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.js#L37)
                    const resp = await options.fetch(
                        // This causes TypeScript to believe that options.fetch() needs a globalThis.Request, but since its actually our
                        // node-fetch/node-fetch-cache fetch(), and request is the correct object type, we can cast it to keep TS happy
                        this.setAuthHeader({
                            request,
                            auth: newToken,
                        }) as unknown as Request,
                    );

                    // This is to workaround another, similar, bug in openapi-fetch where the response object is required to be an instance of globalThis.Response
                    // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.js#L144)
                    // It looks like this issue was only partially addressed - https://github.com/openapi-ts/openapi-typescript/issues/1563 (only custom Request objects were added)
                    // (https://github.com/openapi-ts/openapi-typescript/pull/1907)
                    // Therefore we need to create a new globalThis.Response object to return ...
                    return new Response(
                        resp.body,
                        resp,
                        // ... but cast it back to the custom response type to keep TS happy
                    ) as unknown as typeof response;
                }
            } catch (err) {
                // If the refresh fails, the original 401 response will be returned
            }
        }

        // Leaves the response unmodified
        return undefined;
    }
}

// An access token authenticates the user to the API
// access tokens are short-lived and need to be refreshed
interface AccessToken {
    accessToken: string; // the access token
    expiresAt: Date; // the expiration time of the access token
}

// Refresh tokens are used to obtain new access tokens
interface TokenSessionInfo extends SessionInfo {
    refreshToken: string;
}

export class TokenSessionFileStorage
    implements SessionStorage<TokenSessionInfo>
{
    private constructor(
        private readonly filename: string,
        private readonly encryptionKey?: crypto.KeyObject,
        private readonly encryptionAlg?: crypto.CipherGCMTypes,
    ) {}

    /**
     *
     * @param filename
     * @param encryption
     * @param encryption.encryptionKey
     * @param encryption.encryptionAlg
     * @returns
     */
    public static async createTokenStore(
        filename: string,
        encryption?: {
            encryptionKey: crypto.KeyObject;
            encryptionAlg: crypto.CipherGCMTypes;
        },
    ): Promise<TokenSessionFileStorage> {
        // Create the storage instance
        const storage = new TokenSessionFileStorage(
            path.resolve(filename),
            encryption?.encryptionKey,
            encryption?.encryptionAlg,
        );

        // Check the cryptography algorithm is supported and the key is valid
        if (
            (storage.encryptionKey && !storage.encryptionAlg) ||
            (!storage.encryptionKey && storage.encryptionAlg)
        ) {
            throw new Error(
                'Encryption key and algorithm must both be provided or both be omitted',
            );
        }
        if (storage.encryptionKey && storage.encryptionAlg) {
            if (storage.encryptionKey.type !== 'secret') {
                throw new Error(
                    'Invalid encryption key - must be symmetric (secret) key',
                );
            }
            if (
                !crypto.getCiphers().includes(storage.encryptionAlg)
            ) {
                throw new Error(
                    `Unsupported encryption algorithm: ${storage.encryptionAlg}`,
                );
            }
            const cipherMode = crypto.getCipherInfo(
                storage.encryptionAlg,
            )?.mode;

            if (!cipherMode || !['gcm'].includes(cipherMode)) {
                throw new Error(
                    `Unsupported encryption algorithm: ${storage.encryptionAlg} - only gcm mode is supported`,
                );
            }
            if (
                !crypto.getCipherInfo(storage.encryptionAlg, {
                    keyLength: storage.encryptionKey.symmetricKeySize,
                })
            ) {
                throw new Error(
                    `Unsupported key length ${storage.encryptionKey.symmetricKeySize} for encryption algorithm: ${storage.encryptionAlg}`,
                );
            }
        }

        // Ensure the file exists and can be parsed and decrypted
        try {
            await storage.get();
        } catch (err) {
            // If the file does not exist, create a new empty one
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                // Ensure the directory exists
                await fs.mkdir(path.dirname(storage.filename), {
                    recursive: true,
                });
                await storage.set([]);
            } else {
                // If the file exists but cannot be parsed or decrypted, throw the error
                throw err;
            }
        }

        return storage;
    }

    /**
     *
     * @returns an array of stored token sessions
     */
    async get(): Promise<TokenSessionInfo[]> {
        const fileContent = JSON.parse(
            await fs.readFile(this.filename, 'utf-8'),
        );

        let sessions: unknown;

        if (this.encryptionKey && this.encryptionAlg) {
            const { encrypted, iv, authTag } = fileContent;

            if (!encrypted || typeof encrypted !== 'string') {
                throw new Error(
                    'Invalid file format - missing encrypted content',
                );
            }

            if (!iv || typeof iv !== 'string') {
                throw new Error(
                    'Invalid file format - missing initialization vector (IV)',
                );
            }

            if (!authTag || typeof authTag !== 'string') {
                throw new Error(
                    'Invalid file format - missing authentication tag',
                );
            }

            if (
                !crypto.getCipherInfo(this.encryptionAlg, {
                    keyLength: this.encryptionKey.symmetricKeySize,
                    ivLength: iv.length,
                })
            ) {
                throw new Error(
                    `Invalid file format - iv length ${iv.length} invalid for ${this.encryptionAlg}`,
                );
            }

            const decipher = crypto.createDecipheriv(
                this.encryptionAlg,
                this.encryptionKey,
                Buffer.from(iv, 'base64'),
            );

            decipher.setAuthTag(Buffer.from(authTag, 'base64'));
            let decrypted = decipher.update(
                encrypted,
                'base64',
                'utf-8',
            );
            decrypted += decipher.final('utf-8');

            sessions = JSON.parse(decrypted);
        } else {
            // If no encryption is specified, parse the file content directly
            sessions = fileContent;
        }

        // check the result is an array of TokenSessionInfo
        if (
            !Array.isArray(sessions) ||
            !sessions.every((s) => this.isTokenSessionInfo(s))
        ) {
            throw new Error(
                'Invalid file format - expected an array of sessions',
            );
        }

        return sessions;
    }

    /**
     *
     * @param obj an object to check
     */
    private isTokenSessionInfo(obj: any): obj is TokenSessionInfo {
        return (
            obj &&
            typeof obj === 'object' &&
            'userId' in obj &&
            typeof obj.userId === 'string' &&
            'userEmail' in obj &&
            typeof obj.userEmail === 'string' &&
            'scopes' in obj &&
            Array.isArray(obj.scopes) &&
            'refreshToken' in obj &&
            typeof obj.refreshToken === 'string'
        );
    }

    /**
     *
     * @param tokenInfo the array of token sessions to store
     */
    async set(tokenInfo: TokenSessionInfo[]): Promise<void> {
        // Convert the token info to a JSON string
        let jsonContent = JSON.stringify(tokenInfo, null, 2);

        if (this.encryptionKey && this.encryptionAlg) {
            // Attempt to encrypt the file content
            const ivLength =
                crypto.getCipherInfo(this.encryptionAlg, {
                    keyLength: this.encryptionKey.symmetricKeySize,
                })?.ivLength ?? 0;
            const iv = crypto
                .randomBytes(ivLength)
                .toString('base64');
            const cipher = crypto.createCipheriv(
                this.encryptionAlg,
                this.encryptionKey,
                Buffer.from(iv, 'base64'),
            ) as crypto.CipherGCM;
            let encrypted = cipher.update(
                jsonContent,
                'utf-8',
                'base64',
            );
            encrypted += cipher.final('base64');

            // Write the encrypted content to the file
            jsonContent = JSON.stringify({
                encrypted,
                iv: iv,
                authTag: cipher.getAuthTag().toString('base64'),
            });
        } // If no encryption is specified, write the JSON string directly

        await fs.writeFile(this.filename, jsonContent, {
            encoding: 'utf-8',
            mode: 0o600,
        });
    }
}

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

const defaultCreateFlowReporter: TokenCodeExchangeReporter = (
    session?: SessionInfo,
    error?: Error,
) => {
    // If there was an error, display an error message
    if (error) {
        return {
            statusCode: 500,
            contentType: 'text/html',
            body: `<html><body><h1>Token exchange failed</h1><p>${error.message}</p></body></html>`,
        };
    }
    // If the session is valid, display a success message
    if (session) {
        return {
            statusCode: 200,
            contentType: 'text/html',
            body: `<html><body><h1>Token obtained successfully</h1><p>User ID: ${session.userId}</p><p>User email: ${session.userEmail}</p><p>Scopes: ${session.scopes.join(
                ', ',
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

// Implmentation of authorization code flow for token exchange
export class TokenCodeExchangeFlows
    implements AuthFlows<TokenSessionInfo, AccessToken>
{
    private readonly openIdConfig: Promise<openid.Configuration>;
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
    ) {
        // Validate the callback URLs
        this.callbacks = callbacks.filter(
            (callback): callback is URL => callback instanceof URL,
        );
        if (this.callbacks.length === 0) {
            throw new Error('No callback URLs provided');
        }
        this.callbacks.forEach((callback) => {
            if (
                callback.protocol !== 'http:' ||
                callback.hostname !== 'localhost' ||
                isNaN(Number.parseInt(callback.port))
            ) {
                throw new Error(
                    'Invalid callback URL - must be http://localhost:<port>',
                    { cause: callback },
                );
            }
        });

        // Discover the OpenID Connect configuration
        this.openIdConfig = openid.discovery(
            new URL(this.config.authUrl),
            this.config.clientId,
        );
    }

    public static DEFAULT_ACCESS_TOKEN_EXPIRY_SECS: number = 60 * 60; // 1 hour
    public static ACCESS_TOKEN_REFRESH_THRESHOLD_SECS: number =
        5 * 60; // 5 minutes
    public static TOKEN_EXCHANGE_TIMEOUT_SECS: number = 5 * 60; // 5 minutes
    public static ID_TOKEN_USER_ID_CLAIM: string = 'sub'; // the claim to use for the user ID

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
        const codeVerifier = openid.randomPKCECodeVerifier();
        const codeChallenge =
            await openid.calculatePKCECodeChallenge(codeVerifier);
        const state = openid.randomState();
        const nonce = openid.randomNonce();

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
                            new Error('No available callbacks', {
                                cause: err,
                            }),
                        );
                    }
                } else {
                    // Some other error occurred
                    reject(err);
                }
            });

            // Express server started successfully
            expressServer.on('listening', async () => {
                // reject if the server is closed
                expressServer.on('close', () => {
                    reject(
                        new Error(
                            'Express server closed unexpectedly',
                        ),
                    );
                });

                // set the timeout
                timeout = setTimeout(() => {
                    reject(new Error('Token exchange timed out'));
                }, TokenCodeExchangeFlows.TOKEN_EXCHANGE_TIMEOUT_SECS * 1000);

                // Create the authorization request URL
                const authRequestUrl = openid.buildAuthorizationUrl(
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

                // Add a route to handle the callback from the auth server
                expressApp.get(
                    callbackUrl.pathname,
                    async (req, res) => {
                        // Exchange the auth code for access, refresh, and identity tokens
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
                                throw new Error('Missing tokens');
                            }
                            const {
                                accessToken,
                                userEmail,
                                userId,
                                scopes,
                            } = this._parseTokenResonse(
                                tokenExchange,
                                session?.scopes,
                            );

                            // Return the reporter response to the browser
                            try {
                                const successResponse =
                                    await this.createFlowReporter({
                                        userId,
                                        userEmail,
                                        scopes,
                                    });
                                if (successResponse) {
                                    // If the response is a redirect, send a 301 response
                                    if (
                                        'location' in successResponse
                                    ) {
                                        res.redirect(
                                            successResponse.statusCode,
                                            successResponse.location,
                                        );
                                    }
                                    // Otherwise, send the response body
                                    else if (
                                        'body' in successResponse
                                    ) {
                                        // Set the content type and status code
                                        res.contentType(
                                            successResponse.contentType,
                                        )
                                            .status(
                                                successResponse.statusCode,
                                            )
                                            .send(
                                                successResponse.body,
                                            );
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

                            // resolve the promise with the token and session info
                            resolve([
                                {
                                    userId,
                                    userEmail,
                                    scopes,
                                    refreshToken: refresh_token,
                                },
                                accessToken,
                            ]);
                        } catch (err) {
                            // Return the reporter response to the browser
                            try {
                                const errorResponse =
                                    await this.createFlowReporter(
                                        undefined,
                                        err as Error,
                                    );
                                if (errorResponse) {
                                    // If the response is a redirect, send a 301 response
                                    if ('location' in errorResponse) {
                                        res.redirect(
                                            errorResponse.statusCode,
                                            errorResponse.location,
                                        );
                                    }
                                    // Otherwise, send the response body
                                    else if (
                                        'body' in errorResponse
                                    ) {
                                        // Set the content type and status code
                                        res.contentType(
                                            errorResponse.contentType,
                                        )
                                            .status(
                                                errorResponse.statusCode,
                                            )
                                            .send(errorResponse.body);
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

                            // reject with the original error
                            reject(err);
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
        return openid.tokenRevocation(
            openIdConfig,
            session.refreshToken,
        );
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
        const tokenResponse = await openid.refreshTokenGrant(
            openIdConfig,
            session.refreshToken,
        );

        // Check the tokens are as expected
        const { accessToken } = this._parseTokenResonse(
            tokenResponse,
            session.scopes,
        );

        return accessToken;
    }

    private _parseTokenResonse(
        tokenResponse: openid.TokenEndpointResponse &
            openid.TokenEndpointResponseHelpers,
        scopes?: string[],
    ): {
        accessToken: AccessToken;
        userId: string;
        userEmail: string;
        scopes: string[];
    } {
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
            throw new Error('Missing tokens');
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
    }
}

export interface TokenAuthSessionConfig {
    storage: SessionStorage<TokenSessionInfo>; // methods to store and retrieve token info
    flows: AuthFlows<TokenSessionInfo, AccessToken>; // the login/logout/refresh flow to use
}

export class TokenAuthSession implements AuthSession {
    #authorizer?: TokenAuthorizer;

    private constructor(
        public readonly userId: string,
        public readonly userEmail: string,
        public readonly scopes: string[],
        private readonly revoke: () => Promise<void>, // logs out the user and removes the stored token info
        private readonly refresh: () => Promise<AccessToken>, // refreshes the access token
        private token: AccessToken,
    ) {}

    /**
     *
     * @param config
     * @param params
     * @param create
     * @returns
     */
    static async getSessions(
        config: TokenAuthSessionConfig,
        params?: Partial<SessionInfo>,
        create: boolean = false,
    ): Promise<TokenAuthSession[]> {
        if (params?.scopes) {
            // make sure the scopes are valid non-empty strings
            params.scopes = params.scopes.filter(
                (scope) =>
                    typeof scope === 'string' && scope.length > 0,
            );
        }
        const refreshes: [TokenSessionInfo, Promise<AccessToken>][] =
            [];
        const storedSessions = await config.storage.get();
        const filteredSessions = storedSessions.filter(
            (session: TokenSessionInfo) => {
                // filter potential matches by userId, userEmail, and scopes
                if (
                    (params?.userId &&
                        params.userId !== session.userId) ||
                    (params?.userEmail &&
                        params.userEmail !== session.userEmail) ||
                    (params?.scopes &&
                        params.scopes.length > 0 &&
                        !params.scopes.every((scope) =>
                            session.scopes.includes(scope),
                        ))
                ) {
                    // leave non-matching sessions in the array
                    return true;
                }

                // try to refresh the matching sessions
                refreshes.push([
                    session,
                    config.flows.refresh(session),
                ]);

                return false; // remove and re-add below if refreshed successfully
            },
        );

        // filter out any sessions that couldn't be refreshed
        const refreshedSessions: [TokenSessionInfo, AccessToken][] = (
            await Promise.allSettled(refreshes.map((r) => r[1]))
        )
            .map((result, idx) => {
                if (result.status === 'fulfilled' && refreshes[idx]) {
                    return [refreshes[idx][0], result.value] as [
                        TokenSessionInfo,
                        AccessToken,
                    ];
                }
            })
            .filter((entry) => entry !== undefined);

        // if we have no sessions left, but we are allowed to create a new one
        if (refreshedSessions.length === 0 && create) {
            // call the create flow
            const [session, token] =
                await config.flows.create(params);
            refreshedSessions.push([session, token]);
        }

        const returnSessions = refreshedSessions
            .map(([session, token]) => {
                filteredSessions.push(session);
                return new TokenAuthSession(
                    session.userId,
                    session.userEmail,
                    session.scopes,
                    async () => {
                        await TokenAuthSession.removeSession(
                            config,
                            session,
                        );
                    },
                    async () => {
                        const newToken =
                            await config.flows.refresh(session);
                        return newToken;
                    },
                    token,
                );
            })
            // sort the sessions by ascending number of scopes (so the most specific session is first)
            .sort((a, b) => a.scopes.length - b.scopes.length);

        // if we have added/removed sessions, update the storage
        if (
            filteredSessions.length !== storedSessions.length ||
            filteredSessions.some(
                (session) =>
                    !storedSessions.some(
                        (s) =>
                            s.refreshToken === session.refreshToken,
                    ),
            )
        ) {
            await config.storage.set(filteredSessions);
        }

        // return the sessions
        return returnSessions;
    }

    /**
     *
     * @param config
     * @param session
     */
    static async removeSession(
        config: TokenAuthSessionConfig,
        session: TokenSessionInfo,
    ): Promise<void> {
        // call service.flow.revoke
        await config.flows.revoke(session); // revoke the session
        // remove the session from storage
        await config.storage.set(
            (await config.storage.get()).filter(
                (s) => s.refreshToken !== session.refreshToken,
            ),
        );
    }
    /**
     *
     * @returns
     */
    get authorizer(): TokenAuthorizer {
        // the token authorizer can be used directly in the CfsApiClient
        // and will automatically refresh the access token before it expires
        this.#authorizer ??= new TokenAuthorizer({
            accessToken: async () => {
                // check the token isn't expired (or about to expire)
                if (
                    this.token.expiresAt >
                    new Date(
                        Date.now() +
                            TokenCodeExchangeFlows.ACCESS_TOKEN_REFRESH_THRESHOLD_SECS *
                                1000,
                    )
                ) {
                    return this.token.accessToken;
                } else {
                    // refresh the access token
                    await this.refreshSession();
                    return this.token.accessToken;
                }
            },
            refreshHandler: async () => {
                await this.refreshSession();
                return this.token.accessToken;
            },
        });

        return this.#authorizer;
    }

    /**
     *
     */
    async refreshSession(): Promise<void> {
        // refresh the access token
        this.token = await this.refresh();
    }

    /**
     * Revokes the session and removes the token info from storage
     */
    async endSession(): Promise<void> {
        await this.revoke();
    }
}

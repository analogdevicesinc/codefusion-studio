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
    type AuthSession,
    type SessionInfo,
    type SessionStorage,
} from '../session.js';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
    type AccessToken,
    TokenAuthorizer,
} from './token-authorizer.js';
import { TokenCodeExchangeFlows } from './token-flows.js';

// Refresh tokens are used to obtain new access tokens
export interface TokenSessionInfo extends SessionInfo {
    refreshToken: string;
    clientId: string;
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
        public readonly clientId: string,
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
        params?: Partial<SessionInfo> & { clientId?: string },
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
                    (params?.clientId &&
                        params.clientId !== session.clientId) ||
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
                if (result.status === 'rejected') {
                    if (
                        result.reason instanceof AuthFlowError &&
                        result.reason.type === 'REFRESH_REJECTED'
                    ) {
                        return undefined; // remove the rejected (expired/invalid) session from storage
                    }

                    throw result.reason; // rethrow any other errors
                }
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
                    session.clientId,
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

        // Ensure the file exists
        try {
            await fs.access(storage.filename, fs.constants.F_OK);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw err;
            }

            // Ensure the directory exists
            await fs.mkdir(path.dirname(storage.filename), {
                recursive: true,
            });

            // Create an empty file
            await storage.set([]);
        }

        // Ensure the file can be parsed and decrypted
        await storage.get();

        return storage;
    }

    /**
     * @returns the contents of the storage file, decrypted if necessary
     */
    private async readFile(): Promise<unknown[]> {
        let fileContent;
        try {
            fileContent = JSON.parse(
                await fs.readFile(this.filename, 'utf-8'),
            );
        } catch (err) {
            // if the file doesn't exist, return an empty array
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }

            throw err;
        }

        let sessions: unknown;

        if (this.encryptionKey && this.encryptionAlg) {
            if (
                fileContent === null ||
                typeof fileContent !== 'object'
            ) {
                throw new Error(
                    'Invalid file format - missing encrypted content',
                );
            }
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

            const decodedIv = Buffer.from(iv, 'base64');

            if (
                !crypto.getCipherInfo(this.encryptionAlg, {
                    keyLength: this.encryptionKey.symmetricKeySize,
                    ivLength: decodedIv.length,
                })
            ) {
                throw new Error(
                    `Invalid file format - iv length ${decodedIv.length} invalid for ${this.encryptionAlg}`,
                );
            }

            const decipher = crypto.createDecipheriv(
                this.encryptionAlg,
                this.encryptionKey,
                decodedIv,
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

        // check the result is an array
        if (!Array.isArray(sessions)) {
            throw new Error(
                'Invalid file format - expected an array of sessions',
            );
        }

        return sessions;
    }

    /**
     *
     * @returns an array of stored token sessions
     */
    async get(): Promise<TokenSessionInfo[]> {
        const sessions = await this.readFile();

        // return the sessions that are valid TokenSessionInfo objects
        return sessions.filter((session) =>
            this.isTokenSessionInfo(session),
        );
    }

    /**
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
            typeof obj.refreshToken === 'string' &&
            'clientId' in obj &&
            typeof obj.clientId === 'string'
        );
    }

    /**
     * @param tokenInfo the array of token sessions to store
     */
    async set(tokenInfo: TokenSessionInfo[]): Promise<void> {
        // preserve prior entries for backwards compatibility
        const sessions = (await this.readFile()).filter(
            (s) => !this.isTokenSessionInfo(s),
        );
        sessions.push(...tokenInfo);

        // Convert the token info to a JSON string
        let jsonContent = JSON.stringify(sessions, null, 2);

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

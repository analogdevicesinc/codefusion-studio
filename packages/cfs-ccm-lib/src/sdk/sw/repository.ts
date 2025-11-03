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

import { CfsApiClient, CfsApiError } from '../cfsapi-client.js';
import { CfsCcmError } from '../../error/error.js';

type PackageRepositoryErrorType =
    | 'SERVICE_ERROR'
    | 'UNHANDLED_ERROR'
    | 'UNSUPPORTED_REPOSITORY'
    | 'BAD_TOKEN';

/** Error thrown when there is an issue with the package repository. */
export class PackageRepositoryError extends CfsCcmError<PackageRepositoryErrorType> {}

/** Client for interacting with a package repository. */
export class RepositoryClient {
    /**
     * Instantiates a new RepositoryClient which can be used to fetch PackageRepository instances.
     * @param cfsApiClient CFS API client to use.
     */
    constructor(private readonly cfsApiClient: CfsApiClient) {}

    /**
     * Fetches a package repository by its URL.
     * @param repoUrl the URL of the package repository.
     * @returns Promise<PackageRepository>
     */
    public async getRepository(
        repoUrl: string,
    ): Promise<PackageRepository> {
        const repo = new PackageRepository(
            this.cfsApiClient,
            repoUrl,
        );
        await repo.getToken();
        return repo;
    }
}

/** Represents a package repository. Can be used to obtain an access token.*/
export class PackageRepository {
    private token?: string | undefined = undefined;

    /**
     * Constructs a new PackageRepository instance.
     * @param cfsApiClient CFS API client to use.
     * @param repoUrl The URL of the package repository.
     */
    constructor(
        private readonly cfsApiClient: CfsApiClient,
        public readonly repoUrl: string,
    ) {}

    private async fetchToken(): Promise<string | undefined> {
        try {
            const response = await this.cfsApiClient.fetch.POST(
                '/users/entitlements',
                {
                    body: {
                        repoUrl: this.repoUrl,
                        entitlementType: 'PACKAGE_REPO_TOKEN',
                        token: this.token,
                    },
                },
            );
            if (response.error || response.response.status !== 200) {
                switch (response.response.status) {
                    case 401:
                        throw new CfsApiError({
                            type: 'AUTHN_REQUIRED',
                            message:
                                response.error?.message ||
                                'Authentication required',
                        });
                    case 403:
                        throw new CfsApiError({
                            type: 'FORBIDDEN',
                            message:
                                response.error?.message ||
                                'Access forbidden',
                        });
                    case 404:
                        return undefined;
                    case 400:
                        if (
                            response.error?.message ===
                            'Invalid token'
                        ) {
                            throw new PackageRepositoryError({
                                type: 'BAD_TOKEN',
                                message:
                                    response.error?.message ||
                                    'Bad token',
                            });
                        }
                        if (
                            response.error?.message?.includes(
                                'Unsupported repository',
                            )
                        ) {
                            throw new PackageRepositoryError({
                                type: 'UNSUPPORTED_REPOSITORY',
                                message:
                                    response.error?.message ||
                                    'Unsupported repository',
                            });
                        }
                        throw new PackageRepositoryError({
                            type: 'UNHANDLED_ERROR',
                            message:
                                response.error?.message ||
                                'Bad request',
                        });
                    case 500:
                        throw new PackageRepositoryError({
                            type: 'SERVICE_ERROR',
                            message:
                                response.error?.message ||
                                'Service error',
                        });
                }
                throw new PackageRepositoryError({
                    type: 'UNHANDLED_ERROR',
                    message: 'Failed to fetch token',
                    cause:
                        response.error?.message ||
                        `Status: ${response.response.status}`,
                });
            }
            return response.data.token;
        } catch (error) {
            if (
                error instanceof CfsApiError ||
                error instanceof PackageRepositoryError
            ) {
                throw error;
            }
            throw new PackageRepositoryError({
                type: 'UNHANDLED_ERROR',
                message: 'Error fetching token',
                cause: error,
            });
        }
    }

    /**
     * Gets the access token for the package repository.
     * @returns The access token or undefined if not available.
     */
    public async getToken(): Promise<string | undefined> {
        if (!this.token) {
            this.token = await this.fetchToken();
        }
        return this.token;
    }

    /**
     * Refreshes the access token for the package repository.
     */
    public async refreshToken(): Promise<void> {
        try {
            this.token = await this.fetchToken();
        } catch (error) {
            // if token is not valid, clear it and try again
            if (
                error instanceof PackageRepositoryError &&
                error.type === 'BAD_TOKEN'
            ) {
                this.token = undefined;
                this.token = await this.fetchToken();
            } else {
                throw error;
            }
        }
    }
}

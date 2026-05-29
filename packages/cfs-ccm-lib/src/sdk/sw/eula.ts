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

import { CfsApiClient, CfsApiError } from '../cfsapi-client.js';
import { CfsCcmError } from '../../error/error.js';
import { LIB_VERSION } from '../../config/constants.cjs';

type PackageEulaErrorType =
    | 'SERVICE_ERROR'
    | 'INVALID_REQUEST'
    | 'UNHANDLED_ERROR';

/** Error thrown when there is an issue recording a package EULA acceptance. */
export class PackageEulaError extends CfsCcmError<PackageEulaErrorType> {}

export class EulaClient {
    /**
     * Instantiates a new EulaClient which can be used to accept EULAs.
     * @param cfsApiClient CFS API client to use.
     * @param cfsVersion CFS version to use when accepting EULAs. Defaults to LIB_VERSION.
     */
    constructor(
        private readonly cfsApiClient: CfsApiClient,
        private readonly cfsVersion: string = LIB_VERSION,
    ) {}

    /**
     * Records the acceptance of a package EULA for a given package and version.
     * @param packageName the name of the package whose EULA is being accepted.
     * @param packageVersion the version of the package whose EULA is being accepted.
     * @returns Promise<void> which resolves if the EULA acceptance was successfully recorded
     * @throws {CfsApiError} if there was an authentication error or if access was forbidden
     * @throws {PackageEulaError} if there was an error with the EULA acceptance request
     */
    public async acceptEula(
        packageName: string,
        packageVersion: string,
    ): Promise<void> {
        try {
            const response = await this.cfsApiClient.fetch.POST(
                '/sw/packages/eulas/accept',
                {
                    body: {
                        packageName,
                        packageVersion,
                        clientVersion: this.cfsVersion,
                        acceptedAt: new Date().toISOString(),
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
                            cause: response,
                        });
                    case 403:
                        throw new CfsApiError({
                            type: 'FORBIDDEN',
                            message:
                                response.error?.message ||
                                'Access forbidden',
                            cause: response,
                        });
                    case 400:
                        throw new PackageEulaError({
                            type: 'INVALID_REQUEST',
                            message:
                                response.error?.message ||
                                'Bad request',
                            cause: response,
                        });
                    case 500:
                        throw new PackageEulaError({
                            type: 'SERVICE_ERROR',
                            message:
                                response.error?.message ||
                                'Service error',
                            cause: response,
                        });
                }
                throw new PackageEulaError({
                    type: 'UNHANDLED_ERROR',
                    message: 'Failed to record EULA acceptance',
                    cause: response,
                });
            }
        } catch (error) {
            if (
                error instanceof CfsApiError ||
                error instanceof PackageEulaError
            ) {
                throw error;
            }
            throw new PackageEulaError({
                type: 'UNHANDLED_ERROR',
                message: 'Error recording EULA acceptance',
                cause: error,
            });
        }
    }
}

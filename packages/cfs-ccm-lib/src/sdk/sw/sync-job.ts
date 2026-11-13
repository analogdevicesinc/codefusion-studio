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

import type { components } from 'cfs-ccm-api/api-types';

type PackageSyncErrorType =
    | 'SERVICE_ERROR'
    | 'INVALID_REQUEST'
    | 'NOT_FOUND'
    | 'POLL_TIMEOUT'
    | 'UNHANDLED_ERROR';

/** Error thrown when there is an issue requesting or querying a package sync job. */
export class PackageSyncError extends CfsCcmError<PackageSyncErrorType> {}

/** Parameters describing the packages to synchronise. */
export type PackageSyncRequest =
    components['schemas']['main.PackageSyncRequest'];

/** Status of a package sync job. */
export type PackageSyncJobStatus =
    components['schemas']['swpackage.JobStatus'];

/** Details of a package sync job. */
export type PackageSyncJobDetails =
    components['schemas']['main.PackageSyncStatusResponse'];

const TERMINAL_STATUSES: readonly PackageSyncJobStatus[] = [
    'COMPLETED',
    'FAILED',
    'ABORTED',
    'TIMEOUT',
];

/**
 * Determines whether a sync job status represents a completed job.
 * @param status the job status to check.
 * @returns true if the job will not transition to another status.
 */
export function isTerminalSyncStatus(
    status: PackageSyncJobStatus,
): boolean {
    return TERMINAL_STATUSES.includes(status);
}

/** Client for requesting package sync jobs and reporting their status. */
export class PackageSyncClient {
    /**
     * Instantiates a new PackageSyncClient.
     * @param cfsApiClient CFS API client to use.
     */
    constructor(private readonly cfsApiClient: CfsApiClient) {}

    /**
     * Requests a new package sync job.
     * @param request the packages to synchronise. Omitted fields widen the scope of the sync.
     * @param request.packageName optional name of the package to sync.
     * @param request.packageVersion optional version of the package to sync.
     * @param request.repoUrl optional URL of the repository to sync from.
     * @param signal optional signal used to abort the request.
     * @returns Promise<string> resolving to the ID of the newly created job.
     * @throws {CfsApiError} if there was an authentication error or if access was forbidden.
     * @throws {PackageSyncError} if the sync request could not be created.
     */
    public async requestSync(
        request: PackageSyncRequest = {},
        signal?: AbortSignal,
    ): Promise<string> {
        try {
            const response = await this.cfsApiClient.fetch.POST(
                '/sw/packages/sync',
                { body: request, signal },
            );

            if (response.error || response.response.status !== 202) {
                this.throwForStatus(
                    response.response.status,
                    response.error?.message,
                    response,
                    'Failed to request package sync',
                );
            }

            return response.data.jobID;
        } catch (error) {
            if (signal?.aborted) {
                throw signal.reason;
            }
            throw this.wrapError(
                error,
                'Error requesting package sync',
            );
        }
    }

    /**
     * Gets the status of an existing package sync job.
     * @param jobID the ID of the sync job.
     * @param signal optional signal used to abort the request.
     * @returns Promise<PackageSyncJobDetails> describing the current state of the job.
     * @throws {CfsApiError} if there was an authentication error or if access was forbidden.
     * @throws {PackageSyncError} if the job status could not be retrieved.
     */
    public async getSyncStatus(
        jobID: string,
        signal?: AbortSignal,
    ): Promise<PackageSyncJobDetails> {
        try {
            const response = await this.cfsApiClient.fetch.GET(
                '/sw/packages/sync/status/{jobID}',
                { params: { path: { jobID } }, signal },
            );

            if (response.error || response.response.status !== 200) {
                this.throwForStatus(
                    response.response.status,
                    response.error?.message,
                    response,
                    'Failed to get package sync status',
                );
            }

            return response.data;
        } catch (error) {
            if (signal?.aborted) {
                throw signal.reason;
            }
            throw this.wrapError(
                error,
                'Error getting package sync status',
            );
        }
    }

    /**
     * Polls a package sync job until it reaches a terminal status.
     * @param jobID the ID of the sync job.
     * @param options polling options.
     * @param options.intervalMs delay between status checks in milliseconds. Defaults to 2000.
     * @param options.timeoutMs maximum time to wait in milliseconds. Defaults to 300000.
     * @param options.onProgress optional callback invoked with each status returned by the service.
     * @param options.signal optional signal used to stop polling early.
     * @returns Promise<PackageSyncJobDetails> the final status of the job.
     * @throws {PackageSyncError} with type `POLL_TIMEOUT` if the job did not complete before the timeout elapsed.
     */
    public async waitForSync(
        jobID: string,
        {
            intervalMs = 2000,
            timeoutMs = 300000,
            onProgress,
            signal,
        }: {
            intervalMs?: number;
            timeoutMs?: number;
            onProgress?: (status: PackageSyncJobDetails) => void;
            signal?: AbortSignal;
        } = {},
    ): Promise<PackageSyncJobDetails> {
        const timeoutSignal =
            Number.isFinite(timeoutMs) && timeoutMs > 0
                ? AbortSignal.timeout(timeoutMs)
                : undefined;
        const pollSignal = timeoutSignal
            ? signal
                ? AbortSignal.any([signal, timeoutSignal])
                : timeoutSignal
            : (signal ?? AbortSignal.any([]));

        intervalMs =
            Number.isFinite(intervalMs) && intervalMs > 0
                ? intervalMs
                : 2000;

        try {
            for (;;) {
                const status = await this.getSyncStatus(
                    jobID,
                    pollSignal,
                );
                onProgress?.(status);

                if (isTerminalSyncStatus(status.status)) {
                    return status;
                }

                await this.delay(intervalMs, pollSignal);
            }
        } catch (error) {
            if (timeoutSignal?.aborted) {
                throw new PackageSyncError({
                    type: 'POLL_TIMEOUT',
                    message: `Timed out after ${timeoutMs}ms waiting for package sync job ${jobID}`,
                    cause: error,
                });
            }
            throw error;
        }
    }

    private async delay(
        ms: number,
        signal: AbortSignal,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (signal.aborted) {
                reject(signal.reason);
                return;
            }
            const onAbort = () => {
                clearTimeout(timer);
                reject(signal.reason);
            };
            const timer = setTimeout(() => {
                signal.removeEventListener('abort', onAbort);
                resolve();
            }, ms);
            signal.addEventListener('abort', onAbort, { once: true });
        });
    }

    private throwForStatus(
        status: number,
        message: string | undefined,
        cause: unknown,
        fallbackMessage: string,
    ): never {
        switch (status) {
            case 401:
                throw new CfsApiError({
                    type: 'AUTHN_REQUIRED',
                    message: message || 'Authentication required',
                    cause,
                });
            case 403:
                throw new CfsApiError({
                    type: 'FORBIDDEN',
                    message: message || 'Access forbidden',
                    cause,
                });
            case 400:
                throw new PackageSyncError({
                    type: 'INVALID_REQUEST',
                    message: message || 'Bad request',
                    cause,
                });
            case 404:
                throw new PackageSyncError({
                    type: 'NOT_FOUND',
                    message: message || 'Sync job not found',
                    cause,
                });
            case 500:
                throw new PackageSyncError({
                    type: 'SERVICE_ERROR',
                    message: message || 'Service error',
                    cause,
                });
            default:
                throw new PackageSyncError({
                    type: 'UNHANDLED_ERROR',
                    message: message || fallbackMessage,
                    cause,
                });
        }
    }

    private wrapError(error: unknown, message: string): Error {
        if (
            error instanceof CfsApiError ||
            error instanceof PackageSyncError
        ) {
            return error;
        }
        return new PackageSyncError({
            type: 'UNHANDLED_ERROR',
            message,
            cause: error,
        });
    }
}

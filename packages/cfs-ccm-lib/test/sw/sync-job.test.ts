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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import nock from 'nock';
import {
    PackageSyncClient,
    PackageSyncError,
    isTerminalSyncStatus,
} from '../../src/sdk/index.js';
import type { PackageSyncJobDetails } from '../../src/sdk/index.js';
import {
    CfsApiClient,
    CfsApiError,
} from '../../src/sdk/cfsapi-client.js';

use(chaiAsPromised);

const API_URL = 'http://api.test.me';
const JOB_ID = 'job-1234';
const SYNC_PATH = '/sw/packages/sync';
const STATUS_PATH = `/sw/packages/sync/status/${JOB_ID}`;

const syncRequest = {
    packageName: 'test-package',
    packageVersion: '1.0.0',
    repoUrl: 'https://adi.repo.test/my/repo',
};

const runningStatus = {
    jobID: JOB_ID,
    status: 'RUNNING',
    startedAt: '2026-01-01T00:00:00Z',
    itemsProcessed: 3,
};

const completedStatus = {
    jobID: JOB_ID,
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00Z',
    finishedAt: '2026-01-01T00:01:00Z',
    itemsProcessed: 10,
};

let client: PackageSyncClient;
let cfsApiClient: CfsApiClient;
const nockScope = nock(API_URL, { allowUnmocked: false });

beforeEach(() => {
    cfsApiClient = new CfsApiClient({ baseUrl: API_URL });
    client = new PackageSyncClient(cfsApiClient);
});

afterEach(() => {
    expect(nockScope.isDone(), 'Not all nock interceptors were used')
        .to.be.true;
    nock.cleanAll();
});

describe('isTerminalSyncStatus', () => {
    it('should report terminal statuses', () => {
        expect(isTerminalSyncStatus('COMPLETED')).to.be.true;
        expect(isTerminalSyncStatus('FAILED')).to.be.true;
        expect(isTerminalSyncStatus('ABORTED')).to.be.true;
        expect(isTerminalSyncStatus('TIMEOUT')).to.be.true;
    });

    it('should report non-terminal statuses', () => {
        expect(isTerminalSyncStatus('QUEUED')).to.be.false;
        expect(isTerminalSyncStatus('PENDING_RETRY')).to.be.false;
        expect(isTerminalSyncStatus('RUNNING')).to.be.false;
        expect(isTerminalSyncStatus('UNKNOWN')).to.be.false;
    });
});

describe('PackageSyncClient', () => {
    describe('requestSync', () => {
        it('should return the job ID of the new sync job', async () => {
            nockScope
                .post(SYNC_PATH, syncRequest)
                .reply(202, { jobID: JOB_ID });

            await expect(
                client.requestSync(syncRequest),
            ).to.eventually.equal(JOB_ID);
        });

        it('should request a full sync when no parameters are given', async () => {
            nockScope
                .post(SYNC_PATH, {})
                .reply(202, { jobID: JOB_ID });

            await expect(client.requestSync()).to.eventually.equal(
                JOB_ID,
            );
        });

        it('should throw PackageSyncError<INVALID_REQUEST> if the request is rejected', async () => {
            nockScope
                .post(SYNC_PATH)
                .reply(400, { message: 'Invalid request' });

            await expect(client.requestSync(syncRequest))
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'INVALID_REQUEST');
        });

        it('should throw PackageSyncError<SERVICE_ERROR> if the server fails to process the request', async () => {
            nockScope
                .post(SYNC_PATH)
                .reply(500, { message: 'Service error' });

            await expect(client.requestSync(syncRequest))
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'SERVICE_ERROR');
        });

        it('should throw PackageSyncError<UNHANDLED_ERROR> if an unexpected error occurs', async () => {
            nockScope
                .post(SYNC_PATH)
                .reply(418, { message: `I'm a teapot` });

            await expect(client.requestSync(syncRequest))
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'UNHANDLED_ERROR');
        });

        it('should throw CfsApiError<AUTHN_REQUIRED> if the provided authentication is not valid', async () => {
            nockScope
                .post(SYNC_PATH)
                .reply(401, { message: 'Authentication required' });

            await expect(client.requestSync(syncRequest))
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'AUTHN_REQUIRED');
        });

        it('should throw CfsApiError<FORBIDDEN> if access is forbidden', async () => {
            nockScope
                .post(SYNC_PATH)
                .reply(403, { message: 'Access forbidden' });

            await expect(client.requestSync(syncRequest))
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'FORBIDDEN');
        });
    });

    describe('getSyncStatus', () => {
        it('should return the status of an existing job', async () => {
            nockScope.get(STATUS_PATH).reply(200, completedStatus);

            await expect(
                client.getSyncStatus(JOB_ID),
            ).to.eventually.deep.equal(completedStatus);
        });

        it('should throw PackageSyncError<NOT_FOUND> if the job does not exist', async () => {
            nockScope
                .get(STATUS_PATH)
                .reply(404, { message: 'Job not found' });

            await expect(client.getSyncStatus(JOB_ID))
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'NOT_FOUND');
        });

        it('should throw PackageSyncError<SERVICE_ERROR> if the server fails to process the request', async () => {
            nockScope
                .get(STATUS_PATH)
                .reply(500, { message: 'Service error' });

            await expect(client.getSyncStatus(JOB_ID))
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'SERVICE_ERROR');
        });

        it('should throw CfsApiError<AUTHN_REQUIRED> if the provided authentication is not valid', async () => {
            nockScope
                .get(STATUS_PATH)
                .reply(401, { message: 'Authentication required' });

            await expect(client.getSyncStatus(JOB_ID))
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'AUTHN_REQUIRED');
        });
    });

    describe('waitForSync', () => {
        it('should poll until the job reaches a terminal status', async () => {
            nockScope.get(STATUS_PATH).reply(200, runningStatus);
            nockScope.get(STATUS_PATH).reply(200, completedStatus);

            const progress: PackageSyncJobDetails[] = [];
            const result = await client.waitForSync(JOB_ID, {
                intervalMs: 1,
                timeoutMs: 1000,
                onProgress: (status) => progress.push(status),
            });

            expect(result).to.deep.equal(completedStatus);
            expect(
                progress.map((status) => status.status),
            ).to.deep.equal(['RUNNING', 'COMPLETED']);
        });

        for (const timeoutMs of [0, -1, Infinity, NaN]) {
            it(`should ignore a non-positive or non-finite timeout of ${timeoutMs}`, async () => {
                nockScope
                    .get(STATUS_PATH)
                    .reply(200, completedStatus);

                await expect(
                    client.waitForSync(JOB_ID, { timeoutMs }),
                ).to.eventually.deep.equal(completedStatus);
            });
        }

        for (const intervalMs of [0, -1, Infinity, NaN]) {
            it(`should ignore a non-positive or non-finite interval of ${intervalMs}`, async () => {
                nockScope
                    .get(STATUS_PATH)
                    .reply(200, completedStatus);

                await expect(
                    client.waitForSync(JOB_ID, { intervalMs }),
                ).to.eventually.deep.equal(completedStatus);
            });
        }

        it('should throw PackageSyncError<POLL_TIMEOUT> if the job does not complete in time', async () => {
            nockScope.get(STATUS_PATH).reply(200, runningStatus);

            await expect(
                client.waitForSync(JOB_ID, {
                    intervalMs: 10,
                    timeoutMs: 5,
                }),
            )
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'POLL_TIMEOUT');
        });

        it('should time out while a status request is still in flight', async () => {
            nockScope
                .get(STATUS_PATH)
                .delay(100)
                .reply(200, runningStatus);
            await expect(
                client.waitForSync(JOB_ID, {
                    intervalMs: 10,
                    timeoutMs: 5,
                }),
            )
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'POLL_TIMEOUT');
        });

        it('should propagate errors returned while polling', async () => {
            nockScope
                .get(STATUS_PATH)
                .reply(404, { message: 'Job not found' });

            await expect(
                client.waitForSync(JOB_ID, {
                    intervalMs: 1,
                    timeoutMs: 1000,
                }),
            )
                .to.eventually.be.rejectedWith(PackageSyncError)
                .that.has.property('type', 'NOT_FOUND');
        });
    });
});

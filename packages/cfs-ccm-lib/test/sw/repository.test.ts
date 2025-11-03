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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import nock from 'nock';
import {
    RepositoryClient,
    PackageRepository,
    PackageRepositoryError,
} from '../../src/sdk/index.js';
import {
    CfsApiClient,
    CfsApiError,
} from '../../src/sdk/cfsapi-client.js';

use(chaiAsPromised);

const API_URL = 'http://api.test.me';
const REPO_URL = 'https://adi.repo.test/my/repo';

let client: RepositoryClient;
let repo: PackageRepository;
let cfsApiClient: CfsApiClient;
const nockScope = nock(API_URL, { allowUnmocked: false });

const requestResponse = {
    repoUrl: REPO_URL,
    entitlementType: 'PACKAGE_REPO_TOKEN',
    token: 'test-token',
};

const refreshResponse = {
    repoUrl: REPO_URL,
    entitlementType: 'PACKAGE_REPO_TOKEN',
    token: 'refreshed-token',
};

beforeEach(() => {
    cfsApiClient = new CfsApiClient({ baseUrl: API_URL });
});

afterEach(() => {
    expect(nockScope.isDone(), 'Not all nock interceptors were used');
    nock.cleanAll();
});

describe('RepositoryClient', () => {
    beforeEach(() => {
        client = new RepositoryClient(cfsApiClient);
    });

    describe('getRepository', () => {
        it('should fetch the repository', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse);

            await expect(
                client.getRepository(requestResponse.repoUrl),
            ).to.eventually.be.instanceOf(PackageRepository);
        });

        it('should throw PackageRepositoryError<UNSUPPORTED_REPOSITORY> if the repository is not supported', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(400, {
                    message: `Unsupported repository: ${requestResponse.repoUrl}`,
                });

            await expect(
                client.getRepository(requestResponse.repoUrl),
            )
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'UNSUPPORTED_REPOSITORY');
        });
    });
});

describe('PackageRepository', () => {
    beforeEach(() => {
        repo = new PackageRepository(cfsApiClient, REPO_URL);
    });
    describe('getToken', () => {
        it('should return the token if it exists', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse);

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
        });

        it('should return undefined if no token exists', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(404, { message: 'Not Found' });

            await expect(repo.getToken()).to.eventually.be.undefined;
        });

        it('should throw CfsApiError<AUTHN_REQUIRED> if the request is unauthorized', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(401, { message: 'Unauthorized' });

            await expect(repo.getToken())
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'AUTHN_REQUIRED');
        });

        it('should throw CfsApiError<FORBIDDEN> if the request is forbidden', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(403, { message: 'Forbidden' });

            await expect(repo.getToken())
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'FORBIDDEN');
        });

        it('should throw PackageRepositoryError<SERVICE_ERROR> if the cloud service cannot handle the request', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(500, { message: 'Internal Server Error' });

            await expect(repo.getToken())
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'SERVICE_ERROR');
        });

        it('should throw PackageRepositoryError<UNHANDLED_ERROR> if the cloud service rejects the request', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(400, { message: 'Bad Request' });

            await expect(repo.getToken())
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'UNHANDLED_ERROR');
        });
    });
    describe('refreshToken', () => {
        it('should refresh the token if it exists', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(200, refreshResponse);

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await repo.refreshToken();
            await expect(repo.getToken()).to.eventually.deep.equal(
                refreshResponse.token,
            );
        });

        it("should request the token if it doesn't exist", async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse);

            await repo.refreshToken();
            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
        });

        it('should request a new token if it is no longer valid', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(400, {
                    message: 'Invalid token',
                })
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, refreshResponse);

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await repo.refreshToken();
            await expect(repo.getToken()).to.eventually.deep.equal(
                refreshResponse.token,
            );
        });

        it('should throw CfsApiError<AUTHN_REQUIRED> if the request is unauthorized', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(401, { message: 'Unauthorized' });
            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await expect(repo.refreshToken())
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'AUTHN_REQUIRED');
        });

        it('should throw CfsApiError<FORBIDDEN> if the request is forbidden', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(403, { message: 'Forbidden' });

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await expect(repo.refreshToken())
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'FORBIDDEN');
        });

        it('should throw PackageRepositoryError<SERVICE_ERROR> if the cloud service cannot handle the request', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(500, { message: 'Internal Server Error' });

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await expect(repo.refreshToken())
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'SERVICE_ERROR');
        });

        it('should throw PackageRepositoryError<UNHANDLED_ERROR> if the cloud service rejects the request', async () => {
            nockScope
                .post('/users/entitlements', {
                    repoUrl: requestResponse.repoUrl,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', requestResponse)
                .reply(400, { message: 'Bad Request' });

            await expect(repo.getToken()).to.eventually.deep.equal(
                requestResponse.token,
            );
            await expect(repo.refreshToken())
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'UNHANDLED_ERROR');
        });
    });
});

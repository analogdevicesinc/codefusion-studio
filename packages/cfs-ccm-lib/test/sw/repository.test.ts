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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import nock from 'nock';
import {
    RepositoryClient,
    PackageRepository,
    PackageRepositoryError,
} from '../../src/sdk/index.js';
import type { SWPackageRepo } from 'cfs-ccm-api/rest-types';
import {
    CfsApiClient,
    CfsApiError,
} from '../../src/sdk/cfsapi-client.js';

use(chaiAsPromised);

const API_URL = 'http://api.test.me';
const REPO_URL = 'https://adi.repo.test/my/repo';
const REPO_URL_2 = 'https://adi.repo.test/my/2nd_repo';
const REPO_URL_3 = 'https://adi.repo.test/my/32d_repo';

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

const repositoryListResponse = {
    items: [
        {
            id: '1',
            repoUrl: REPO_URL,
            packageFormat: 'conan',
            repoName: 'ADI Conan Repo 1',
            authRequired: true,
            disabledByDefault: false,
        },
        {
            id: '2',
            repoUrl: REPO_URL_2,
            packageFormat: 'conan',
            repoName: 'ADI Conan Repo 2',
            authRequired: true,
            disabledByDefault: false,
        },
        {
            id: '3',
            repoUrl: REPO_URL_3,
            packageFormat: 'docker',
            repoName: 'ADI Docker Repo',
            authRequired: true,
            disabledByDefault: false,
        },
    ] as SWPackageRepo[],
};

const invalidRepositoryListResponse = {
    items: [
        {
            id: '1',
            repoUrl: REPO_URL,
            // packageFormat, authRequired, and disabledByDefault are intentionally missing to trigger validation failure
        },
    ],
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
        it('should fetch the repository for a given URL', async () => {
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

    describe('getRepositoryInfo', () => {
        it('should return all repository info when no format filter is provided', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse);

            const repos = await client.getRepositoryInfo();
            expect(repos).to.be.an('array').with.length(3);
            for (const repo of repos) {
                expect(repo).to.have.all.keys(
                    'id',
                    'repoUrl',
                    'packageFormat',
                    'repoName',
                    'authRequired',
                    'disabledByDefault',
                );
            }
        });

        it('should filter repositories by format', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse);

            const repos = await client.getRepositoryInfo({
                format: 'conan',
            });
            expect(repos).to.be.an('array').with.length(2);
            for (const repo of repos) {
                expect(repo.packageFormat).to.equal('conan');
            }
        });

        it('should return an empty array when no repositories match the format filter', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse);

            await expect(
                client.getRepositoryInfo({ format: 'npm' }),
            ).to.eventually.deep.equal([]);
        });

        it('should throw PackageRepositoryError<UNHANDLED_ERROR> if the response contains invalid entries', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, invalidRepositoryListResponse);

            await expect(client.getRepositoryInfo())
                .to.eventually.be.rejectedWith(PackageRepositoryError)
                .that.has.property('type', 'UNHANDLED_ERROR');
        });
    });

    describe('getRepositoryUrls', () => {
        it('should fetch the array of available repository URLs', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse);

            await expect(
                client.getRepositoryUrls(),
            ).to.eventually.deep.equal([
                REPO_URL,
                REPO_URL_2,
                REPO_URL_3,
            ]);
        });

        it('should filter repository URLs by format', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse);

            await expect(
                client.getRepositoryUrls({ format: 'docker' }),
            ).to.eventually.deep.equal([REPO_URL_3]);
        });
    });

    describe('getRepositories', () => {
        it('should fetch the array of available repositories', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse)
                .post('/users/entitlements', {
                    repoUrl: REPO_URL,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, requestResponse)
                .post('/users/entitlements', {
                    repoUrl: REPO_URL_2,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, {
                    ...requestResponse,
                    repoUrl: REPO_URL_2,
                })
                .post('/users/entitlements', {
                    repoUrl: REPO_URL_3,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, {
                    ...requestResponse,
                    repoUrl: REPO_URL_3,
                });

            const repos = await client.getRepositories();
            expect(repos).to.be.an('array').with.length(3);
            for (const repo of repos) {
                expect(repo).to.be.instanceOf(PackageRepository);
                expect(repo.repoUrl).to.be.oneOf([
                    REPO_URL,
                    REPO_URL_2,
                    REPO_URL_3,
                ]);
            }
        });

        it('should fetch only repositories matching the format filter', async () => {
            nockScope
                .get('/sw/packages/repos')
                .reply(200, repositoryListResponse)
                .post('/users/entitlements', {
                    repoUrl: REPO_URL_3,
                    entitlementType: requestResponse.entitlementType,
                })
                .reply(200, {
                    ...requestResponse,
                    repoUrl: REPO_URL_3,
                });

            const repos = await client.getRepositories({
                format: 'docker',
            });
            expect(repos).to.be.an('array').with.length(1);
            expect(repos[0]).to.be.instanceOf(PackageRepository);
            expect(repos[0].repoUrl).to.equal(REPO_URL_3);
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

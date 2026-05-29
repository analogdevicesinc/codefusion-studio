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
import { EulaClient, PackageEulaError } from '../../src/sdk/index.js';
import {
    CfsApiClient,
    CfsApiError,
} from '../../src/sdk/cfsapi-client.js';

import { LIB_VERSION } from '../../src/config/constants.cjs';

use(chaiAsPromised);

const API_URL = 'http://api.test.me';

let client: EulaClient;
let cfsApiClient: CfsApiClient;
const nockScope = nock(API_URL, { allowUnmocked: false });

const requestResponse = {
    message: 'EULA acceptance recorded successfully',
} as const;

// Predicate to match expected request since acceptedAt is generated in the function
const matchRequest = function (body: any): boolean {
    const acceptedAt = Date.parse(body.acceptedAt);
    return (
        !isNaN(acceptedAt) && // Check acceptedAt is a valid date
        acceptedAt <= Date.now() && // Check acceptedAt is not in the future
        acceptedAt >= Date.now() - 5 * 60 * 1000 && // Check acceptedAt is within the last 5 minutes
        body.packageName === 'test-package' &&
        body.packageVersion === '1.0.0' &&
        body.clientVersion === LIB_VERSION
    );
};

beforeEach(() => {
    cfsApiClient = new CfsApiClient({ baseUrl: API_URL });
});

afterEach(() => {
    expect(nockScope.isDone(), 'Not all nock interceptors were used');
    nock.cleanAll();
});

describe('EulaClient', () => {
    beforeEach(() => {
        client = new EulaClient(cfsApiClient);
    });

    describe('acceptEula', () => {
        it('should record the acceptance of a package EULA', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(200, requestResponse);

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.undefined;
        });

        it('should throw PackageEulaError<INVALID_REQUEST> if the request is rejected', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(400, {
                    message: `Invalid request`,
                });

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.rejectedWith(PackageEulaError)
                .that.has.property('type', 'INVALID_REQUEST');
        });

        it('should throw PackageEulaError<SERVICE_ERROR> if the server fails to process the request', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(500, {
                    message: `Service error`,
                });

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.rejectedWith(PackageEulaError)
                .that.has.property('type', 'SERVICE_ERROR');
        });

        it('should throw PackageEulaError<UNHANDLED_ERROR> if an unexpected error occurs', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(418, {
                    message: `I'm a teapot`,
                });

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.rejectedWith(PackageEulaError)
                .that.has.property('type', 'UNHANDLED_ERROR');
        });

        it('should throw CfsApiError<AUTHN_REQUIRED> if the provided authentication is not valid', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(401, {
                    message: `Authentication required`,
                });

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'AUTHN_REQUIRED');
        });

        it('should throw CfsApiError<FORBIDDEN> if access is forbidden', async () => {
            nockScope
                .post('/sw/packages/eulas/accept', matchRequest)
                .reply(403, {
                    message: `Access forbidden`,
                });

            await expect(client.acceptEula('test-package', '1.0.0'))
                .to.eventually.be.rejectedWith(CfsApiError)
                .that.has.property('type', 'FORBIDDEN');
        });
    });
});

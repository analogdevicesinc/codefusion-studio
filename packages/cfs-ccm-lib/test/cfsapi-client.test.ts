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

import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import { CfsApiClient } from '../src/sdk/cfsapi-client.js';
import nock from 'nock';

const API_URL: string = 'http://api.test.me';
chai.use(chaiAsPromised);

describe('CfsApiClient', () => {
    let client: CfsApiClient;
    let nockScope: nock.Scope;

    afterEach(() => {
        nock.cleanAll();
    });

    beforeEach(() => {
        client = new CfsApiClient({
            baseUrl: API_URL,
            isCache: false,
        });
    });

    describe('testConnection', () => {
        it('should return if the connection is successful', async () => {
            nockScope = nock(API_URL).get('/pingAuth').reply(202, {
                message: 'test',
            });

            await expect(client.testConnection()).to.eventually.not.be
                .rejected;
        });

        it('should throw if the API is unavailable', async () => {
            nockScope = nock(API_URL).get('/pingAuth').reply(500, {
                message: 'test',
            });

            await expect(client.testConnection()).to.eventually.be
                .rejected;
        });

        it('should throw if the client is not authorized', async () => {
            nockScope = nock(API_URL).get('/pingAuth').reply(401, {
                message: 'test',
            });

            await expect(client.testConnection()).to.eventually.be
                .rejected;
        });

        it('should throw if there is a client-side error', async () => {
            client = new CfsApiClient({
                baseUrl:
                    'http://api.test.me.invalid.url.should.fail/hostwontresolve',
                isCache: false,
            });

            await expect(client.testConnection(0)).to.eventually.be
                .rejected;
        });

        it('should throw if the timeout is exceeded', async () => {
            nockScope = nock(API_URL)
                .get('/pingAuth')
                .delay(500) // 500ms delay
                .reply(200, {
                    message: 'test',
                });
            const startTime = process.hrtime();
            await expect(client.testConnection(200)).to.eventually.be
                .rejected; // 200ms timeout
            const elapsed = process.hrtime(startTime); // [seconds, nanoseconds]
            expect(
                elapsed[0] * 1000 + elapsed[1] / 1e6,
            ).to.be.lessThan(500);
        });
    });

    describe('isOnline', () => {
        it('should return true if the API is online', async () => {
            nockScope = nock(API_URL)
                .get('/ping')
                .reply(200, 'Healthy Connection');

            await expect(client.isOnline()).eventually.be.true;
        });

        it('should return false if the API is offline', async () => {
            nockScope = nock(API_URL)
                .get('/ping')
                .reply(500, 'Connection Error');

            await expect(client.isOnline()).eventually.be.false;
        });

        it('should return false if there is a client-side error (and not throw)', async () => {
            client = new CfsApiClient({
                baseUrl:
                    'http://api.test.me.invalid.url.should.fail/hostwontresolve',
                isCache: false,
            });

            await expect(client.isOnline(0)).eventually.be.false;
        });

        it('should return false if the timeout is exceeded', async () => {
            nockScope = nock(API_URL)
                .get('/ping')
                .delay(500) // 500ms delay
                .reply(200, 'Healthy Connection');
            const startTime = process.hrtime();
            await expect(client.isOnline(200)).eventually.be.false; // 200ms timeout
            const elapsed = process.hrtime(startTime); // [seconds, nanoseconds]
            expect(
                elapsed[0] * 1000 + elapsed[1] / 1e6,
            ).to.be.lessThan(500);
        });
    });

    describe('fetch', () => {
        // checks that the http calls are actually made
        it('should properly route to enabled methods', async () => {
            nockScope = nock(API_URL).get('/pingAuth').reply(200, {
                message: 'test',
            });
            await client.fetch.GET('/pingAuth');
            expect(nockScope.isDone()).to.be.true;
        });

        it('should not allow access to non-CRUD methods', () => {
            // @ts-expect-error: proxy should not allow access to unused OPTIONS method
            expect(() => client.fetch.OPTIONS()).to.throw();
            // @ts-expect-error: proxy should not allow access to unused HEAD method
            expect(() => client.fetch.HEAD()).to.throw();
            // @ts-expect-error: proxy should not allow access to unused PATCH method
            expect(() => client.fetch.PATCH()).to.throw();
            // @ts-expect-error: proxy should not allow access to unused TRACE method
            expect(() => client.fetch.TRACE()).to.throw();
            // @ts-expect-error: proxy should restrict access to use() of OpenApiClient
            expect(() => client.fetch.use()).to.throw();
            // @ts-expect-error: proxy should restrict access to eject() of OpenApiClient
            expect(() => client.fetch.eject()).to.throw();
        });

        it('should expose allowed CRUD methods', () => {
            expect(client.fetch.GET).to.be.a('function');
            expect(client.fetch.POST).to.be.a('function');
            expect(client.fetch.PUT).to.be.a('function');
            expect(client.fetch.DELETE).to.be.a('function');
        });

        it('should should expose the correct method types', async () => {
            nockScope = nock(API_URL).get('/madeUpRoute').reply(200, {
                message: 'test',
            });
            // @ts-expect-error: this invalid path wont compile if the types are working
            await client.fetch.GET('/madeUpRoute');
            // but it should actually work
            expect(nockScope.isDone()).to.be.true;
        });
    });
});

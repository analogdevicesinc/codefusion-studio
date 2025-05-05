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
import { ApiOptions, CfsApiClient } from '../../src/index.js';
import { ApiKeyAuthorizer } from '../../src/auth/index.js';
import nock from 'nock';

use(chaiAsPromised);

const API_URL: string = 'http://api.test.me';
const options: ApiOptions = {
    baseUrl: API_URL,
    isCache: false,
};

describe('ApiKeyAuthorizer tests', () => {
    afterEach(() => {
        nock.cleanAll();
    });

    // checks that the http header is being set
    it('should accept a string to use as the API key', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new ApiKeyAuthorizer({
                apiKey: 'MyApiKey',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [ApiKeyAuthorizer.DEFAULT_HTTP_HEADER]: 'MyApiKey',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });

    it('should reject an empty string to use as the API key', async () => {
        expect(() => {
            new ApiKeyAuthorizer({
                apiKey: '',
            });
        }).to.throw('invalid empty API key');
    });

    it('should accept a function which returns a string to use as the API key', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new ApiKeyAuthorizer({
                apiKey: () => 'MyApiKeyFromFunction',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [ApiKeyAuthorizer.DEFAULT_HTTP_HEADER]:
                    'MyApiKeyFromFunction',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });

    it('should fail if the api key function returns an empty string to use as the API key', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new ApiKeyAuthorizer({
                apiKey: () => '',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [ApiKeyAuthorizer.DEFAULT_HTTP_HEADER]: 'MyApiKey',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });
        await expect(
            client.fetch.GET('/pingAuth'),
        ).to.eventually.be.rejectedWith('invalid empty API key');
        expect(nockScope.isDone()).to.be.false;
    });

    it('should allow the header name to be overriden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new ApiKeyAuthorizer({
                apiKey: 'MyApiKey',
                httpHeader: 'X-Test-Header',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                'X-Test-Header': 'MyApiKey',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });

    it('should allow the header prefix to be overriden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new ApiKeyAuthorizer({
                apiKey: 'MyApiKey',
                httpPrefix: 'Prefix ',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [ApiKeyAuthorizer.DEFAULT_HTTP_HEADER]:
                    'Prefix MyApiKey',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });
});

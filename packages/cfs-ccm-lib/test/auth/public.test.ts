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

import { expect } from 'chai';
import 'mocha';
import { ApiOptions, CfsApiClient } from '../../src/index.js';
import { PublicAuthorizer } from '../../src/auth/index.js';
import nock from 'nock';

const API_URL: string = 'http://api.test.me';
const options: ApiOptions = {
    baseUrl: API_URL,
    isCache: false,
};

describe('PublicAuthorizer tests', () => {
    afterEach(() => {
        nock.cleanAll();
    });

    // checks that the http header is being set
    it('should set the cfs-user header for public access by default', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new PublicAuthorizer(),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [PublicAuthorizer.DEFAULT_HTTP_HEADER]:
                    PublicAuthorizer.DEFAULT_PUBLIC_USER,
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

    it('should allow the header name to be overridden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new PublicAuthorizer({
                httpHeader: 'X-Test-Header',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                'X-Test-Header': PublicAuthorizer.DEFAULT_PUBLIC_USER,
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

    it('should allow the header value to be overridden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new PublicAuthorizer({ publicUser: 'TEST' }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [PublicAuthorizer.DEFAULT_HTTP_HEADER]: 'TEST',
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

    it('should allow both the header name and public user to be overridden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new PublicAuthorizer({
                httpHeader: 'X-Test-Header',
                publicUser: 'TEST',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                'X-Test-Header': 'TEST',
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

    it('should ignore empty strings as header name or value overrides', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new PublicAuthorizer({
                httpHeader: '',
                publicUser: '',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [PublicAuthorizer.DEFAULT_HTTP_HEADER]:
                    PublicAuthorizer.DEFAULT_PUBLIC_USER,
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
            authorizer: new PublicAuthorizer({
                httpPrefix: 'Prefix ',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [PublicAuthorizer.DEFAULT_HTTP_HEADER]: `Prefix ${PublicAuthorizer.DEFAULT_PUBLIC_USER}`,
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

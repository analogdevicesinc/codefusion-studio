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
import { TokenAuthorizer } from '../../src/auth/index.js';
import nock from 'nock';

use(chaiAsPromised);

const API_URL: string = 'http://api.test.me';
const options: ApiOptions = {
    baseUrl: API_URL,
    isCache: false,
};

describe('TokenAuthorizer tests', () => {
    afterEach(() => {
        nock.cleanAll();
    });

    it('should set the Authorization header with the access token from a string', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'mytoken',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [TokenAuthorizer.DEFAULT_HTTP_HEADER]:
                    'Bearer mytoken',
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

    it('should throw an error if access token is an empty string', () => {
        expect(() => {
            new TokenAuthorizer({
                accessToken: '',
            });
        }).to.throw('invalid empty access token');
    });

    it('should set the Authorization header with the access token from a function', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: () => 'mytokenfunction',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [TokenAuthorizer.DEFAULT_HTTP_HEADER]:
                    'Bearer mytokenfunction',
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

    it('should throw an error if access token function returns an empty string', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: () => '',
            }),
        });

        const nockScope = nock(API_URL, {
            reqheaders: {
                [TokenAuthorizer.DEFAULT_HTTP_HEADER]: 'Bearer ',
            },
        })
            .get('/pingAuth')
            .reply(200, {
                message: 'test',
            });

        await expect(
            client.fetch.GET('/pingAuth'),
        ).to.eventually.be.rejectedWith('invalid empty access token');
        expect(nockScope.isDone()).to.be.false;
    });

    it('should allow the header prefix to be overriden', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'mytoken',
                httpPrefix: 'Token ',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [TokenAuthorizer.DEFAULT_HTTP_HEADER]:
                    'Token mytoken',
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

    it('should allow the header prefix to be overriden to an empty string', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'mytoken',
                httpPrefix: '',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                [TokenAuthorizer.DEFAULT_HTTP_HEADER]: 'mytoken',
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
            authorizer: new TokenAuthorizer({
                accessToken: 'mytoken',
                httpHeader: 'X-Test-Header',
            }),
        });
        const nockScope = nock(API_URL, {
            reqheaders: {
                'X-Test-Header': 'Bearer mytoken',
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

    it('should refresh the token and retry the request on 401 response (access token string)', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'oldToken',
                refreshHandler: () => 'newToken',
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken',
            )
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });

    it('should store the new token for future requests (access token string)', async () => {
        let count = 0;
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'oldToken',
                refreshHandler: () => `newToken${++count}`, // increments on each call
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth') // retry
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken1',
            )
            .reply(200, {
                message: 'test',
            })
            .get('/pingAuth') // new request
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken1', // unchanged from the first call to refreshHandler()
            )
            .reply(200, {
                message: 'test2',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        const resp2 = await client.fetch.GET('/pingAuth');
        expect(resp2.data).to.deep.equal({ message: 'test2' });
        nockScope.done();
    });

    it('should refresh the token and retry the request on 401 response (access token function)', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: () => 'oldToken',
                refreshHandler: () => 'newToken',
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken',
            )
            .reply(200, {
                message: 'test',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        nockScope.done();
    });

    it('should not store the new token for future requests (access token function)', async () => {
        let count = 0;
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: () => 'oldToken',
                refreshHandler: () => `newToken${++count}`,
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth') // retry
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken1',
            )
            .reply(200, {
                message: 'test',
            })
            .get('/pingAuth') // new request
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken', // the original token was not updated
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth') // retry
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken2', // refreshHandler() was called a second time
            )
            .reply(200, {
                message: 'test2',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.data).to.deep.equal({ message: 'test' });
        const resp2 = await client.fetch.GET('/pingAuth');
        expect(resp2.data).to.deep.equal({ message: 'test2' });
        nockScope.done();
    });

    it('should only retry the request once', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: () => 'oldToken',
                refreshHandler: () => 'newToken',
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            })
            .get('/pingAuth') // retry
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer newToken',
            )
            .reply(401, {
                message: 'Not authorized',
            }); // no second retry or new request

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.response.status).to.equal(401);
        expect(resp.error).to.deep.equal({
            message: 'Not authorized',
        });
        nockScope.done();
    });

    it('should return the 401 reponse if refresh function returns an empty string', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'oldToken',
                refreshHandler: () => '',
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.response.status).to.equal(401);
        expect(resp.error).to.deep.equal({
            message: 'Not authorized',
        });
        nockScope.done();
    });

    it('should return the 401 reponse if refresh function throws an error', async () => {
        const client = new CfsApiClient({
            ...options,
            authorizer: new TokenAuthorizer({
                accessToken: 'oldToken',
                refreshHandler: () => {
                    throw new Error('Refresh failed');
                },
            }),
        });
        const nockScope = nock(API_URL)
            .get('/pingAuth')
            .matchHeader(
                TokenAuthorizer.DEFAULT_HTTP_HEADER,
                'Bearer oldToken',
            )
            .reply(401, {
                message: 'Not authorized',
            });

        const resp = await client.fetch.GET('/pingAuth');
        expect(resp.response.status).to.equal(401);
        expect(resp.error).to.deep.equal({
            message: 'Not authorized',
        });
        nockScope.done();
    });
});

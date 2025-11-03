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
import {
    TokenAuthorizer,
    TokenSessionFileStorage,
    TokenAuthSession,
    TokenAuthSessionConfig,
} from '../../src/auth/index.js';
import nock from 'nock';
import temp from 'temp';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MiddlewareCallbackParams } from 'openapi-fetch';
import sinon from 'sinon';

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
        ).to.eventually.be.rejectedWith('invalid access token');
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

describe('TokenSessionFileStorage tests', () => {
    const localStorageDir: string = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'testLocalStorage',
        'session',
    );
    let tmpFile: string;
    before(async () => {
        await fs.mkdir(localStorageDir, { recursive: true });
    });
    beforeEach(async () => {
        tmpFile = temp.path({
            // we don't use temp.mkdirSync() because we want to keep the file if the test fails
            dir: localStorageDir,
            suffix: 'tmp_token_storage.json',
        });
    });
    afterEach(async function (this: Mocha.Context) {
        if (this.currentTest?.state === 'failed') {
            console.error(
                `Test failed, keeping temporary file: ${tmpFile}`,
            );
            return;
        }
        try {
            await fs.unlink(tmpFile);
        } catch {
            // Ignore if file does not exist
        }
    });

    it('should create and read/write sessions without encryption', async () => {
        const store =
            await TokenSessionFileStorage.createTokenStore(tmpFile);
        const sessions = [
            {
                userId: 'u',
                userEmail: 'e',
                scopes: ['s'],
                refreshToken: 'r',
            },
        ];
        await store.set(sessions);
        const loaded = await store.get();
        expect(loaded).to.deep.equal(sessions);
    });

    it('should create the file with permissions 0600', async function () {
        if (process.platform === 'win32') {
            // Windows does not support Unix file permissions in the same way
            this.skip();
        }
        await TokenSessionFileStorage.createTokenStore(tmpFile);
        const stats = await fs.stat(tmpFile);
        expect(stats.mode & 0o777).to.equal(
            0o600,
            'File permissions should be 0600',
        );
    });

    it('should throw if file is corrupted', async () => {
        await fs.writeFile(tmpFile, 'notjson');
        const store = await TokenSessionFileStorage.createTokenStore(
            tmpFile,
        ).catch(() => null);
        expect(store).to.be.null;
    });

    it('should throw if encryption key/alg mismatch', async () => {
        const key = crypto.createSecretKey(crypto.randomBytes(12)); // Invalid key length for AES-256-GCM
        await expect(
            TokenSessionFileStorage.createTokenStore(tmpFile, {
                encryptionKey: key,
                encryptionAlg: 'aes-256-gcm',
            }),
        ).to.eventually.be.rejected;
    });

    it('should encrypt and decrypt sessions', async () => {
        const key = crypto.createSecretKey(crypto.randomBytes(32));
        const alg = 'aes-256-gcm';
        const store = await TokenSessionFileStorage.createTokenStore(
            tmpFile,
            { encryptionKey: key, encryptionAlg: alg },
        );
        const sessions = [
            {
                userId: 'u',
                userEmail: 'e',
                scopes: ['s'],
                refreshToken: 'r',
            },
        ];
        await store.set(sessions);
        const loaded = await store.get();
        expect(loaded).to.deep.equal(sessions);
    });
});

describe('TokenAuthSession tests', () => {
    type SessionType = {
        userId: string;
        userEmail: string;
        scopes: string[];
        refreshToken: string;
    };
    type TokenType = { accessToken: string; expiresAt: Date };

    const baseSession: SessionType = {
        userId: 'u',
        userEmail: 'e',
        scopes: ['s'],
        refreshToken: 'r',
    };
    const baseToken: TokenType = {
        accessToken: 'tok',
        expiresAt: new Date(Date.now() + 100000),
    };

    afterEach(() => {
        sinon.restore();
    });

    it('should return empty array if storage has only has non-matching sessions', async () => {
        const fakeStorage = {
            get: async () => [
                {
                    ...baseSession,
                    userId: 'other',
                    refreshToken: 'r2',
                },
                {
                    ...baseSession,
                    userEmail: 'other',
                    refreshToken: 'r3',
                },
                {
                    ...baseSession,
                    scopes: ['other'],
                    refreshToken: 'r4',
                },
            ],
            set: async () => {},
        };
        const refreshSpy = sinon.spy(async () => baseToken);
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: async () => {},
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        expect(sessions).to.have.lengthOf(0);
        expect(refreshSpy.called).to.be.false;
        expect(createSpy.called).to.be.false;
    });

    it('should not return sessions if refresh fails for matching sessions', async () => {
        const fakeStorage = {
            get: async () => [{ ...baseSession }],
            set: async () => {},
        };
        const refreshSpy = sinon
            .stub()
            .rejects(new Error('refresh failed'));
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: async () => {},
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        expect(sessions).to.have.lengthOf(0);
        expect(refreshSpy.calledOnce).to.be.true;
        expect(createSpy.called).to.be.false;
    });

    it('should remove sessions which fail to refresh from storage', async () => {
        const setSpy = sinon.spy(async () => {});
        const fakeStorage = {
            get: async () => [
                {
                    ...baseSession,
                    userId: 'other',
                    refreshToken: 'r2',
                },
                { ...baseSession },
            ],
            set: setSpy,
        };
        const refreshSpy = sinon
            .stub()
            .rejects(new Error('refresh failed'));
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: async () => {},
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        expect(sessions).to.have.lengthOf(0);
        expect(refreshSpy.calledOnce).to.be.true;
        expect(createSpy.called).to.be.false;
        expect(setSpy.calledOnce).to.be.true;
        expect(setSpy.firstCall.args[0]).to.deep.equal([
            { ...baseSession, userId: 'other', refreshToken: 'r2' },
        ]);
    });

    it('should return all matching sessions, sorted by scopes length', async () => {
        const session1 = { ...baseSession, scopes: ['a'] };
        const session2 = {
            ...baseSession,
            scopes: ['a', 'b'],
            refreshToken: 'r2',
        };
        const session3 = {
            ...baseSession,
            scopes: ['a', 'b', 'c'],
            refreshToken: 'r3',
        };
        const fakeStorage = {
            get: async () => [session3, session1, session2],
            set: async () => {},
        };
        const refreshSpy = sinon.stub();
        refreshSpy.onCall(0).resolves(baseToken);
        refreshSpy.onCall(1).resolves(baseToken);
        refreshSpy.onCall(2).resolves(baseToken);
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: async () => {},
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['a'],
        });
        expect(sessions).to.have.lengthOf(3);
        // Sorted by scopes length
        expect(sessions[0].scopes).to.deep.equal(['a']);
        expect(sessions[1].scopes).to.deep.equal(['a', 'b']);
        expect(sessions[2].scopes).to.deep.equal(['a', 'b', 'c']);
        expect(refreshSpy.callCount).to.equal(3);
        expect(createSpy.called).to.be.false;
    });

    it('should create and store if create=true and no match', async () => {
        const setSpy = sinon.spy(async () => {});
        const fakeStorage = {
            get: async () => [],
            set: setSpy,
        };
        const refreshSpy = sinon.spy(async () => baseToken);
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: async () => {},
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(
            config,
            {
                userId: 'u',
                userEmail: 'e',
                scopes: ['s'],
            },
            true,
        );
        expect(sessions).to.have.lengthOf(1);
        expect(sessions).to.have.lengthOf(1);
        expect(sessions[0].userId).to.equal('u');
        expect(sessions[0].userEmail).to.equal('e');
        expect(sessions[0].scopes).to.deep.equal(['s']);
        expect(createSpy.calledOnce).to.be.true;
        expect(setSpy.calledOnce).to.be.true;
        expect(setSpy.firstCall.args[0]).to.deep.equal([
            { ...baseSession },
        ]);
        expect(refreshSpy.called).to.be.false;
    });

    it('should provide a TokenAuthorizer via authorizer getter', async () => {
        const fakeStorage = {
            get: async () => [{ ...baseSession }],
            set: async () => {},
        };
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: async () => baseToken,
                revoke: async () => {},
                create: async () => [baseSession, baseToken],
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        const auth = sessions[0].authorizer;
        expect(auth).to.be.instanceOf(TokenAuthorizer);
        expect(
            await auth.onRequest({
                request: new Request('http://test'),
            } as unknown as MiddlewareCallbackParams),
        ).to.be.ok;
    });

    it('should revoke and remove session on endSession', async () => {
        const setSpy = sinon.spy(async () => {});
        const fakeStorage = {
            get: async () => [
                { ...baseSession },
                {
                    ...baseSession,
                    userId: 'other',
                    refreshToken: 'r2',
                },
            ],
            set: setSpy,
        };
        const refreshSpy = sinon.spy(async () => baseToken);
        const revokeSpy = sinon.spy(async () => {});
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: revokeSpy,
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        expect(sessions).to.have.lengthOf(1);
        await sessions[0].endSession();
        expect(revokeSpy.calledOnce).to.be.true;
        expect(refreshSpy.calledOnce).to.be.true;
        expect(setSpy.calledOnce).to.be.true;
        expect(setSpy.firstCall.args[0]).to.deep.equal([
            { ...baseSession, userId: 'other', refreshToken: 'r2' },
        ]);
    });

    it('should refresh session on refreshSession', async () => {
        const setSpy = sinon.spy(async () => {});
        const fakeStorage = {
            get: async () => [{ ...baseSession }],
            set: setSpy,
        };
        const refreshSpy = sinon.spy(async () => baseToken);
        const revokeSpy = sinon.spy(async () => {});
        const createSpy = sinon.spy(async () => [
            baseSession,
            baseToken,
        ]);
        const config: TokenAuthSessionConfig = {
            storage: fakeStorage,
            flows: {
                refresh: refreshSpy,
                revoke: revokeSpy,
                create: createSpy,
            },
        };
        const sessions = await TokenAuthSession.getSessions(config, {
            userId: 'u',
            userEmail: 'e',
            scopes: ['s'],
        });
        expect(sessions).to.have.lengthOf(1);
        await sessions[0].refreshSession();
        expect(refreshSpy.callCount).to.equal(2); // initial + refresh
        expect(revokeSpy.called).to.be.false;
        expect(setSpy.called).to.be.false;
    });
});

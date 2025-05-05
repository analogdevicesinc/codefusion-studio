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

describe('api http cache', () => {
    let client: CfsApiClient;
    let nockScope: nock.Scope;

    afterEach(() => {
        nock.cleanAll();
    });

    beforeEach(() => {
        client = new CfsApiClient({
            baseUrl: API_URL,
        });
    });

    // checks that the http calls are not cached
    it('cache should be disabled by default (in interim release)', async () => {
        nockScope = nock(API_URL).get('/socs').times(2).reply(200, {
            message: 'test',
        });
        let { response } = await client.fetch.GET('/socs');
        expect(response).not.to.have.property('returnedFromCache');
        // if cache is enabled, the second call will not be made
        ({ response } = await client.fetch.GET('/socs'));
        expect(nockScope.isDone()).to.be.true;
    });
});

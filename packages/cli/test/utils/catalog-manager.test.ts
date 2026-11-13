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

import {Config} from '@oclif/core';
import {expect} from 'chai';
import {CatalogManager} from 'cfs-lib';
import Sinon from 'sinon';

import {apiClientDeps} from '../../src/utils/api-client.js';
import {getSocCatalog} from '../../src/utils/catalog-manager.js';

describe('getSocCatalog', () => {
  const originalDeps = {...apiClientDeps};
  let config: Config;

  before(async () => {
    config = await Config.load({root: process.cwd()});
  });

  beforeEach(() => {
    apiClientDeps.getAuthConfig = (() => ({
      ccmUrl: new URL('https://ccm.example.com')
    })) as never;
    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => undefined
    })) as never;
    apiClientDeps.createApiClient = (() => ({
      isAnonymous: true,
      rest: {socs: {}}
    })) as never;
  });

  afterEach(() => {
    Object.assign(apiClientDeps, originalDeps);
    Sinon.restore();
  });

  it('rejects a forced update when the catalog service was unreachable', async () => {
    Sinon.stub(CatalogManager.prototype, 'loadCatalog').resolves(
      false
    );

    let thrown: unknown;
    try {
      await getSocCatalog(config, true);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(Error);
    expect((thrown as Error).message).to.contain(
      'Unable to reach the catalog service'
    );
  });

  it('returns the catalog when a forced update refreshed it', async () => {
    Sinon.stub(CatalogManager.prototype, 'loadCatalog').resolves(
      true
    );

    const catalog = await getSocCatalog(config, true);

    expect(catalog).to.be.an('object');
  });

  it('keeps using the cached catalog when a non-forced load could not refresh', async () => {
    Sinon.stub(CatalogManager.prototype, 'loadCatalog').resolves(
      false
    );

    const catalog = await getSocCatalog(config, false);

    expect(catalog).to.be.an('object');
  });
});

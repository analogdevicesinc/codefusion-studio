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
import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import {CatalogManager, CfsDataModelManager} from 'cfs-lib';
import Sinon from 'sinon';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';

describe('soc list (legacy format)', () => {
  it('text, no verbose', async () => {
    const {stdout} = await runCommand(['socs:list', '--legacy'], {
      root: '..'
    });
    expect(stdout).to.contain('test_soc_b-tqfn');
    expect(stdout).not.to.contain('soc1234');
  });

  it('json, no verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--format',
        'json',
        '--search-path',
        './test/fixtures/socs',
        '--legacy'
      ],
      {root: '..'}
    );
    const data = assertSuccessEnvelopeData<{socs: string[]}>(
      stdout,
      'socs list'
    );
    expect(data.socs).to.be.an('array');
    expect(data.socs).to.include('test_soc_b-tqfn');
  });

  it('text, verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--verbose',
        '--search-path',
        './test/fixtures/socs',
        '--legacy'
      ],
      {root: '..'}
    );
    expect(stdout).to.contain('test_soc_b-tqfn');
    expect(stdout).to.contain('Version');
    expect(stdout).to.contain('Timestamp');
    expect(stdout).to.contain('Name');
    expect(stdout).to.contain('Description');
    expect(stdout).to.contain('Schema');
  });

  it('json, verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--format',
        'json',
        '--verbose',
        '--search-path',
        './test/fixtures/socs',
        '--legacy'
      ],
      {
        root: '..'
      }
    );
    const data = assertSuccessEnvelopeData<Record<string, unknown>>(
      stdout,
      'socs list'
    );
    expect(data).to.be.an('object');
    expect(Object.keys(data)).to.include('test_soc_b-tqfn');
  });
});

describe('soc list', () => {
  it('text, no verbose', async () => {
    const {stdout} = await runCommand(['socs:list'], {
      root: '..'
    });
    expect(stdout).to.contain('test_soc_b (tqfn, wlp)');
    expect(stdout).not.to.contain('soc1234');
  });

  it('json, no verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--format',
        'json',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    );
    const data = assertSuccessEnvelopeData(stdout, 'socs list');
    expect(data).to.deep.property('test_soc_a', ['wlp']);
    expect(data).to.deep.property('test_soc_b', ['tqfn', 'wlp']);
  });

  it('text, verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--verbose',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    );
    expect(stdout).to.contain('Name');
    expect(stdout).to.contain('Package');
    expect(stdout).to.contain('Version');
    expect(stdout).to.contain('Timestamp');
    expect(stdout).to.contain('Description');
    expect(stdout).to.contain('Schema');
    expect(stdout).to.contain('AI Compatible cores');
  });

  it('json, verbose', async () => {
    const {stdout} = await runCommand(
      [
        'socs:list',
        '--format',
        'json',
        '--verbose',
        '--search-path',
        './test/fixtures/socs'
      ],
      {
        root: '..'
      }
    );
    const {socs: parsedJson} = assertSuccessEnvelopeData<{
      socs: {Name: string; Package: string}[];
    }>(stdout, 'socs list');
    const reducedJson = parsedJson.map(
      (soc: {Name: string; Package: string}) => ({
        Name: soc.Name,
        Package: soc.Package
      })
    );
    expect(parsedJson).to.be.an('Array');
    expect(reducedJson).to.deep.include({
      Name: 'test_soc_a',
      Package: 'wlp'
    });
    expect(reducedJson).to.deep.include({
      Name: 'test_soc_b',
      Package: 'tqfn'
    });
    expect(reducedJson).to.deep.include({
      Name: 'test_soc_b',
      Package: 'wlp'
    });
  });
});

describe('soc list failures', () => {
  afterEach(() => {
    Sinon.restore();
    process.exitCode = 0;
  });

  it('warns in the JSON envelope when verbose output cannot read the catalog', async () => {
    Sinon.stub(CatalogManager.prototype, 'loadCatalog').rejects(
      new Error('catalog unavailable')
    );

    const {stdout} = await runCommand(
      [
        'socs:list',
        '--format',
        'json',
        '--verbose',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    );
    const parsed = assertValidEnvelope(stdout) as {
      ok: boolean;
      warnings: {message: string}[];
    };
    expect(parsed.ok).to.be.true;
    expect(parsed.warnings.map((w) => w.message)).to.include(
      'Error reading catalog data. Some information might be incorrect. '
    );
  });

  it('prints the catalog notice as text outside JSON mode', async () => {
    Sinon.stub(CatalogManager.prototype, 'loadCatalog').rejects(
      new Error('catalog unavailable')
    );

    const {stdout} = await runCommand(
      [
        'socs:list',
        '--verbose',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    );
    expect(stdout).to.contain('Error reading catalog data.');
  });

  it('reports a stable SOC_LIST_FAILED code in the JSON envelope', async () => {
    Sinon.stub(
      CfsDataModelManager.prototype,
      'listDataModels'
    ).rejects(new Error('listing failed'));

    const {stdout} = await runCommand(
      ['socs:list', '--format', 'json'],
      {root: '..'}
    );
    const parsed = assertValidEnvelope(stdout) as {
      ok: boolean;
      errors: {code: string; message: string}[];
    };
    expect(parsed.ok).to.be.false;
    expect(parsed.errors[0]?.code).to.equal('SOC_LIST_FAILED');
  });
});

/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {parseJson} from '../../utils/parse-json.js';

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
    expect(parseJson(stdout)).to.be.an('array');
    expect(parseJson(stdout)).to.include('test_soc_b-tqfn');
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
    expect(parseJson(stdout)).to.be.an('object');
    expect(Object.keys(parseJson(stdout))).to.include('test_soc_b-tqfn');
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
    const parsedJson = parseJson(stdout);
    expect(parsedJson).to.deep.property('test_soc_a', ['wlp']);
    expect(parsedJson).to.deep.property('test_soc_b', ['tqfn', 'wlp']);
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
    const parsedJson = parseJson(stdout);
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

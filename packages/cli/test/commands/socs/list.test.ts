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
import {expect, test} from '@oclif/test';

import {parseJson} from '../../utils/parse-json.js';

describe('soc list (legacy format)', () => {
  test
    .stdout()
    .command(['socs:list', '--legacy'], {
      root: '..'
    })
    .it('text, no verbose', (ctx) => {
      expect(ctx.stdout).to.contain('test_soc_b-tqfn');
      expect(ctx.stdout).not.to.contain('soc1234');
    });

  test
    .stdout()
    .command(
      [
        'socs:list',
        '--format',
        'json',
        '--search-path',
        './test/fixtures/socs',
        '--legacy'
      ],
      {root: '..'}
    )
    .it('json, no verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.be.an('array');
      expect(parseJson(ctx.stdout)).to.include('test_soc_b-tqfn');
    });

  test
    .stdout()
    .command(
      [
        'socs:list',
        '--verbose',
        '--search-path',
        './test/fixtures/socs',
        '--legacy'
      ],
      {root: '..'}
    )
    .it('text, verbose', (ctx) => {
      expect(ctx.stdout).to.contain('test_soc_b-tqfn');
      expect(ctx.stdout).to.contain('Version');
      expect(ctx.stdout).to.contain('Timestamp');
      expect(ctx.stdout).to.contain('Name');
      expect(ctx.stdout).to.contain('Description');
      expect(ctx.stdout).to.contain('Schema');
    });

  test
    .stdout()
    .command(
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
    )
    .it('json, verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.be.an('object');
      expect(Object.keys(parseJson(ctx.stdout))).to.include(
        'test_soc_b-tqfn'
      );
    });
});

describe('soc list', () => {
  test
    .stdout()
    .command(['socs:list'], {
      root: '..'
    })
    .it('text, no verbose', (ctx) => {
      expect(ctx.stdout).to.contain('test_soc_b (tqfn, wlp)');
      expect(ctx.stdout).not.to.contain('soc1234');
    });

  test
    .stdout()
    .command(
      [
        'socs:list',
        '--format',
        'json',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    )
    .it('json, no verbose', (ctx) => {
      const parsedJson = parseJson(ctx.stdout);
      expect(parsedJson).to.deep.property('test_soc_a', ['wlp']);
      expect(parsedJson).to.deep.property('test_soc_b', [
        'tqfn',
        'wlp'
      ]);
    });

  test
    .stdout()
    .command(
      [
        'socs:list',
        '--verbose',
        '--search-path',
        './test/fixtures/socs'
      ],
      {root: '..'}
    )
    .it('text, verbose', (ctx) => {
      expect(ctx.stdout).to.contain('Name');
      expect(ctx.stdout).to.contain('Package');
      expect(ctx.stdout).to.contain('Version');
      expect(ctx.stdout).to.contain('Timestamp');
      expect(ctx.stdout).to.contain('Description');
      expect(ctx.stdout).to.contain('Schema');
      expect(ctx.stdout).to.contain('AI Compatible cores');
    });

  test
    .stdout()
    .command(
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
    )
    .it('json, verbose', (ctx) => {
      const parsedJson = parseJson(ctx.stdout);
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

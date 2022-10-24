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

import { parseJson } from '../../utils/parse-json.js';

describe('soc list', () => {
  test
    .stdout()
    .command(['socs:list'], {root: '..',})
    .it('text, no verbose', (ctx) => {
      expect(ctx.stdout).to.contain('max32690-tqfn');
      expect(ctx.stdout).not.to.contain('soc1234');
    });

  test
    .stdout()
    .command(['socs:list', '--format', 'json'], {root: '..'})
    .it('json, no verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.be.an('array');
      expect(parseJson(ctx.stdout)).to.include('max32690-tqfn');
    });

  test
    .stdout()
    .command(['socs:list', '--verbose'], {root: '..'})
    .it('text, verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.equal(null);
      expect(ctx.stdout).to.contain('max32690-tqfn');
      expect(ctx.stdout).to.contain('Copyright');
      expect(ctx.stdout).to.contain('Version');
      expect(ctx.stdout).to.contain('Timestamp');
      expect(ctx.stdout).to.contain('Name');
      expect(ctx.stdout).to.contain('Description');
      expect(ctx.stdout).to.contain('Schema');
    });

    test
    .stdout()
    .command(['socs:list', '--format', 'json', '--verbose'], {root: '..'})
    .it('json, verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.be.an('object');
      expect(Object.keys(parseJson(ctx.stdout))).to.include("max32690-tqfn");
    });
});

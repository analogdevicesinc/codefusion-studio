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

describe('engines list', () => {
  test
    .stdout()
    .command(['engines:list'], {root: '..'})
    .it('text, not verbose', (ctx) => {
      expect(ctx.stdout).to.contain('msdk');
      expect(ctx.stdout).to.not.contain('Version');
      expect(parseJson(ctx.stdout)).to.equal(null);
    });

  test
    .stdout()
    .command(['engines:list', '--verbose'], {root: '..'})
    .it('text, verbose', (ctx) => {
      expect(ctx.stdout).to.contain('MSDK');
      expect(ctx.stdout).to.contain('Version');
      expect(parseJson(ctx.stdout)).to.equal(null);
    });

  test
    .stdout()
    .command(['engines:list', '--format', 'json'], {root: '..'})
    .it('json, not verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.include('msdk');
    });

  test
    .stdout()
    .command(['engines:list', '--format', 'json', '--verbose'], {
      root: '..'
    })
    .it('json, verbose', (ctx) => {
      expect(parseJson(ctx.stdout)).to.deep.include({
        name: 'msdk',
        label: 'MSDK',
        description: 'MSDK code generation engine.',
        version: '1.0.0',
        socs: ['MAX32690', 'MAX78002'],
        features: ['Pin Config', 'ClockConfig']
      });
    });
});

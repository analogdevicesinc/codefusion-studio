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
import {expect, test} from '@oclif/test'

import { parseJson } from '../../utils/parse-json.js';

describe('engines info', () => {
  test
    .stdout()
    .command(['engines:info', 'msdk'], {root: '..'})
    .it('text', (ctx) => {
      expect(ctx.stdout).to.contain('msdk');
      expect(ctx.stdout).to.contain('Version');
      expect(parseJson(ctx.stdout)).to.equal(null);
    });

  test
    .stdout()
    .command(['engines:info', 'msdk', '--format', 'json'], {
      root: '..'
    })
    .it('json', (ctx) => {
      expect(parseJson(ctx.stdout)).to.deep.include({
        name: 'msdk',
        label: 'MSDK',
        description: 'MSDK code generation engine.',
        version: '1.0.0',
        socs: ['MAX32690', 'MAX78002'],
        features: ['Pin Config', 'ClockConfig']
      });
    });

  test
    .stderr()
    .command(['engines:info'], {root: '..'})
    .catch((error) => {
      expect(error.message).to.contain('Missing 1 required arg:');
      expect(error.message).to.contain('See more help with --help');
    })
    .it('requires name argument');

  test
    .stderr()
    .command(['engines:info', 'randomName'], {root: '..'})
    .catch((error) => {
      expect(error.message).to.contain(
        'Please provide a valid engine name'
      );
    })
    .it('requires a valid engine name as argument');
})

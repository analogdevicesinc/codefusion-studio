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
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseJson} from '../../utils/parse-json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('elf analyze', () => {
  const elfPath = path.resolve(
    __dirname,
    '../../../../elf-parser/test/data/input.elf'
  );

  test
    .stdout()
    .command(['elf:analyze', elfPath, '-j'], {root: '..'})
    .it('produces valid JSON output', (ctx) => {
      // Verify the output is valid JSON
      const output = parseJson(ctx.stdout);
      expect(output).to.be.an('object');

      // Verify no trailing commas in JSON
      const jsonString = ctx.stdout;
      expect(jsonString).to.not.match(/,\s*}/); // No trailing comma before closing brace
      expect(jsonString).to.not.match(/,\s*]/); // No trailing comma before closing bracket
    });
});

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
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('generate', () => {
  const inputFilePath = path.resolve(
    __dirname,
    'utils',
    'preconfigured-max32690-wlp.cfsconfig'
  );

  const outputDirectoryPath = path.resolve(__dirname, 'output');

  const pluginsPath = path.resolve(__dirname, 'utils/plugins');

  afterEach(async () => {
    fs.rmSync(outputDirectoryPath, {recursive: true, force: true});
  });

  test
    .stdout()
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '-s',
        `${pluginsPath}`
      ],
      {root: '..'}
    )
    .it(
      'creates code generation files using a single plugins path',
      (ctx) => {
        expect(ctx.stderr.trim(), 'stderr should be empty').to.equal(
          ''
        );
        expect(ctx.stdout.trim(), 'stdout should be empty').to.equal(
          ''
        );

        const directoryExists =
          fs.existsSync(outputDirectoryPath) &&
          fs.lstatSync(outputDirectoryPath).isDirectory();
        expect(directoryExists).to.be.true;

        const expectedFiles = ['memory.ld', 'soc_init.c'];
        expectedFiles.forEach((file) => {
          const filePath = path.join(outputDirectoryPath, file);
          const fileExists = fs.existsSync(filePath);
          expect(fileExists).to.be.true;
        });
      }
    );

  test
    .stdout()
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '-s',
        `${pluginsPath}`,
        '--search-path',
        `${pluginsPath}`,
        '-s',
        'testPath'
      ],
      {root: '..'}
    )
    .it(
      'accepts multiple plugin directories for code generation',
      (ctx) => {
        expect(ctx.stderr.trim(), 'stderr should be empty').to.equal(
          ''
        );
        const directoryExists =
          fs.existsSync(outputDirectoryPath) &&
          fs.lstatSync(outputDirectoryPath).isDirectory();
        expect(directoryExists).to.be.true;
      }
    );

  test
    .stderr()
    .command(['generate', '--output', `${outputDirectoryPath}`], {
      root: '..'
    })
    .catch((error) => {
      expect(error.message).to.contain('Missing required flag input');
    })
    .it('requires input flag to be provided');

  test
    .stdout()
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '-s',
        `${pluginsPath}`,
        '--verbose'
      ],
      {root: '..'}
    )
    .it(
      'generates code and outputs absolute path of generated files',
      (ctx) => {
        expect(ctx.stderr.trim(), 'stderr should be empty').to.equal(
          ''
        );

        const outputPaths = ctx.stdout.trim().split('\n');

        expect(outputPaths.length).to.greaterThan(0);

        for (const outputPath of outputPaths) {
          expect(fs.existsSync(outputPath)).to.be.true;
          expect(path.isAbsolute(outputPath)).to.be.true;
        }
      }
    );
});

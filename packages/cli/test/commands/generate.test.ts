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
    'test.cfsconfig'
  );
  const outputDirectoryPath = path.resolve(__dirname, 'output');

  after(async () => {
    fs.rmSync(outputDirectoryPath, {recursive: true, force: true});
  });

  test
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .catch((error) => {
      expect(error.message).to.contain(
        'The output directory does not exist. Use the --force flag to create it automatically.'
      );
    })
    .it(
      'requires force flag to create the output directory automatically'
    );

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '--force'
      ],
      {root: '..'}
    )
    .it(
      'default engine, specified input, default output',
      async () => {
        // Use fs.promises to check if the directory exists and contains files
        let directoryExists = false;
        try {
          await fs.promises.access(outputDirectoryPath);
          directoryExists = true;
        } catch {
          directoryExists = false;
        }

        expect(directoryExists).to.be.true;

        // Use fs.promises to read the contents of the directory
        const files = await fs.promises.readdir(outputDirectoryPath);
        expect(files).to.not.be.empty;

        expect(files).to.include.members(['MAX32690_soc_init.c']);
      }
    );

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--verbose',
        '--output',
        `${outputDirectoryPath}`,
        '--force'
      ],
      {root: '..'}
    )
    .it('verbose output paths', (ctx) => {
      expect(ctx.stdout).to.contain('Writing output to');
    });

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--preview',
        '--file',
        'MAX32690_soc_init.c',
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .it('preview .c file in text format', (ctx) => {
      expect(ctx.stdout).to.not.contain('File:');
      expect(ctx.stdout).to.not.contain('Content:');
      expect(ctx.stdout).to.not.contain('MAX32690_soc_init.c');
    });

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--preview',
        '--file',
        'MAX32690_soc_init.c',
        '--format',
        'json',
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .it('preview .c file in json format', (ctx) => {
      const previewOutput = JSON.parse(ctx.stdout);
      expect(previewOutput).to.be.an('object');
    });

  test
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--file',
        'MAX32690_soc_init.bla',
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .catch((error) => {
      expect(error.message).to.contain(
        'No file named "MAX32690_soc_init.bla" found.'
      );
    })
    .it('requires a valid file name');

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--preview',
        '--format',
        'text',
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .it('preview in text format', (ctx) => {
      expect(ctx.stdout).to.contain('File:');
      expect(ctx.stdout).to.contain('Content:');
    });

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--preview',
        '--format',
        'json',
        '--output',
        `${outputDirectoryPath}`
      ],
      {root: '..'}
    )
    .it('preview in json format', (ctx) => {
      const previewOutput = JSON.parse(ctx.stdout);
      expect(previewOutput).to.be.an('object');
    });

  test
    .stderr()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--verbose',
        '--output',
        `${outputDirectoryPath}`
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain(
        'The file(s) "MAX32690_soc_init.c" already exist. Use the --force flag to overwrite.'
      );
    })
    .it('requires force flag to overwrite existing files');

  test
    .stdout()
    .command(['generate', '--input', inputFilePath, '--list'], {
      root: '..'
    })
    .it(
      'list the file names that are going to be generated',
      (ctx) => {
        expect(ctx.stdout).to.contain('.c');
      }
    );

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--list',
        '--format',
        'json'
      ],
      {root: '..'}
    )
    .it(
      'list the file names that are going to be generated in json format',
      (ctx) => {
        const listGeneratedFilenames = JSON.parse(ctx.stdout);
        expect(listGeneratedFilenames).to.be.an('object');
      }
    );

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        inputFilePath,
        '--list',
        '--format',
        'json'
      ],
      {root: '..'}
    )
    .it(
      'list the file names that are going to be generated in json format',
      (ctx) => {
        const listGeneratedFilenames = JSON.parse(ctx.stdout);
        expect(listGeneratedFilenames).to.be.an('object');
      }
    );

  test
    .stdout()
    .command(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '--force',
        '--file',
        'MAX32690_soc_init.c'
      ],
      {root: '..'}
    )
    .it('generate one file', async () => {
      const file = await fs.promises.readdir(outputDirectoryPath);
      expect(file).to.not.be.empty;

      expect(file).to.include.members(['MAX32690_soc_init.c']);
    });
});

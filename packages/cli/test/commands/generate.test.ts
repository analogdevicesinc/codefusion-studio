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
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CFS_DATA_MODELS_PATH,
  CFS_PROJECT_PLUGINS_PATH
} from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('generate', () => {
  const inputFilePath = path.resolve(
    __dirname,
    'utils',
    'preconfigured-max32690-wlp.cfsconfig'
  );

  const outputDirectoryPath = path.resolve(__dirname, 'output');

  const pluginsPath = CFS_PROJECT_PLUGINS_PATH;
  const dataModelsPath = CFS_DATA_MODELS_PATH;

  let authEnvBackup: Record<string, string | undefined>;

  beforeEach(() => {
    authEnvBackup = {
      CFS_AUTH_CALLBACK: process.env.CFS_AUTH_CALLBACK,
      CFS_AUTH_URL: process.env.CFS_AUTH_URL,
      CFS_API_URL: process.env.CFS_API_URL,
      CFS_AUTH_CLIENT_ID: process.env.CFS_AUTH_CLIENT_ID,
      CFS_SESSION_FILE: process.env.CFS_SESSION_FILE
    };

    process.env.CFS_AUTH_CALLBACK = 'http://localhost:3000/callback';
    process.env.CFS_AUTH_URL = 'https://example.com/auth';
    process.env.CFS_API_URL = 'https://example.com/api';
    process.env.CFS_AUTH_CLIENT_ID = 'test-client-id';
    process.env.CFS_SESSION_FILE = '/tmp/test-session';
  });

  afterEach(async () => {
    for (const [key, value] of Object.entries(authEnvBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    fs.rmSync(outputDirectoryPath, {recursive: true, force: true});
  });

  it('creates code generation files using a single plugins path', async () => {
    const {stdout, stderr} = await runCommand(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '-s',
        `${pluginsPath}`,
        '-s',
        `${dataModelsPath}`
      ],
      {root: '..'}
    );

    expect(stderr.trim(), 'stderr should be empty').to.equal('');
    expect(stdout.trim(), 'stdout should be empty').to.equal('');

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
  });

  it('accepts multiple plugin directories for code generation', async () => {
    const {stderr} = await runCommand(
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
        `${dataModelsPath}`
      ],
      {root: '..'}
    );

    expect(stderr.trim(), 'stderr should be empty').to.equal('');
    const directoryExists =
      fs.existsSync(outputDirectoryPath) &&
      fs.lstatSync(outputDirectoryPath).isDirectory();
    expect(directoryExists).to.be.true;
  });

  it('requires input flag to be provided', async () => {
    const {error} = await runCommand(
      ['generate', '--output', `${outputDirectoryPath}`],
      {
        root: '..'
      }
    );
    expect(error?.message).to.contain('Missing required flag input');
  });

  it('generates code and outputs absolute path of generated files', async () => {
    const {stdout, stderr} = await runCommand(
      [
        'generate',
        '--input',
        `${inputFilePath}`,
        '--output',
        `${outputDirectoryPath}`,
        '-s',
        `${pluginsPath}`,
        '-s',
        `${dataModelsPath}`,
        '--verbose'
      ],
      {root: '..'}
    );

    expect(stderr.trim(), 'stderr should be empty').to.equal('');

    const outputPaths = stdout.trim().split('\n');

    expect(outputPaths.length).to.greaterThan(0);

    for (const outputPath of outputPaths) {
      expect(fs.existsSync(outputPath)).to.be.true;
      expect(path.isAbsolute(outputPath)).to.be.true;
    }
  });
});

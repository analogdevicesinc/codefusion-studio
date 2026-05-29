/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {CliTaskProvider} from '../../src/providers/cli-task-provider.js';
import type {CliConfig} from '../../src/types/cli-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.resolve(
  __dirname,
  '..',
  'fixtures',
  'tasks-workspace'
);

/**
 * Feature: CLI tool search path composition
 *   As a CLI user
 *   I want toolSearchPaths in config.json to extend built-in search locations
 *   So that custom tool directories can be added without dropping defaults
 */
describe('CliTaskProvider tool search paths', () => {
  const originalInstallDir = process.env.CFS_INSTALL_DIR;

  beforeEach(() => {
    process.env.CFS_INSTALL_DIR = '/mock/cfs-install';
  });

  afterEach(() => {
    if (originalInstallDir === undefined) {
      delete process.env.CFS_INSTALL_DIR;
      return;
    }

    process.env.CFS_INSTALL_DIR = originalInstallDir;
  });

  function resolveToolSearchPaths(
    config?: CliConfig,
    sdkPath = '/sdk'
  ): string[] {
    const provider = new CliTaskProvider(
      workspacePath,
      undefined,
      config
    );

    const resolver = Reflect.get(
      provider as unknown as Record<string, unknown>,
      'resolveToolSearchPaths'
    ) as undefined | ((pathArg: string) => string[]);

    if (typeof resolver !== 'function') {
      throw new Error('Unable to access resolveToolSearchPaths');
    }

    return resolver.call(provider, sdkPath);
  }

  it('extends configured/default search directories with user toolSearchPaths', async () => {
    const customDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-cli-tools-')
    );

    try {
      const resolved = resolveToolSearchPaths({
        toolSearchPaths: [customDir]
      });

      expect(resolved).to.include('/sdk/Utils');
      expect(resolved).to.include('/sdk/Tools');
      expect(resolved).to.include('/sdk/SDK');
      expect(resolved).to.include(customDir);
    } finally {
      await fs.rm(customDir, {recursive: true, force: true});
    }
  });

  it('ignores nonexistent user toolSearchPaths and keeps configured/default paths', () => {
    const missingDir = path.join(
      os.tmpdir(),
      'cfs-cli-tools-missing-does-not-exist'
    );
    const warnings: string[] = [];
    const originalWarn = console.warn;

    console.warn = (message?: unknown, ...args: unknown[]) => {
      const first = String(message ?? '');
      const rest = args.map((a) => String(a)).join(' ');
      warnings.push(`${first}${rest ? ` ${rest}` : ''}`);
    };

    try {
      const resolved = resolveToolSearchPaths({
        toolSearchPaths: [missingDir]
      });

      expect(resolved).to.include('/sdk/Utils');
      expect(resolved).to.include('/sdk/Tools');
      expect(resolved).to.include('/sdk/SDK');
      expect(resolved).not.to.include(missingDir);
      expect(
        warnings.some((w) => w.includes('Tool search path'))
      ).to.equal(true);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('de-duplicates overlapping configured and user-provided tool paths', async () => {
    const userDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-cli-tools-overlap-')
    );

    try {
      const resolved = resolveToolSearchPaths({
        toolSearchPaths: ['/sdk/Tools', userDir]
      });

      expect(
        resolved.filter((entry) => entry === '/sdk/Tools').length
      ).to.equal(1);
      expect(resolved).to.include(userDir);
    } finally {
      await fs.rm(userDir, {recursive: true, force: true});
    }
  });
});

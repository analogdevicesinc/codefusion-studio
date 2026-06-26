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

/**
 * Feature: cfs.environment extraction and variable resolution
 *   As a CLI user
 *   I want env vars from cfs.environment to be resolved and injected
 *   So that tasks can access toolchain paths and config values
 */
describe('CliTaskProvider getCfsEnvironmentVariables', () => {
  const originalInstallDir = process.env.CFS_INSTALL_DIR;
  const projectWithEnvPath = path.resolve(
    workspacePath,
    'project-with-env'
  );

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

  it('returns empty object when cfs.environment is not defined', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(
      path.resolve(workspacePath, 'project1')
    );

    const envVars = await provider.getCfsEnvironmentVariables();

    expect(envVars).to.deep.equal({});
  });

  it('extracts literal env var values from cfs.environment', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(projectWithEnvPath);

    const envVars = await provider.getCfsEnvironmentVariables();

    expect(envVars).to.have.property(
      'MOCK_TOOLCHAIN_VERSION',
      'mock-toolchain-v1'
    );
    expect(envVars).to.have.property(
      'MOCK_TOOLCHAIN_PATH',
      '/opt/toolchains/mock-toolchain'
    );
  });

  it('resolves ${config:...} references in env var values', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(projectWithEnvPath);

    const envVars = await provider.getCfsEnvironmentVariables();

    // ${config:cfs.mock.target} should resolve to "mock-core-a"
    expect(envVars).to.have.property(
      'MOCK_TARGET',
      'mock-core-a'
    );
  });

  it('resolves ${workspaceFolder} in env var values', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(projectWithEnvPath);

    const envVars = await provider.getCfsEnvironmentVariables();

    // ${workspaceFolder} should resolve to the workspace path
    expect(envVars)
      .to.have.property('WORKSPACE_REF')
      .that.includes('/build');
    expect(envVars.WORKSPACE_REF).to.not.include(
      '${workspaceFolder}'
    );
  });

  it('resolves ${env:...} references in env var values', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(projectWithEnvPath);

    const envVars = await provider.getCfsEnvironmentVariables();

    // ${env:HOME} should resolve to process.env.HOME
    const expectedHome = process.env.HOME ?? '';
    expect(envVars).to.have.property('HOME_REF', expectedHome);
  });

  it('returns empty object when cfs.environment is not an object', async () => {
    const provider = new CliTaskProvider(workspacePath, undefined, {
      'cfs.environment': 'not-an-object'
    } as unknown as CliConfig);

    const envVars = await provider.getCfsEnvironmentVariables();

    expect(envVars).to.deep.equal({});
  });

  it('skips non-string values within cfs.environment', async () => {
    const provider = new CliTaskProvider(workspacePath, undefined, {
      'cfs.environment': {
        VALID: 'value',
        INVALID_NUMBER: 42,
        INVALID_NULL: null
      }
    } as unknown as CliConfig);

    const envVars = await provider.getCfsEnvironmentVariables();

    expect(envVars).to.have.property('VALID', 'value');
    expect(envVars).to.not.have.property('INVALID_NUMBER');
    expect(envVars).to.not.have.property('INVALID_NULL');
  });

  it('resolves ${command:...} references in env var values via toolManager', async () => {
    const provider = new CliTaskProvider(workspacePath);
    const configResolver = provider.getConfigResolver();
    configResolver.addProjectSettings(projectWithEnvPath);

    // Stub getToolPath on the private toolManager instance
    const toolManager = Reflect.get(
      provider as unknown as Record<string, unknown>,
      'toolManager'
    ) as {getToolPath: (id: string) => Promise<string>};
    const originalGetToolPath =
      toolManager.getToolPath.bind(toolManager);
    toolManager.getToolPath = async (id: string) => {
      if (id === 'mock-toolchain-id') {
        return '/opt/toolchains/mock-toolchain-base';
      }

      return originalGetToolPath(id);
    };

    try {
      const envVars = await provider.getCfsEnvironmentVariables();

      // ${command:cfs.getToolchainPath} should resolve to the stubbed path
      expect(envVars).to.have.property(
        'MOCK_TOOLCHAIN_BASE',
        '/opt/toolchains/mock-toolchain-base'
      );
    } finally {
      toolManager.getToolPath = originalGetToolPath;
    }
  });
});

/**
 * Feature: cfs.getToolchainPath command resolution
 *   As a CLI user
 *   I want cfs.getToolchainPath to respect an explicit toolchain path override
 *   So that projects with a custom path behave consistently with the IDE extension
 */
describe('CliTaskProvider cfs.getToolchainPath command resolution', () => {
  beforeEach(() => {
    process.env.CFS_INSTALL_DIR = '/mock/cfs-install';
  });

  afterEach(() => {
    delete process.env.CFS_INSTALL_DIR;
  });

  /** Resolve the cfs.getToolchainPath command with injected settings and an optional tool-path stub. */
  async function resolveGetToolchainPath(
    settings: Record<string, string>,
    toolPathStub?: (id: string) => Promise<string>
  ): Promise<string | undefined> {
    const provider = new CliTaskProvider(workspacePath);
    const r = (key: string): unknown =>
      Reflect.get(
        provider as unknown as Record<string, unknown>,
        key
      );

    Object.assign(
      Reflect.get(r('configResolver') as object, 'merged'),
      settings
    );

    if (toolPathStub) {
      (
        r('toolManager') as {getToolPath: typeof toolPathStub}
      ).getToolPath = toolPathStub;
    }

    return (
      r('createCommandProvider') as () => (
        cmd: string
      ) => Promise<string | undefined>
    ).call(provider)('cfs.getToolchainPath');
  }

  it('returns cfs.project.toolchain.path directly when set', async () => {
    const result = await resolveGetToolchainPath({
      'cfs.project.toolchain.path': '/custom/toolchain'
    });

    expect(result).to.equal('/custom/toolchain');
  });

  it('does not call the tool manager when cfs.project.toolchain.path is set', async () => {
    let called = false;
    await resolveGetToolchainPath(
      {'cfs.project.toolchain.path': '/custom/toolchain'},
      async () => {
        called = true;
        return '';
      }
    );

    expect(called).to.equal(false);
  });

  it('falls back to tool manager when only cfs.project.toolchain.id is set', async () => {
    const result = await resolveGetToolchainPath(
      {'cfs.project.toolchain.id': 'arm-none-eabi-gcc'},
      async () => '/resolved/via/id'
    );

    expect(result).to.equal('/resolved/via/id');
  });

  it('passes the configured toolchain id to the tool manager', async () => {
    let capturedId: string | undefined;
    await resolveGetToolchainPath(
      {'cfs.project.toolchain.id': 'riscv-none-elf-gcc'},
      async (id) => {
        capturedId = id;
        return '';
      }
    );

    expect(capturedId).to.equal('riscv-none-elf-gcc');
  });

  it('returns undefined when neither setting is configured', async () => {
    const result = await resolveGetToolchainPath({});

    expect(result).to.be.undefined;
  });
});

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

import type {
  CfsInstallPlan,
  CfsPackageManagerProvider,
  CfsPackageReference
} from 'cfs-package-manager';

import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Imported from `dist` rather than `src` because oclif always executes the
// compiled command under this repo's TypeScript 7 + tsx setup, so a `src`
// import would mutate a module instance the command never actually uses.
import {validateDependenciesDeps} from '../../../dist/commands/validate/dependencies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// `runCommand`'s `root` option is resolved relative to the process's current
// directory at call time, so an absolute path derived from this test file's
// own location is used instead of the conventional relative `'..'`, since
// several tests below intentionally change the working directory.
const cliRoot = path.resolve(__dirname, '..', '..', '..');

/**
 * Test suite for the validate dependencies command. Checks:
 * - Canonical `validate:dependencies` command id and `validate:deps` alias
 * - Explicit relative/absolute manifest paths and automatic discovery
 * - Distinct errors for "no workspace" and "workspace without a manifest"
 * - Text and JSON output for satisfied and unmet requirements
 * - Manifest and package-manager failures surface as command errors
 */
describe('validate dependencies', () => {
  let workspaceDir: string;
  let originalCwd: string;
  let originalGetPackageManager: typeof validateDependenciesDeps.getPackageManager;

  const installedPackage: CfsPackageReference = {
    name: 'test_pkg',
    version: '1.0.0'
  };

  beforeEach(() => {
    // Commands signal failure in JSON mode by setting `process.exitCode`
    // (a global the oclif test harness does not manage), so reset it around
    // every test to keep the failure status isolated per test.
    process.exitCode = 0;
    originalCwd = process.cwd();
    originalGetPackageManager =
      validateDependenciesDeps.getPackageManager;
    workspaceDir = mkdtempSync(
      path.join(tmpdir(), 'cfs-validate-dependencies-')
    );
  });

  afterEach(() => {
    process.exitCode = 0;
    process.chdir(originalCwd);
    validateDependenciesDeps.getPackageManager =
      originalGetPackageManager;
    rmSync(workspaceDir, {recursive: true, force: true});
  });

  function writeWorkspaceMarker(): void {
    mkdirSync(path.join(workspaceDir, '.cfs'), {recursive: true});
    writeFileSync(
      path.join(workspaceDir, '.cfs', '.cfsworkspace'),
      '{}'
    );
  }

  function writeManifest(
    packages: CfsPackageReference[],
    manifestDir: string = path.join(workspaceDir, '.cfs')
  ): string {
    mkdirSync(manifestDir, {recursive: true});
    const manifestPath = path.join(manifestDir, '.cfsdependencies');
    writeFileSync(
      manifestPath,
      JSON.stringify({version: 1, packages})
    );
    return manifestPath;
  }

  function mockPackageManager(
    installPlan: CfsInstallPlan,
    installedPackages: CfsPackageReference[] = []
  ): void {
    const packageManager = {
      getInstallPlan: async () => installPlan,
      list: async () => installedPackages
    } as unknown as CfsPackageManagerProvider;

    validateDependenciesDeps.getPackageManager = async () =>
      packageManager as never;
  }

  function mockPackageManagerFailure(error: Error): void {
    validateDependenciesDeps.getPackageManager = async () => {
      throw error;
    };
  }

  it('resolves the canonical validate:dependencies command id', async () => {
    const manifestPath = writeManifest([]);
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [],
      requiresLicenseAcceptance: []
    });

    const {error, stdout} = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('No packages are declared');
  });

  it('resolves the validate:deps alias identically to the canonical command', async () => {
    const manifestPath = writeManifest([installedPackage]);
    const installPlan: CfsInstallPlan = {
      toInstall: [],
      alreadyInstalled: [installedPackage],
      requiresLicenseAcceptance: []
    };

    mockPackageManager(installPlan);
    const canonical = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    mockPackageManager(installPlan);
    const alias = await runCommand(
      ['validate:deps', '--input', manifestPath],
      {
        root: cliRoot
      }
    );

    expect(alias.error).to.be.undefined;
    expect(alias.stdout).to.equal(canonical.stdout);
  });

  it('accepts an explicit relative manifest path via --input', async () => {
    writeManifest([]);
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [],
      requiresLicenseAcceptance: []
    });
    process.chdir(workspaceDir);

    const {error, stdout} = await runCommand(
      [
        'validate:dependencies',
        '--input',
        path.join('.cfs', '.cfsdependencies')
      ],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('No packages are declared');
  });

  it('discovers the manifest from an explicit --workspace path without changing cwd', async () => {
    writeWorkspaceMarker();
    writeManifest([installedPackage]);
    mockPackageManager(
      {
        toInstall: [],
        alreadyInstalled: [installedPackage],
        requiresLicenseAcceptance: []
      },
      [installedPackage]
    );

    const {error, stdout} = await runCommand(
      ['validate:dependencies', '--workspace', workspaceDir],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('are installed');
  });

  it('rejects using --workspace and --input together', async () => {
    const manifestPath = writeManifest([]);

    const {error} = await runCommand(
      [
        'validate:dependencies',
        '--workspace',
        workspaceDir,
        '--input',
        manifestPath
      ],
      {root: cliRoot}
    );

    expect(error?.message).to.contain('cannot also be provided');
  });

  it('discovers the manifest automatically from the workspace root', async () => {
    writeWorkspaceMarker();
    writeManifest([installedPackage]);
    mockPackageManager(
      {
        toInstall: [],
        alreadyInstalled: [installedPackage],
        requiresLicenseAcceptance: []
      },
      [installedPackage]
    );
    process.chdir(workspaceDir);

    const {error, stdout} = await runCommand(
      ['validate:dependencies'],
      {
        root: cliRoot
      }
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('are installed');
  });

  it('discovers the manifest automatically from a nested project directory', async () => {
    writeWorkspaceMarker();
    writeManifest([installedPackage]);
    mockPackageManager(
      {
        toInstall: [],
        alreadyInstalled: [installedPackage],
        requiresLicenseAcceptance: []
      },
      [installedPackage]
    );

    const projectDir = path.join(workspaceDir, 'project', 'source');
    mkdirSync(projectDir, {recursive: true});
    process.chdir(projectDir);

    const {error, stdout} = await runCommand(
      ['validate:dependencies'],
      {
        root: cliRoot
      }
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('are installed');
  });

  it('validates project manifests alongside the shared manifest', async () => {
    const missingPackage = {name: 'missing_pkg', version: '1.0.0'};
    writeWorkspaceMarker();
    writeManifest([installedPackage]);
    writeManifest(
      [missingPackage],
      path.join(workspaceDir, 'project', '.cfs')
    );
    mockPackageManager({
      toInstall: [missingPackage],
      alreadyInstalled: [installedPackage],
      requiresLicenseAcceptance: []
    });

    const {result} = await runCommand(
      [
        'validate:dependencies',
        '-w',
        workspaceDir,
        '--format',
        'json'
      ],
      {root: cliRoot}
    );

    expect(
      (result as Array<{valid: boolean}>).map(({valid}) => valid)
    ).to.deep.equal([true, false]);
    expect(process.exitCode).to.equal(1);
  });

  it('validates project manifests when the workspace has no shared manifest', async () => {
    writeWorkspaceMarker();
    const manifestPaths = ['m4', 'riscv'].map((project) =>
      writeManifest(
        [installedPackage],
        path.join(workspaceDir, project, '.cfs')
      )
    );
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [installedPackage],
      requiresLicenseAcceptance: []
    });

    const {error, result} = await runCommand(
      [
        'validate:dependencies',
        '-w',
        workspaceDir,
        '--format',
        'json'
      ],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(
      (result as Array<{manifestPath: string}>).map(
        ({manifestPath}) => manifestPath
      )
    ).to.deep.equal(manifestPaths);
    expect(process.exitCode).to.equal(0);
  });

  it('reports a distinct error when no CFS workspace is found', async () => {
    process.chdir(workspaceDir);

    const {error} = await runCommand(['validate:dependencies'], {
      root: cliRoot
    });

    expect(error?.message).to.contain('No CFS workspace was found');
  });

  it('reports a distinct error when the workspace has no dependency manifest', async () => {
    writeWorkspaceMarker();
    process.chdir(workspaceDir);

    const {error} = await runCommand(['validate:dependencies'], {
      root: cliRoot
    });

    expect(error?.message).to.contain('does not declare');
  });

  it('reports a command error when the auto-discovered manifest is a directory', async () => {
    writeWorkspaceMarker();
    mkdirSync(path.join(workspaceDir, '.cfs', '.cfsdependencies'), {
      recursive: true
    });
    process.chdir(workspaceDir);

    const {error} = await runCommand(['validate:dependencies'], {
      root: cliRoot
    });

    expect(error?.message).to.contain('is not a file');
  });

  it('reports a command error when an explicit manifest path does not exist', async () => {
    const missingManifestPath = path.join(
      workspaceDir,
      'does-not-exist.cfsdependencies'
    );

    const {error} = await runCommand(
      ['validate:dependencies', '--input', missingManifestPath],
      {root: cliRoot}
    );

    expect(error?.message).to.contain('was not found');
  });

  it('reports a command error when an explicit manifest path is a directory', async () => {
    const {error} = await runCommand(
      ['validate:dependencies', '--input', workspaceDir],
      {root: cliRoot}
    );

    expect(error?.message).to.contain('is not a file');
  });

  it('reports all requirements installed in text mode with exit 0', async () => {
    const manifestPath = writeManifest([installedPackage]);
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [installedPackage],
      requiresLicenseAcceptance: []
    });

    const {error, stdout} = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(process.exitCode).to.equal(0);
    expect(stdout).to.contain('All packages declared');
    expect(stdout).to.contain(
      `${installedPackage.name}/${installedPackage.version}: installed`
    );
  });

  it('reports missing, mismatched, and unsupported requirements in text mode with exit 1', async () => {
    const missingPackage: CfsPackageReference = {
      name: 'missing_pkg',
      version: '1.0.0'
    };
    const mismatchPackage: CfsPackageReference = {
      name: 'mismatch_pkg',
      version: '^2.0.0'
    };
    const unsupportedPackage: CfsPackageReference = {
      name: 'unsupported_pkg',
      version: '1.0.0'
    };
    const manifestPath = writeManifest([
      missingPackage,
      mismatchPackage,
      unsupportedPackage
    ]);

    mockPackageManager(
      {
        toInstall: [missingPackage, mismatchPackage],
        alreadyInstalled: [],
        requiresLicenseAcceptance: [],
        skipped: [
          {
            reference: unsupportedPackage,
            reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
          }
        ]
      },
      [{name: mismatchPackage.name, version: '1.0.0'}]
    );

    const {error, stdout} = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect(process.exitCode).to.equal(1);
    expect(stdout).to.contain('Unmet package dependencies');
    expect(stdout).to.contain(
      `${missingPackage.name}/${missingPackage.version}: missing`
    );
    expect(stdout).to.contain(
      `${mismatchPackage.name}/${mismatchPackage.version}: installed version '1.0.0' does not satisfy the requirement`
    );
    expect(stdout).to.contain(
      `${unsupportedPackage.name}/${unsupportedPackage.version}: unsupported`
    );
  });

  it('returns a valid result as JSON with exit 0', async () => {
    const manifestPath = writeManifest([installedPackage]);
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [installedPackage],
      requiresLicenseAcceptance: []
    });

    const {error, result, stdout} = await runCommand(
      [
        'validate:dependencies',
        '--input',
        manifestPath,
        '--format',
        'json'
      ],
      {root: cliRoot}
    );

    expect(error, 'JSON mode should not throw').to.be.undefined;
    expect(process.exitCode).to.equal(0);

    const parsed = JSON.parse(stdout);
    expect(parsed[0].valid).to.be.true;
    expect((result as Array<{valid: boolean}>)[0].valid).to.be.true;
  });

  it('returns an invalid result as JSON without an oclif error and sets exit 1', async () => {
    const missingPackage: CfsPackageReference = {
      name: 'missing_pkg',
      version: '1.0.0'
    };
    const manifestPath = writeManifest([missingPackage]);
    mockPackageManager({
      toInstall: [missingPackage],
      alreadyInstalled: [],
      requiresLicenseAcceptance: []
    });

    const {error, result, stdout} = await runCommand(
      [
        'validate:dependencies',
        '--input',
        manifestPath,
        '--format',
        'json'
      ],
      {root: cliRoot}
    );

    expect(error, 'JSON mode should not throw').to.be.undefined;
    expect(process.exitCode).to.equal(1);

    const parsed = JSON.parse(stdout);
    expect(parsed[0].valid).to.be.false;
    expect((result as Array<{valid: boolean}>)[0].valid).to.be.false;
  });

  it('reports a command error for a malformed manifest', async () => {
    const manifestPath = path.join(workspaceDir, '.cfsdependencies');
    writeFileSync(manifestPath, 'not valid json');
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [],
      requiresLicenseAcceptance: []
    });

    const {error} = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    expect(error).to.not.be.undefined;
  });

  it('reports a command error when the package manager fails to initialize', async () => {
    const manifestPath = writeManifest([]);
    mockPackageManagerFailure(
      new Error('Package manager failed to initialize.')
    );

    const {error} = await runCommand(
      ['validate:dependencies', '--input', manifestPath],
      {root: cliRoot}
    );

    expect(error?.message).to.contain(
      'Package manager failed to initialize'
    );
  });

  it('reports an empty manifest as valid', async () => {
    const manifestPath = writeManifest([]);
    mockPackageManager({
      toInstall: [],
      alreadyInstalled: [],
      requiresLicenseAcceptance: []
    });

    const {error, result} = await runCommand(
      [
        'validate:dependencies',
        '--input',
        manifestPath,
        '--format',
        'json'
      ],
      {root: cliRoot}
    );

    expect(error).to.be.undefined;
    expect((result as Array<{valid: boolean}>)[0].valid).to.be.true;
    expect(process.exitCode).to.equal(0);
  });
});

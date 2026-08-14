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
  CfsManagedPackageRemote,
  CfsPackageRemoteCredential,
  CfsPackageRemoteCredentialClient,
  CfsPackageRemotesProvider
} from 'cfs-package-manager';
import {runCommand} from '@oclif/test';
import {ConanPkgManager} from 'cfs-package-manager';
import {stripVTControlCharacters} from 'node:util';

import {pkgAddRemoteDeps} from '../../src/commands/pkg/add-remote.js';
import {pkgAuthRemoteDeps} from '../../src/commands/pkg/auth-remote.js';
import {pkgDeleteDeps} from '../../src/commands/pkg/delete.js';
import {pkgDeleteRemoteDeps} from '../../src/commands/pkg/delete-remote.js';
import {pkgDependenciesDeps} from '../../src/commands/pkg/dependencies.js';
import {pkgDisableRemoteDeps} from '../../src/commands/pkg/disable-remote.js';
import {pkgEnableRemoteDeps} from '../../src/commands/pkg/enable-remote.js';
import {pkgInfoDeps} from '../../src/commands/pkg/info.js';
import {pkgInstallDeps} from '../../src/commands/pkg/install.js';
import {pkgListCacheDeps} from '../../src/commands/pkg/list-cache.js';
import {pkgListDeps} from '../../src/commands/pkg/list.js';
import {pkgListRemotesDeps} from '../../src/commands/pkg/list-remotes.js';
import {pkgLocalConsumersDeps} from '../../src/commands/pkg/local-consumers.js';
import {pkgLoginDeps} from '../../src/commands/pkg/login.js';
import {pkgLogoutDeps} from '../../src/commands/pkg/logout.js';
import {pkgSearchDeps} from '../../src/commands/pkg/search.js';
import {pkgUninstallDeps} from '../../src/commands/pkg/uninstall.js';
import {getPackageManager} from '../../src/utils/package-manager.js';

export const localTestRemoteName = 'local-test-server';
export const localTestRemoteUrl = 'http://localhost:9300';
export const localTestUsername = 'test_user';
export const localTestPassword = 'test_password';
export const runPkgTestsEnvVar = 'CFS_RUN_PKG_TESTS';

export function shouldSkipPkgTests(): boolean {
  return process.env[runPkgTestsEnvVar] !== '1';
}

export function listRemotesOutputHasRemoteValue(
  output: string,
  remoteName: string,
  expectedValue: string
): boolean {
  const lines = stripVTControlCharacters(output).split('\n');
  const remoteIndexes = lines
    .map((line, index) => (line.includes(remoteName) ? index : -1))
    .filter((index) => index >= 0);

  if (remoteIndexes.length === 0) {
    return false;
  }

  // Horizontal layout keeps data on one line. Vertical layout stores
  // fields on subsequent lines.
  return remoteIndexes.some((nameIndex) => {
    for (let index = nameIndex; index < lines.length; index++) {
      if (
        index > nameIndex &&
        /^[\W]+$/.test(lines[index]) && // two consecutive lines of non-word
        /^[\W]+$/.test(lines[index - 1]) // characters indicates a new table
      ) {
        break;
      }

      if (
        (index === nameIndex && // horizontal layout, value is on same line as name
          lines[index].includes(expectedValue)) || // vertical layout, value is on subsequent line(s) and has no other text on the line
        new RegExp(String.raw`${expectedValue}[\W]*$`).test(
          lines[index]
        )
      ) {
        return true;
      }
    }

    return false;
  });
}

export async function runPkgCommandWithAuthRetry(
  commandArgs: string[]
) {
  let commandResult = await runCommand(commandArgs, {
    root: '..'
  });

  if (
    commandResult.error &&
    /(Authentication error|Wrong user or password)/i.test(
      String(commandResult.error)
    )
  ) {
    commandResult = await runCommand(commandArgs, {
      root: '..'
    });
  }

  return commandResult;
}

type ManagedProviderRemote =
  | (CfsManagedPackageRemote & {auth: {public: true}})
  | (CfsManagedPackageRemote & CfsPackageRemoteCredentialClient);

class MockCredentialClient
  implements CfsPackageRemoteCredentialClient
{
  public readonly auth = {
    public: false as const,
    credentialProvider: 'mock-local-provider'
  };

  async getCredential(): Promise<
    CfsPackageRemoteCredential | undefined
  > {
    return {
      user: localTestUsername,
      password: localTestPassword
    };
  }

  async refreshCredential(): Promise<void> {
    return Promise.resolve();
  }
}

function managedRemoteWithAuth(
  credentialClient: MockCredentialClient
): ManagedProviderRemote {
  return {
    name: localTestRemoteName,
    url: new URL(localTestRemoteUrl),
    provider: 'mock-local-provider',
    custom: false,
    disabled: false,
    auth: {
      public: false,
      credentialProvider: credentialClient.auth.credentialProvider
    },
    getCredential: () => credentialClient.getCredential(),
    refreshCredential: () => credentialClient.refreshCredential()
  };
}

class MockPkgRemotesProvider implements CfsPackageRemotesProvider {
  public readonly name = 'mock-local-provider';

  async getRemotes(): Promise<ManagedProviderRemote[]> {
    const credentialClient = new MockCredentialClient();
    return [managedRemoteWithAuth(credentialClient)];
  }
}

async function createPackageManagerForPkgTests(
  includeTestServer: boolean
): Promise<ConanPkgManager> {
  const packman = new ConanPkgManager();
  if (includeTestServer) {
    await packman.registerRemotesProvider(
      new MockPkgRemotesProvider()
    );
  }

  await packman.init({initRemotes: true});

  if (!includeTestServer) {
    // Remove any existing custom remotes with the test server url to ensure a clean state for remote management tests
    const existingRemotes = await packman.listRemotes();
    for (const remote of existingRemotes) {
      if (remote.url.href === new URL(localTestRemoteUrl).href) {
        await packman.deleteRemote(remote.name);
      }
    }
  }

  return packman;
}

export async function setupMockPkgCommandDeps(options?: {
  includeTestServer?: boolean;
}): Promise<() => void> {
  /**
   * includeTestServer=true (default): Use for package flow tests that need
   * a preconfigured authenticated remote (e.g. search/list/install/dependencies).
   *
   * includeTestServer=false: Use for remote-management command tests that
   * need a clean remotes state and explicitly add/remove/auth remotes.
   */
  const includeTestServer = options?.includeTestServer ?? true;
  const originalAddRemoteGetPackageManager =
    pkgAddRemoteDeps.getPackageManager;
  const originalAuthRemoteGetPackageManager =
    pkgAuthRemoteDeps.getPackageManager;
  const originalDeleteGetPackageManager =
    pkgDeleteDeps.getPackageManager;
  const originalDeleteRemoteGetPackageManager =
    pkgDeleteRemoteDeps.getPackageManager;
  const originalSearchGetPackageManager =
    pkgSearchDeps.getPackageManager;
  const originalDependenciesGetPackageManager =
    pkgDependenciesDeps.getPackageManager;
  const originalDisableRemoteGetPackageManager =
    pkgDisableRemoteDeps.getPackageManager;
  const originalEnableRemoteGetPackageManager =
    pkgEnableRemoteDeps.getPackageManager;
  const originalInfoGetPackageManager = pkgInfoDeps.getPackageManager;
  const originalInstallGetPackageManager =
    pkgInstallDeps.getPackageManager;
  const originalListCacheGetPackageManager =
    pkgListCacheDeps.getPackageManager;
  const originalListGetPackageManager = pkgListDeps.getPackageManager;
  const originalListRemotesGetPackageManager =
    pkgListRemotesDeps.getPackageManager;
  const originalLocalConsumersGetPackageManager =
    pkgLocalConsumersDeps.getPackageManager;
  const originalLoginGetPackageManager =
    pkgLoginDeps.getPackageManager;
  const originalLogoutGetPackageManager =
    pkgLogoutDeps.getPackageManager;
  const originalUninstallGetPackageManager =
    pkgUninstallDeps.getPackageManager;

  const packman =
    await createPackageManagerForPkgTests(includeTestServer);

  const getMockPackman: typeof getPackageManager = async () =>
    packman;

  pkgAddRemoteDeps.getPackageManager = getMockPackman;
  pkgAuthRemoteDeps.getPackageManager = getMockPackman;
  pkgDeleteDeps.getPackageManager = getMockPackman;
  pkgDeleteRemoteDeps.getPackageManager = getMockPackman;
  pkgSearchDeps.getPackageManager = getMockPackman;
  pkgDependenciesDeps.getPackageManager = getMockPackman;
  pkgDisableRemoteDeps.getPackageManager = getMockPackman;
  pkgEnableRemoteDeps.getPackageManager = getMockPackman;
  pkgInfoDeps.getPackageManager = getMockPackman;
  pkgInstallDeps.getPackageManager = getMockPackman;
  pkgListCacheDeps.getPackageManager = getMockPackman;
  pkgListDeps.getPackageManager = getMockPackman;
  pkgListRemotesDeps.getPackageManager = getMockPackman;
  pkgLocalConsumersDeps.getPackageManager = getMockPackman;
  pkgLoginDeps.getPackageManager = getMockPackman;
  pkgLogoutDeps.getPackageManager = getMockPackman;
  pkgUninstallDeps.getPackageManager = getMockPackman;

  return () => {
    pkgAddRemoteDeps.getPackageManager =
      originalAddRemoteGetPackageManager;
    pkgAuthRemoteDeps.getPackageManager =
      originalAuthRemoteGetPackageManager;
    pkgDeleteDeps.getPackageManager = originalDeleteGetPackageManager;
    pkgDeleteRemoteDeps.getPackageManager =
      originalDeleteRemoteGetPackageManager;
    pkgSearchDeps.getPackageManager = originalSearchGetPackageManager;
    pkgDependenciesDeps.getPackageManager =
      originalDependenciesGetPackageManager;
    pkgDisableRemoteDeps.getPackageManager =
      originalDisableRemoteGetPackageManager;
    pkgEnableRemoteDeps.getPackageManager =
      originalEnableRemoteGetPackageManager;
    pkgInfoDeps.getPackageManager = originalInfoGetPackageManager;
    pkgInstallDeps.getPackageManager =
      originalInstallGetPackageManager;
    pkgListCacheDeps.getPackageManager =
      originalListCacheGetPackageManager;
    pkgListDeps.getPackageManager = originalListGetPackageManager;
    pkgListRemotesDeps.getPackageManager =
      originalListRemotesGetPackageManager;
    pkgLocalConsumersDeps.getPackageManager =
      originalLocalConsumersGetPackageManager;
    pkgLoginDeps.getPackageManager = originalLoginGetPackageManager;
    pkgLogoutDeps.getPackageManager = originalLogoutGetPackageManager;
    pkgUninstallDeps.getPackageManager =
      originalUninstallGetPackageManager;
  };
}

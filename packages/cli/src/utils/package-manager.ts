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

import type {
  CfsPackageReference,
  CfsPackageRemotesProvider
} from 'cfs-package-manager';

import {Command} from '@oclif/core';
import {
  type CfsApiClient,
  DefaultConanCloudsmithRemotesProvider,
  MyAnalogCloudsmithCredentialProvider,
  MyAnalogConanCloudsmithRemotesProvider,
  PackageLicenseReporter
} from 'cfs-lib';
import {ConanPkgManager} from 'cfs-package-manager';

import {getApiClient} from './api-client.js';
import {errorWithCode} from './recoverable-error.js';

// Stable codes keep JSON error envelopes from deriving a code out of
// input- or environment-dependent messages.
const INVALID_PACKAGE_REFERENCE = 'INVALID_PACKAGE_REFERENCE';
const INVALID_PACKAGE_NAME = 'INVALID_PACKAGE_NAME';

export async function getCredentialProvider(
  apiClient?: CfsApiClient,
  command?: Command
) {
  const client =
    apiClient ??
    (await getApiClient(
      {
        auth: ['api-key', 'session']
      },
      command
    ));

  if (!client.isAnonymous) {
    return new MyAnalogCloudsmithCredentialProvider(client);
  }
}

export async function getRemotesProvider(
  apiClient?: CfsApiClient,
  command?: Command
) {
  let remotesProvider: CfsPackageRemotesProvider;

  try {
    apiClient ??= await getApiClient({}, command);

    const myAnalogProvider =
      new MyAnalogConanCloudsmithRemotesProvider(apiClient);
    await myAnalogProvider.init();
    remotesProvider = myAnalogProvider;
  } catch (error) {
    command?.warn(
      `Failed to initialize cloud package remotes provider, falling back to default remotes\n${error instanceof Error ? error.message : String(error)}`
    );

    remotesProvider = new DefaultConanCloudsmithRemotesProvider();
  }

  return remotesProvider;
}

export async function getLicenseReporter(
  apiClient?: CfsApiClient,
  command?: Command
) {
  const client =
    apiClient ??
    (await getApiClient(
      {
        auth: ['api-key', 'session']
      },
      command
    ));

  if (!client.isAnonymous) {
    return new PackageLicenseReporter(client);
  }
}

export async function getPackageManager<
  T extends {
    acceptUndefined?: boolean;
    useRemotes?: boolean;
  } = object
>(
  {acceptUndefined = false, useRemotes = false}: T = {} as T,
  apiClient?: CfsApiClient,
  command?: Command
): Promise<
  T extends {acceptUndefined: true}
    ? ConanPkgManager | undefined
    : ConanPkgManager
> {
  let conanPackman: ConanPkgManager | undefined;
  let errorMessage: string | undefined;
  let errorCode: string | undefined;

  try {
    conanPackman = new ConanPkgManager();

    if (useRemotes) {
      const client =
        apiClient ?? (await getApiClient({optional: true}, command));
      const licenseReporter = await getLicenseReporter(
        client,
        command
      );
      const remotesProvider = await getRemotesProvider(
        client,
        command
      );

      if (licenseReporter) {
        // License reporter is only available when authenticated as a user
        await conanPackman.registerLicenseReporter(licenseReporter);
      }

      await conanPackman.registerRemotesProvider(remotesProvider);
    }

    await conanPackman.init({initRemotes: useRemotes});
  } catch (error: unknown) {
    conanPackman = undefined;
    errorMessage =
      error instanceof Error ? error.message : String(error);
    const originalCode = (error as {code?: unknown} | undefined)
      ?.code;
    if (typeof originalCode === 'string' && originalCode) {
      errorCode = originalCode;
    }
  }

  if (conanPackman === undefined && !acceptUndefined) {
    throw errorWithCode(
      `Package manager failed to initialize with Error: ${errorMessage ?? 'unknown error'}`,
      errorCode ?? 'PACKAGE_MANAGER_INIT_FAILED'
    );
  }

  return conanPackman as T extends {acceptUndefined: true}
    ? ConanPkgManager | undefined
    : ConanPkgManager;
}

// Package names may contain:
// - alphanumeric characters
// - underscore (_)
// - hyphen (-)

const pkgNamePattern = /^[\w-]+$/;

// Package version may contain any character except:
// - space characters
// - asterisk (*)
// - forward slash (/)
const pkgRefPattern = /^(?<name>[\w-]+)\/(?<version>[^\s*/]+)$/;

export function parsePackageReference(
  input: string
): CfsPackageReference {
  // Since some commands expect a full reference and others only a package name,
  // we can expect users to provide a package name when a reference is needed, let's
  // detect that case and provide a better message than the generic "wrong format"
  if (pkgNamePattern.test(input)) {
    throw errorWithCode(
      `Expecting a package reference, but only package name was provided.\nYou need to specify a version with format "${input}/<version>"`,
      INVALID_PACKAGE_REFERENCE
    );
  }

  const match = pkgRefPattern.exec(input);
  if (!match || !match.groups) {
    // Check if input looks like a file path rather than a malformed package reference.
    // Only classify as a file path if it has clear path indicators:
    // - Windows absolute path (C:\, D:\, etc.)
    // - Unix absolute path starting with /
    // - Relative path prefix (./ or ../)
    // - Contains backslash (Windows path separator)
    // - .cfsdependencies file (always treated as manifest)
    // - .json file WITH path separators
    const isWindowsAbsolutePath = /^[A-Za-z]:\\/.test(input);
    const isUnixAbsolutePath = /^\/(?!.*\/)/.test(input); // Unix absolute but not just a single slash
    const isRelativePath =
      input.startsWith('./') || input.startsWith('../');
    const hasBackslash = input.includes('\\');
    const hasForwardSlash = input.includes('/');

    // .cfsdependencies is always a manifest file
    // .json is only treated as a file path if it has path separators
    const isManifestFile =
      input.endsWith('.cfsdependencies') ||
      (input.endsWith('.json') && (hasBackslash || hasForwardSlash));

    // Only treat as file path if it has clear file path indicators,
    // not just because it contains a forward slash (which is also the package separator)
    const looksLikeFilePath =
      isWindowsAbsolutePath ||
      isUnixAbsolutePath ||
      isRelativePath ||
      hasBackslash ||
      isManifestFile;

    if (looksLikeFilePath) {
      throw errorWithCode(
        `File not found: '${input}'\nExpected either:\n  - A valid file path to a manifest file, or\n  - A package reference in format <packageName>/<version>`,
        INVALID_PACKAGE_REFERENCE
      );
    }

    throw errorWithCode(
      'Invalid package reference format. Expected format: <packageName>/<version>',
      INVALID_PACKAGE_REFERENCE
    );
  }

  return match.groups as unknown as CfsPackageReference;
}

export function validatePackageName(input: string): void {
  // Since some commands expect a full reference and others only a package name,
  // we can expect users to provide a reference when only a name is needed, let's
  // detect that case and provide a better message than the generic "wrong format"
  const refMatch = pkgRefPattern.exec(input);
  if (refMatch) {
    const {name} = refMatch.groups as unknown as CfsPackageReference;
    throw errorWithCode(
      `Expecting a package name, but a package reference was provided.\nConsider using "${name}" instead of "${input}"`,
      INVALID_PACKAGE_NAME
    );
  }

  if (!pkgNamePattern.test(input)) {
    throw errorWithCode(
      'Invalid package name. Package names can only contain alphanumeric characters, underscores (_) and hyphens (-)',
      INVALID_PACKAGE_NAME
    );
  }
}

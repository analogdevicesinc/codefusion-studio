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

import type {CfsPackageReference} from 'cfs-package-manager';

import {
  CfsApiClient,
  MyAnalogCloudsmithCredentialProvider
} from 'cfs-lib';
import {ConanPkgManager} from 'cfs-package-manager';

import {getAuthConfig, getSessionManager} from './session-manager.js';

export async function getCredentialProvider() {
  const session = await getSessionManager().getSession();
  if (session) {
    const authcfg = getAuthConfig();
    return new MyAnalogCloudsmithCredentialProvider(
      new CfsApiClient({
        baseUrl: authcfg.ccmUrl,
        authorizer: session?.authorizer
      })
    );
  }
}

export async function getPackageManager<
  T extends {
    acceptUndefined?: boolean;
    includeCredentialProvider?: boolean;
  } = object
>(
  {
    acceptUndefined = false,
    includeCredentialProvider = false
  }: T = {} as T
): Promise<
  T extends {acceptUndefined: true}
    ? ConanPkgManager | undefined
    : ConanPkgManager
> {
  let conanPackman: ConanPkgManager | undefined;
  let errorMessage: string | undefined;
  let credentialProvider:
    | MyAnalogCloudsmithCredentialProvider
    | undefined;

  try {
    if (includeCredentialProvider) {
      credentialProvider = await getCredentialProvider();
    }

    conanPackman = new ConanPkgManager({
      credentialProviders: credentialProvider
        ? [credentialProvider]
        : undefined
    });

    await conanPackman.init();
  } catch (error: unknown) {
    conanPackman = undefined;
    errorMessage =
      error instanceof Error ? error.message : String(error);
  }

  if (!conanPackman && !acceptUndefined) {
    throw new Error(
      `Package manager failed to initialize with ${`Error: ${errorMessage ?? 'unknown error'}`}`
    );
  }

  return conanPackman as never;
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
    throw new Error(
      `Expecting a package reference, but only package name was provided.\nYou need to specify a version with format "${input}/<version>"`
    );
  }

  const match = pkgRefPattern.exec(input);
  if (!match || !match.groups) {
    throw new Error(
      'Invalid package reference format. Expected format: <packageName>/<version>'
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
    throw new Error(
      `Expecting a package name, but a package reference was provided.\nConsider using "${name}" instead of "${input}"`
    );
  }

  if (!pkgNamePattern.test(input)) {
    throw new Error(
      'Invalid package name. Package names can only contain alphanumeric characters, underscores (_) and hyphens (-)'
    );
  }
}

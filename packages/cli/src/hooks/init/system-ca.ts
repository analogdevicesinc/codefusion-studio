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

import {Hook} from '@oclif/core';

const NODE_FLAG =
  /(?:^|\s)(?:--(?:no-)?use-(?:system|bundled|openssl)-ca|(["'])(?:--(?:no-)?use-(?:system|bundled|openssl)-ca|--use-(?:bundled|openssl)-ca)\1)(?=\s|$)/;
const SYSTEM_CA_ENV_VAR = 'NODE_USE_SYSTEM_CA';
const EXTRA_CA_CERTS_ENV_VAR = 'NODE_EXTRA_CA_CERTS';

type TlsModule = {
  getCACertificates?: (type: 'default' | 'system') => string[];
  setDefaultCACertificates?: (certs: string[]) => void;
};

export const systemCAHookDeps: {
  loadTlsModule: () => Promise<TlsModule>;
} = {
  loadTlsModule: async () => import('node:tls')
};

function hasNodeFlag(): boolean {
  if (
    process.env.NODE_OPTIONS &&
    NODE_FLAG.test(process.env.NODE_OPTIONS)
  ) {
    return true;
  }

  return process.execArgv.some((arg) => NODE_FLAG.test(arg));
}

function hasEnvVar(): boolean {
  return (
    process.env[SYSTEM_CA_ENV_VAR] !== undefined ||
    process.env[EXTRA_CA_CERTS_ENV_VAR] !== undefined
  );
}

const hook: Hook<'init'> = async function (options) {
  const hasFlag = hasNodeFlag();
  const hasEnv = hasEnvVar();

  // User has explicitly configured system CA behavior already
  if (hasFlag || hasEnv) {
    return;
  }

  try {
    const {getCACertificates, setDefaultCACertificates} =
      await systemCAHookDeps.loadTlsModule();

    if (
      typeof getCACertificates !== 'function' ||
      typeof setDefaultCACertificates !== 'function'
    ) {
      return;
    }

    const bundledCACerts = getCACertificates('default');
    const systemCACerts = getCACertificates('system');

    if (systemCACerts.length === 0) {
      return;
    }

    setDefaultCACertificates([...bundledCACerts, ...systemCACerts]);

    // Set environment variable for child processes to enable system CA certificates
    process.env[SYSTEM_CA_ENV_VAR] = '1';
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string'
        ? error.message
        : String(error);
    options.context.warn(
      `Failed to enable system CA certificates: ${message}.`
    );
  }
};

export default hook;

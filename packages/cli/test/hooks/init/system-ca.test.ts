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
import Sinon from 'sinon';

import hook, {
  systemCAHookDeps
} from '../../../src/hooks/init/system-ca.js';

type InitHookOptions = {
  config: {root: string};
  context: {warn: (message: string) => void};
};

function createHookOptions(
  root: string,
  warn: (message: string) => void = () => undefined
): InitHookOptions {
  return {
    config: {root},
    context: {warn}
  };
}

async function invokeHook(options: InitHookOptions) {
  await hook.call({} as never, options as never);
}

describe('init hook: system-ca', () => {
  let sandbox: Sinon.SinonSandbox;
  let originalExecArgv: string[];
  let originalNodeOptions: string | undefined;
  let originalNodeUseSystemCA: string | undefined;
  let originalNodeExtraCACerts: string | undefined;
  const originalLoadTlsModule = systemCAHookDeps.loadTlsModule;

  const nodeCAFlags = [
    '--use-system-ca',
    '--no-use-system-ca',
    '--use-openssl-ca',
    '--no-use-openssl-ca',
    '--use-bundled-ca',
    '--no-use-bundled-ca'
  ];

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    originalExecArgv = [...process.execArgv];
    originalNodeOptions = process.env.NODE_OPTIONS;
    originalNodeUseSystemCA = process.env.NODE_USE_SYSTEM_CA;
    originalNodeExtraCACerts = process.env.NODE_EXTRA_CA_CERTS;

    delete process.env.NODE_OPTIONS;
    delete process.env.NODE_USE_SYSTEM_CA;
    delete process.env.NODE_EXTRA_CA_CERTS;
  });

  afterEach(() => {
    process.execArgv = [...originalExecArgv];
    systemCAHookDeps.loadTlsModule = originalLoadTlsModule;
    sandbox.restore();

    if (originalNodeOptions === undefined) {
      delete process.env.NODE_OPTIONS;
    } else {
      process.env.NODE_OPTIONS = originalNodeOptions;
    }

    if (originalNodeUseSystemCA === undefined) {
      delete process.env.NODE_USE_SYSTEM_CA;
    } else {
      process.env.NODE_USE_SYSTEM_CA = originalNodeUseSystemCA;
    }

    if (originalNodeExtraCACerts === undefined) {
      delete process.env.NODE_EXTRA_CA_CERTS;
    } else {
      process.env.NODE_EXTRA_CA_CERTS = originalNodeExtraCACerts;
    }
  });

  function setupTlsStub() {
    const setDefaultCACertificates = sandbox.stub();
    systemCAHookDeps.loadTlsModule = async () => ({
      getCACertificates: (type) =>
        type === 'default' ? ['bundled-ca'] : ['system-ca'],
      setDefaultCACertificates
    });

    return setDefaultCACertificates;
  }

  async function assertSkippedWhenNodeOptionsSet(
    nodeOptions: string
  ) {
    const setDefaultCACertificates = setupTlsStub();

    process.env.NODE_OPTIONS = nodeOptions;

    await invokeHook(createHookOptions(process.cwd()));

    expect(setDefaultCACertificates.called).to.equal(false);
    expect(process.env.NODE_USE_SYSTEM_CA).to.equal(undefined);
    expect(process.env.NODE_OPTIONS).to.equal(nodeOptions);
  }

  async function assertSkippedWhenExecArgvHasFlag(flag: string) {
    const setDefaultCACertificates = setupTlsStub();
    process.execArgv = [...process.execArgv, flag];

    await invokeHook(createHookOptions(process.cwd()));

    expect(setDefaultCACertificates.called).to.equal(false);
    expect(process.env.NODE_USE_SYSTEM_CA).to.equal(undefined);
  }

  it('does not enable system CA programmatically when NODE_USE_SYSTEM_CA is set', async () => {
    const setDefaultCACertificates = setupTlsStub();

    process.env.NODE_USE_SYSTEM_CA = 'false';
    process.env.NODE_OPTIONS = '--trace-warnings';

    await invokeHook(createHookOptions(process.cwd()));

    expect(setDefaultCACertificates.called).to.equal(false);
    expect(process.env.NODE_USE_SYSTEM_CA).to.equal('false');
    expect(process.env.NODE_OPTIONS).to.equal('--trace-warnings');
  });

  it('does not enable system CA programmatically when NODE_EXTRA_CA_CERTS is set', async () => {
    const setDefaultCACertificates = setupTlsStub();

    process.env.NODE_EXTRA_CA_CERTS = '/tmp/custom-ca.pem';
    process.env.NODE_OPTIONS = '--trace-warnings';

    await invokeHook(createHookOptions(process.cwd()));

    expect(setDefaultCACertificates.called).to.equal(false);
    expect(process.env.NODE_EXTRA_CA_CERTS).to.equal(
      '/tmp/custom-ca.pem'
    );
    expect(process.env.NODE_USE_SYSTEM_CA).to.equal(undefined);
    expect(process.env.NODE_OPTIONS).to.equal('--trace-warnings');
  });

  describe('when flags are set in NODE_OPTIONS', () => {
    for (const flag of nodeCAFlags) {
      it(`does not enable system CA programmatically when ${flag} is in NODE_OPTIONS`, async () => {
        await assertSkippedWhenNodeOptionsSet(
          `${flag} --trace-warnings`
        );
      });
    }

    it('handles quoted arguments in NODE_OPTIONS', async () => {
      for (const nodeOptions of [
        ...nodeCAFlags.map((flag) => `"${flag}" --trace-warnings`),
        ...nodeCAFlags.map((flag) => `--trace-warnings '${flag}'`)
      ]) {
        delete process.env.NODE_USE_SYSTEM_CA;
        await assertSkippedWhenNodeOptionsSet(nodeOptions);
      }
    });
  });

  describe('when flags are set in process.execArgv', () => {
    for (const flag of nodeCAFlags) {
      it(`does not enable system CA programmatically when ${flag} is in process.execArgv`, async () => {
        await assertSkippedWhenExecArgvHasFlag(flag);
      });
    }
  });

  it('sets NODE_USE_SYSTEM_CA for child processes when enabling system CA programmatically', async () => {
    const setDefaultCACertificates = setupTlsStub();

    await invokeHook(createHookOptions(process.cwd()));

    expect(
      setDefaultCACertificates.calledOnceWithExactly([
        'bundled-ca',
        'system-ca'
      ])
    ).to.equal(true);
    expect(process.env.NODE_USE_SYSTEM_CA).to.equal('1');
    expect(process.env.NODE_OPTIONS).to.equal(undefined);
  });
});

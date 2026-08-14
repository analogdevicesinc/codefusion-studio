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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Sinon from 'sinon';

import hook from '../../../src/hooks/init/node-version.js';

type InitHookOptions = {
  config: {root: string};
  context: {warn: (message: string) => void};
};

function createTempRootWithNodeRange(nodeRange: string) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cfsutil-node-version-')
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({engines: {node: nodeRange}}),
    'utf8'
  );
  return root;
}

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

describe('init hook: node-version', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('does not warn when package.json has no engines field', async () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfsutil-node-version-')
    );
    const warnStub = sandbox.stub();

    try {
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({}),
        'utf8'
      );

      await invokeHook(createHookOptions(root, warnStub));

      expect(warnStub.called).to.equal(false);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
    }
  });

  it('does not warn when package.json cannot be read', async () => {
    const warnStub = sandbox.stub();

    await invokeHook(
      createHookOptions('/nonexistent/path', warnStub)
    );

    expect(warnStub.called).to.equal(false);
  });

  it('warns when node version does not satisfy the required range', async () => {
    const tempRoot = createTempRootWithNodeRange('>=999.0.0');
    const warnStub = sandbox.stub();

    try {
      await invokeHook(createHookOptions(tempRoot, warnStub));

      expect(warnStub.calledOnce).to.equal(true);
      expect(warnStub.firstCall.firstArg).to.include(
        'This utility requires Node >=999.0.0'
      );
      expect(warnStub.firstCall.firstArg).to.include(
        `current: v${process.versions.node}`
      );
    } finally {
      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  });

  it('does not warn when node version satisfies the required range', async () => {
    const tempRoot = createTempRootWithNodeRange(
      `=${process.versions.node}`
    );
    const warnStub = sandbox.stub();

    try {
      await invokeHook(createHookOptions(tempRoot, warnStub));

      expect(warnStub.called).to.equal(false);
    } finally {
      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  });
});

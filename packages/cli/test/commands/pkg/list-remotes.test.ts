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
import {runCommand} from '@oclif/test';
import {
  listRemotesOutputHasRemoteValue,
  localTestRemoteUrl,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps,
  shouldSkipPkgTests
} from '../../utils/pkg-test-helpers.js';

async function withMockStdout(
  overrides: {
    isTTY?: boolean;
    columns?: number;
  },
  run: () => Promise<void>
): Promise<void> {
  const isTTYDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    'isTTY'
  );
  const columnsDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    'columns'
  );

  if (overrides.isTTY !== undefined) {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: overrides.isTTY
    });
  }

  if (overrides.columns !== undefined) {
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: overrides.columns
    });
  }

  try {
    await run();
  } finally {
    if (isTTYDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor);
    } else {
      delete (process.stdout as {isTTY?: boolean}).isTTY;
    }

    if (columnsDescriptor) {
      Object.defineProperty(
        process.stdout,
        'columns',
        columnsDescriptor
      );
    } else {
      delete (process.stdout as {columns?: number}).columns;
    }
  }
}

function countLabelOccurrences(
  output: string,
  label: string
): number {
  return output.split(label).length - 1;
}

describe('pkg list-remotes', () => {
  let restoreDeps: (() => void) | undefined;
  const addedRemoteName = 'pkg-list-remotes-added';

  beforeEach(async () => {
    restoreDeps = await setupMockPkgCommandDeps({
      includeTestServer: false
    });
  });

  afterEach(() => {
    restoreDeps?.();
    restoreDeps = undefined;
  });

  before(async function () {
    if (shouldSkipPkgTests()) {
      console.warn(
        `Skipping pkg tests because ${runPkgTestsEnvVar} is not set to 1`
      );
      this.skip();
    }
  });

  it('lists configured remotes and their details', async () => {
    const {error: addError} = await runCommand(
      ['pkg', 'add-remote', addedRemoteName, localTestRemoteUrl],
      {root: '..'}
    );
    expect(addError).to.be.undefined;

    const {
      stdout: remotesStdout,
      stderr: remotesStderr,
      error: remotesError
    } = await runCommand(['pkg', 'list-remotes'], {root: '..'});

    expect(remotesError).to.be.undefined;
    expect(remotesStderr.trim()).to.equal('');
    expect(remotesStdout).to.contain('Name');
    expect(remotesStdout).to.contain('URL');
    expect(remotesStdout).to.contain('Auth');
    expect(remotesStdout).to.contain('Custom');
    expect(remotesStdout).to.contain('Status');
    expect(
      listRemotesOutputHasRemoteValue(
        remotesStdout,
        addedRemoteName,
        localTestRemoteUrl
      )
    ).to.equal(true);
    expect(
      listRemotesOutputHasRemoteValue(
        remotesStdout,
        addedRemoteName,
        'None'
      )
    ).to.equal(true);
  });

  it('prints a single horizontal table when output fits terminal width', async () => {
    const {error: addErrorOne} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-fit-1`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorOne).to.be.undefined;

    const {error: disableErrorOne} = await runCommand(
      ['pkg', 'disable-remote', `${addedRemoteName}-fit-1`],
      {root: '..'}
    );
    expect(disableErrorOne).to.be.undefined;

    const {error: addErrorTwo} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-fit-2`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorTwo).to.be.undefined;

    await withMockStdout({isTTY: true, columns: 500}, async () => {
      const {
        stdout: remotesStdout,
        stderr: remotesStderr,
        error: remotesError
      } = await runCommand(['pkg', 'list-remotes'], {root: '..'});

      expect(remotesError).to.be.undefined;
      expect(remotesStderr.trim()).to.equal('');
      expect(countLabelOccurrences(remotesStdout, 'Name')).to.equal(
        1
      );
      expect(countLabelOccurrences(remotesStdout, 'URL')).to.equal(1);
    });
  });

  it('prints multiple vertical tables when output does not fit terminal width', async () => {
    const {error: addErrorOne} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-wrap-1`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorOne).to.be.undefined;

    const {error: disableErrorOne} = await runCommand(
      ['pkg', 'disable-remote', `${addedRemoteName}-wrap-1`],
      {root: '..'}
    );
    expect(disableErrorOne).to.be.undefined;

    const {error: addErrorTwo} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-wrap-2`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorTwo).to.be.undefined;

    await withMockStdout({isTTY: true, columns: 10}, async () => {
      const {
        stdout: remotesStdout,
        stderr: remotesStderr,
        error: remotesError
      } = await runCommand(['pkg', 'list-remotes'], {root: '..'});

      expect(remotesError).to.be.undefined;
      expect(remotesStderr.trim()).to.equal('');
      expect(
        countLabelOccurrences(remotesStdout, 'Name')
      ).to.be.greaterThan(1);
      expect(
        countLabelOccurrences(remotesStdout, 'URL')
      ).to.be.greaterThan(1);
    });
  });

  it('always prints a single table when not running in a terminal', async () => {
    const {error: addErrorOne} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-notty-1`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorOne).to.be.undefined;

    const {error: disableErrorOne} = await runCommand(
      ['pkg', 'disable-remote', `${addedRemoteName}-notty-1`],
      {root: '..'}
    );
    expect(disableErrorOne).to.be.undefined;

    const {error: addErrorTwo} = await runCommand(
      [
        'pkg',
        'add-remote',
        `${addedRemoteName}-notty-2`,
        localTestRemoteUrl
      ],
      {root: '..'}
    );
    expect(addErrorTwo).to.be.undefined;

    await withMockStdout({isTTY: false, columns: 10}, async () => {
      const {
        stdout: remotesStdout,
        stderr: remotesStderr,
        error: remotesError
      } = await runCommand(['pkg', 'list-remotes'], {root: '..'});

      expect(remotesError).to.be.undefined;
      expect(remotesStderr.trim()).to.equal('');
      expect(countLabelOccurrences(remotesStdout, 'Name')).to.equal(
        1
      );
      expect(countLabelOccurrences(remotesStdout, 'URL')).to.equal(1);
    });
  });
});

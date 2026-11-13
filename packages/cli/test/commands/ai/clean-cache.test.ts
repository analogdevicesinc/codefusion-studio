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
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {assertSuccessEnvelopeData} from '../../utils/assert-json-envelope.js';

describe('ai:clean-cache', () => {
  let homeBackup: string | undefined;
  let userProfileBackup: string | undefined;
  let tmpHome: string;

  beforeEach(async () => {
    homeBackup = process.env.HOME;
    userProfileBackup = process.env.USERPROFILE;
    tmpHome = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-clean-cache-')
    );
    // getCFSCachePath() resolves off os.homedir(), which reads $HOME on
    // POSIX and %USERPROFILE% on Windows; redirect both so this test never
    // touches a real cache dir.
    process.env.HOME = tmpHome;
    process.env.USERPROFILE = tmpHome;
  });

  afterEach(async () => {
    if (homeBackup === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = homeBackup;
    }

    if (userProfileBackup === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = userProfileBackup;
    }

    await fs.rm(tmpHome, {recursive: true, force: true});
  });

  describe('--format text', () => {
    it('GIVEN a run THEN log a confirmation message', async () => {
      const {stdout, error} = await runCommand(['ai:clean-cache'], {
        root: '..'
      });

      expect(error).to.not.exist;
      expect(stdout).to.contain('CFS AI cache cleared.');
    });
  });

  describe('--format json', () => {
    it('GIVEN a run THEN return envelope with {cleared: true} as data', async () => {
      const {stdout, error} = await runCommand(
        ['ai:clean-cache', '--format', 'json'],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{cleared: boolean}>(
        stdout,
        'ai clean-cache'
      );
      expect(data).to.deep.equal({cleared: true});
    });
  });
});

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
import {ConanPkgManager} from 'cfs-package-manager';
import Sinon from 'sinon';

import {
  getPackageManager,
  parsePackageReference,
  validatePackageName
} from '../../src/utils/package-manager.js';

describe('package-manager error codes', () => {
  afterEach(() => {
    Sinon.restore();
  });

  describe('getPackageManager', () => {
    for (const message of [
      'conan not found at /opt/a',
      'unexpected failure in /home/b'
    ]) {
      it(`uses a fixed code for the init failure "${message}"`, async () => {
        Sinon.stub(ConanPkgManager.prototype, 'init').rejects(
          new Error(message)
        );

        let thrown: (Error & {code?: string}) | undefined;
        try {
          await getPackageManager();
        } catch (error) {
          thrown = error as Error & {code?: string};
        }

        expect(thrown?.code).to.equal('PACKAGE_MANAGER_INIT_FAILED');
        expect(thrown?.message).to.contain(message);
      });
    }

    it('preserves a string code set on the original init error', async () => {
      Sinon.stub(ConanPkgManager.prototype, 'init').rejects(
        Object.assign(new Error('boom'), {code: 'CUSTOM_CODE'})
      );

      let thrown: (Error & {code?: string}) | undefined;
      try {
        await getPackageManager();
      } catch (error) {
        thrown = error as Error & {code?: string};
      }

      expect(thrown?.code).to.equal('CUSTOM_CODE');
    });
  });

  describe('parsePackageReference', () => {
    for (const input of [
      'justAName',
      './some/path.json',
      'bad ref/1.0.0'
    ]) {
      it(`uses a fixed code for the malformed reference "${input}"`, () => {
        let thrown: (Error & {code?: string}) | undefined;
        try {
          parsePackageReference(input);
        } catch (error) {
          thrown = error as Error & {code?: string};
        }

        expect(thrown?.code).to.equal('INVALID_PACKAGE_REFERENCE');
      });
    }
  });

  describe('validatePackageName', () => {
    for (const input of [
      'pkg_a/1.0',
      'pkg_b/2.1',
      'bad name',
      'bad.name'
    ]) {
      it(`uses a fixed code for the invalid name "${input}"`, () => {
        let thrown: (Error & {code?: string}) | undefined;
        try {
          validatePackageName(input);
        } catch (error) {
          thrown = error as Error & {code?: string};
        }

        expect(thrown?.code).to.equal('INVALID_PACKAGE_NAME');
      });
    }
  });
});

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

import {RecoverableError} from '../../src/utils/recoverable-error.js';

describe('RecoverableError', () => {
  describe('toJson', () => {
    it('GIVEN a recovery with a code THEN omit the code from the legacy JSON shape', () => {
      const error = new RecoverableError('Boom', {
        suggestion: 'Try again',
        run: 'cfsutil retry',
        code: 'BOOM'
      });

      expect(error.code).to.equal('BOOM');
      expect(error.toJson()).to.deep.equal({
        level: 'ERROR',
        msg: 'Boom',
        recovery: {suggestion: 'Try again', run: 'cfsutil retry'}
      });
      expect(error.recovery.code).to.equal('BOOM');
    });
  });
});

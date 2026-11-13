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

import {isNonInteractiveSession} from '../../src/utils/is-non-interactive.js';

describe('isNonInteractiveSession', () => {
  let originalIsTTY: boolean | undefined;
  let originalDoNotTrack: string | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdin.isTTY;
    originalDoNotTrack = process.env.DO_NOT_TRACK;

    delete process.env.DO_NOT_TRACK;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true
    });
    if (originalDoNotTrack === undefined) {
      delete process.env.DO_NOT_TRACK;
    } else {
      process.env.DO_NOT_TRACK = originalDoNotTrack;
    }
  });

  it('returns true when DO_NOT_TRACK is "1"', () => {
    process.env.DO_NOT_TRACK = '1';

    expect(isNonInteractiveSession()).to.equal(true);
  });

  it('returns true when DO_NOT_TRACK is "true"', () => {
    process.env.DO_NOT_TRACK = 'true';

    expect(isNonInteractiveSession()).to.equal(true);
  });

  it('returns true when stdin is not a TTY', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      writable: true,
      configurable: true
    });

    expect(isNonInteractiveSession()).to.equal(true);
  });

  it('returns false when interactive', () => {
    process.env.CI = 'false';
    expect(isNonInteractiveSession()).to.equal(false);
  });
});

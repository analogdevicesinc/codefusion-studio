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

import {isTelemetrySuppressed} from '../../src/utils/telemetry.js';

describe('isTelemetrySuppressed', () => {
  it('returns true when CFS_TELEMETRY_DISABLED is "1"', () => {
    expect(
      isTelemetrySuppressed({CFS_TELEMETRY_DISABLED: '1'})
    ).to.equal(true);
  });

  it('returns true when CFS_TELEMETRY_DISABLED is " 1 " (trimmed)', () => {
    expect(
      isTelemetrySuppressed({
        CFS_TELEMETRY_DISABLED: ' 1 '
      })
    ).to.equal(true);
  });

  it('returns false when CFS_TELEMETRY_DISABLED is "0"', () => {
    expect(
      isTelemetrySuppressed({CFS_TELEMETRY_DISABLED: '0'})
    ).to.equal(false);
  });

  it('returns true when CFS_TELEMETRY_DISABLED is "true"', () => {
    expect(
      isTelemetrySuppressed({
        CFS_TELEMETRY_DISABLED: 'true'
      })
    ).to.equal(true);
  });

  it('returns true when CFS_TELEMETRY_DISABLED is "TRUE" (case-insensitive)', () => {
    expect(
      isTelemetrySuppressed({
        CFS_TELEMETRY_DISABLED: 'TRUE'
      })
    ).to.equal(true);
  });

  it('returns false when CFS_TELEMETRY_DISABLED is "no"', () => {
    expect(
      isTelemetrySuppressed({
        CFS_TELEMETRY_DISABLED: 'no'
      })
    ).to.equal(false);
  });

  it('returns false when CFS_TELEMETRY_DISABLED is undefined', () => {
    expect(isTelemetrySuppressed({})).to.equal(false);
  });

  it('returns false when CFS_TELEMETRY_DISABLED is empty', () => {
    expect(
      isTelemetrySuppressed({CFS_TELEMETRY_DISABLED: ''})
    ).to.equal(false);
  });
});

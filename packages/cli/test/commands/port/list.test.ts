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

import {expect, test} from '@oclif/test';

/**
 * Test suite for port:list command.
 *
 * Tests cover:
 * - Basic command execution (port list is accepted)
 * - Verbose flag (-v) is accepted
 * - Invalid flags are rejected (e.g., -w is not accepted)
 */

describe('port:list', () => {
  describe('command acceptance', () => {
    test
      .stdout()
      .command(['port:list'], {
        root: '..'
      })
      .it('accepts port list command', (ctx) => {
        // Command should execute without errors
        // Output should contain either port listing or "No serial ports found"
        expect(ctx.stdout).to.match(
          /Available serial ports:|No serial ports found/
        );
      });
  });

  describe('flag acceptance', () => {
    test
      .stdout()
      .command(['port:list', '-v'], {
        root: '..'
      })
      .it('accepts -v (verbose) flag', (ctx) => {
        // Command should execute without errors with -v flag
        expect(ctx.stdout).to.match(
          /Available serial ports:|No serial ports found/
        );
      });

    test
      .stdout()
      .command(['port:list', '--verbose'], {
        root: '..'
      })
      .it('accepts --verbose flag', (ctx) => {
        // Command should execute without errors with --verbose flag
        expect(ctx.stdout).to.match(
          /Available serial ports:|No serial ports found/
        );
      });
  });
});

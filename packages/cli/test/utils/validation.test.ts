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
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {validatePaths} from '../../src/utils/validation.js';

/**
 * Feature: Workspace Name Validation
 *   As a CLI user
 *   I want to be informed when a workspace name contains invalid characters
 *   so that I can correct the name.
 *
 * Background:
 *   Test that the validatePaths function correctly identifies invalid characters in the workspace name.
 */
describe('validatePaths', () => {
  describe('workspace name character validation', () => {
    // Scenario: Workspace name contains only valid characters
    //   Use a workspace name with letters, numbers, underscores, periods and hyphens.
    //   When validatePaths is called, there are no errors related to invalid characters in the workspace name.
    it('accepts a name containing letters, numbers, underscores, periods and hyphens', async () => {
      const errors: string[] = [];
      const outputDir = mkdtempSync(
        join(tmpdir(), 'cfs-validatepaths-')
      );
      try {
        await validatePaths(
          {
            name: 'my-workspace_name.v1',
            output: outputDir
          },
          true,
          errors
        );

        const nameErrors = errors.filter((e) =>
          e.includes(
            'can only contain letters, numbers, underscores, periods and hyphens'
          )
        );
        expect(nameErrors).to.be.empty;
      } finally {
        rmSync(outputDir, {recursive: true, force: true});
      }
    });

    // Scenario: Workspace name contains an invalid character
    //   Given a workspace name that contains one of the invalid characters below,
    //   when validatePaths() is called, we get an error about invalid characters
    //
    // Add more characters to this array to extend the set of invalid symbol checks.
    const invalidCharacters = [',', ';', ':', '$'];

    for (const char of invalidCharacters) {
      it(`rejects a name containing "${char}"`, async () => {
        const errors: string[] = [];
        const outputDir = mkdtempSync(
          join(tmpdir(), 'cfs-validatepaths-')
        );
        try {
          await validatePaths(
            {
              name: `my${char}workspace`,
              output: outputDir
            },
            true,
            errors
          );
          expect(
            errors.some((e) =>
              e.includes(
                'can only contain letters, numbers, underscores, periods and hyphens'
              )
            )
          ).to.be.true;
        } finally {
          rmSync(outputDir, {recursive: true, force: true});
        }
      });
    }
  });
});

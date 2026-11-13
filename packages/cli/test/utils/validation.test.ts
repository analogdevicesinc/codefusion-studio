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

import {
  parsePackageReference,
  validatePackageName
} from '../../src/utils/package-manager.js';
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

/**
 * Feature: Package Reference Parsing
 *   As a CLI user
 *   I want clear error messages when I provide invalid package references
 *   so that I can understand what went wrong and how to fix it.
 */
describe('parsePackageReference', () => {
  describe('valid package references', () => {
    it('should parse a simple package reference', () => {
      const result = parsePackageReference('mypackage/1.0.0');
      expect(result).to.deep.equal({
        name: 'mypackage',
        version: '1.0.0'
      });
    });

    it('should parse a package reference with version ranges', () => {
      const result = parsePackageReference('mypackage/^1.0.0');
      expect(result).to.deep.equal({
        name: 'mypackage',
        version: '^1.0.0'
      });
    });
  });

  describe('invalid package references - package name only', () => {
    it('should throw helpful error when only package name is provided', () => {
      expect(() => parsePackageReference('mypackage')).to.throw(
        /Expecting a package reference, but only package name was provided/
      );
      expect(() => parsePackageReference('mypackage')).to.throw(
        /mypackage\/<version>/
      );
    });
  });

  describe('invalid package references - file paths', () => {
    it('should throw helpful error for Windows absolute path', () => {
      expect(() =>
        parsePackageReference('C:\\workdir\\trial\\manifest.json')
      ).to.throw(/File not found/);
      expect(() =>
        parsePackageReference('C:\\workdir\\trial\\manifest.json')
      ).to.throw(/A valid file path to a manifest file, or/);
    });

    it('should throw helpful error for Unix absolute path', () => {
      expect(() =>
        parsePackageReference('/tmp/manifest.json')
      ).to.throw(/File not found/);
    });

    it('should throw helpful error for .cfsdependencies', () => {
      expect(() =>
        parsePackageReference('C:\\workdir\\trial\\.cfsdependencies')
      ).to.throw(/File not found/);
      expect(() =>
        parsePackageReference('C:\\workdir\\trial\\.cfsdependencies')
      ).to.throw(/\.cfsdependencies/);
    });
  });

  describe('invalid package references - malformed format', () => {
    it('should throw generic error for truly invalid format', () => {
      expect(() =>
        parsePackageReference('not valid at all')
      ).to.throw(/Invalid package reference format/);
    });

    it('should throw generic error for empty string', () => {
      expect(() => parsePackageReference('')).to.throw(
        /Invalid package reference format/
      );
    });

    it('should throw generic error for package reference with trailing slash', () => {
      expect(() => parsePackageReference('mypackage/')).to.throw(
        /Invalid package reference format/
      );
      expect(() => parsePackageReference('mypackage/')).not.to.throw(
        /File not found/
      );
    });

    it('should throw generic error for package reference with spaces in version', () => {
      expect(() =>
        parsePackageReference('mypackage/bad version')
      ).to.throw(/Invalid package reference format/);
      expect(() =>
        parsePackageReference('mypackage/bad version')
      ).not.to.throw(/File not found/);
    });

    it('should throw generic error for string with .json but no path separator', () => {
      // Edge case: "my-package.json" without path separators should not be treated as a file
      expect(() => parsePackageReference('my-package.json')).to.throw(
        /Invalid package reference format/
      );
      expect(() =>
        parsePackageReference('my-package.json')
      ).not.to.throw(/File not found/);
    });
  });
});

/**
 * Feature: Package Name Validation
 *   As a CLI user
 *   I want validation for package names
 *   so that I know when I've provided invalid input.
 */
describe('validatePackageName', () => {
  describe('valid package names', () => {
    it('should accept a simple package name', () => {
      expect(() => validatePackageName('mypackage')).not.to.throw();
    });

    it('should accept a package name with hyphens', () => {
      expect(() => validatePackageName('my-package')).not.to.throw();
    });
  });

  describe('invalid package names', () => {
    it('should reject a full package reference (name/version)', () => {
      expect(() => validatePackageName('mypackage/1.0.0')).to.throw(
        /Expecting a package name, but a package reference was provided/
      );
    });

    it('should reject invalid characters', () => {
      expect(() => validatePackageName('my package')).to.throw(
        /Invalid package name/
      );
    });
  });
});

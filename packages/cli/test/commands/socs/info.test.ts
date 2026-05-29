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

import {parseJson} from '../../utils/parse-json.js';

/**
 * Feature: SoC Information Display
 *   As a developer using the CLI
 *   I want to view detailed information about SoCs in the catalog
 *   So that I can understand available cores, boards, packages, and documentation
 *
 * Background:
 *   Given the SoC catalog contains test data with generic SoCs
 *   And the catalog is available offline for testing
 */
describe('socs info', () => {
  describe('default output (no filter flags)', () => {
    // Scenario: Display complete SoC information
    //   Given I have a SoC named "TestChip100" in the catalog
    //   When I run "socs info TestChip100"
    //   Then I should see the SoC name, description, and family
    //   And I should see all cores, boards, and packages
    test
      .stdout()
      .command(['socs:info', 'TestChip100'], {root: '..'})
      .it(
        'displays SoC info with description, family, cores, boards, packages',
        (ctx) => {
          expect(ctx.stdout).to.contain('SoC: TestChip100');
          expect(ctx.stdout).to.contain(
            'Ultra-Low-Power Test Microcontroller'
          );
          expect(ctx.stdout).to.contain('Family: TestChipXXX');
          expect(ctx.stdout).to.contain('===== Cores =====');
          expect(ctx.stdout).to.contain('TestArch-v7');
          expect(ctx.stdout).to.contain('AI Compatible');
          expect(ctx.stdout).to.contain('===== Boards =====');
          // Verify board identifiers
          expect(ctx.stdout).to.contain('DevKit_V1');
          expect(ctx.stdout).to.contain('EVSYS');
          // Verify packages column header is present
          expect(ctx.stdout).to.contain('Identifier');
          expect(ctx.stdout).to.contain('Packages');
          expect(ctx.stdout).to.contain('Description');
          // Verify specific package names appear in boards section
          // DevKit_V1 should show PKG-A-20
          // EVSYS should show PKG-A-20, PKG-B-16
          const boardsSection = ctx.stdout
            .split('===== Boards =====')[1]
            .split('===== Packages =====')[0];
          expect(ctx.stdout).to.contain('===== Packages =====');
          expect(boardsSection).to.contain('CTBGA-PKG-A-20');
          expect(ctx.stdout).to.contain('CTBGA-PKG-B-16');
          expect(ctx.stdout).to.contain('===== Documentation =====');
        }
      );

    // Scenario: Case-insensitive SoC lookup (lowercase)
    //   Given I have a SoC named "TestChip100" in the catalog
    //   When I run "socs info testchip100" with lowercase name
    //   Then the command should find the SoC case-insensitively
    //   And display the correct SoC information
    test
      .stdout()
      .command(['socs:info', 'testchip100'], {root: '..'})
      .it(
        'performs case-insensitive lookup (lowercase input)',
        (ctx) => {
          expect(ctx.stdout).to.contain('SoC: TestChip100');
        }
      );

    // Scenario: Case-insensitive SoC lookup (uppercase)
    //   Given I have a SoC named "TestChip100" in the catalog
    //   When I run "socs info TESTCHIP100" with uppercase name
    //   Then the command should find the SoC case-insensitively
    //   And display the correct SoC information
    test
      .stdout()
      .command(['socs:info', 'TESTCHIP100'], {root: '..'})
      .it(
        'performs case-insensitive lookup (uppercase input)',
        (ctx) => {
          expect(ctx.stdout).to.contain('SoC: TestChip100');
        }
      );
  });

  describe('--boards flag', () => {
    // Scenario: Display only boards information
    //   Given I have a SoC with available boards
    //   When I run "socs info TestChip100 --boards"
    //   Then I should see only the boards section
    //   And I should not see cores or packages sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--boards'], {root: '..'})
      .it('displays only boards section with packages', (ctx) => {
        expect(ctx.stdout).to.contain('SoC: TestChip100');
        expect(ctx.stdout).to.contain('===== Boards =====');
        // Verify board identifiers
        expect(ctx.stdout).to.contain('DevKit_V1');
        expect(ctx.stdout).to.contain('EVSYS');
        // Verify table headers
        expect(ctx.stdout).to.contain('Identifier');
        expect(ctx.stdout).to.contain('Packages');
        expect(ctx.stdout).to.contain('Description');
        // Verify package names are resolved and displayed
        expect(ctx.stdout).to.contain('CTBGA-PKG-A-20');
        expect(ctx.stdout).to.contain('CTBGA-PKG-B-16');
        // Verify boards descriptions
        expect(ctx.stdout).to.contain('Development board');
        expect(ctx.stdout).to.contain('Evaluation system');
        // Verify other sections are not present
        expect(ctx.stdout).not.to.contain('===== Cores =====');
        expect(ctx.stdout).not.to.contain('===== Packages =====');
      });

    // Scenario: Handle SoC with no boards
    //   Given I have a SoC with no boards available
    //   When I run "socs info SampleProc300 --boards"
    //   Then I should see a message indicating no boards are available
    test
      .stdout()
      .command(['socs:info', 'SampleProc300', '--boards'], {
        root: '..'
      })
      .it('displays message when no boards available', (ctx) => {
        expect(ctx.stdout).to.contain('No boards available');
      });
  });

  describe('--packages flag', () => {
    // Scenario: Display only packages information
    //   Given I have a SoC with available packages
    //   When I run "socs info TestChip100 --packages"
    //   Then I should see only the packages section
    //   And I should not see cores or boards sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--packages'], {
        root: '..'
      })
      .it('displays only packages section', (ctx) => {
        expect(ctx.stdout).to.contain('SoC: TestChip100');
        expect(ctx.stdout).to.contain('===== Packages =====');
        expect(ctx.stdout).to.contain('CTBGA-PKG-A-20');
        expect(ctx.stdout).to.contain('CTBGA-PKG-B-16');
        expect(ctx.stdout).not.to.contain('===== Cores =====');
        expect(ctx.stdout).not.to.contain('===== Boards =====');
      });
  });

  describe('--cores flag', () => {
    // Scenario: Display only cores information
    //   Given I have a SoC with available cores
    //   When I run "socs info TestChip100 --cores"
    //   Then I should see only the cores section
    //   And I should not see boards or packages sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--cores'], {root: '..'})
      .it('displays only cores section', (ctx) => {
        expect(ctx.stdout).to.contain('SoC: TestChip100');
        expect(ctx.stdout).to.contain('===== Cores =====');
        expect(ctx.stdout).to.contain('TestArch-v7');
        expect(ctx.stdout).not.to.contain('===== Boards =====');
        expect(ctx.stdout).not.to.contain('===== Packages =====');
      });

    // Scenario: Display multiple cores with TrustZone information
    //   Given I have a SoC with multiple cores including TrustZone support
    //   When I run "socs info MockMCU200 --cores"
    //   Then I should see all cores listed
    //   And I should see TrustZone information for cores that support it
    test
      .stdout()
      .command(['socs:info', 'MockMCU200', '--cores'], {root: '..'})
      .it('displays multiple cores with TrustZone info', (ctx) => {
        expect(ctx.stdout).to.contain('Core1');
        expect(ctx.stdout).to.contain('Core2');
        expect(ctx.stdout).to.contain('No'); // TrustZone
      });
  });

  describe('--docs flag', () => {
    // Scenario: Display only documentation information
    //   Given I have a SoC with available documentation
    //   When I run "socs info TestChip100 --docs"
    //   Then I should see only the documentation section
    //   And I should not see cores, boards, or packages sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--docs'], {
        root: '..'
      })
      .it('displays only documentation section', (ctx) => {
        expect(ctx.stdout).to.contain('SoC: TestChip100');
        expect(ctx.stdout).to.contain('===== Documentation =====');
        expect(ctx.stdout).to.contain('TestChip100 Product Info');
        expect(ctx.stdout).to.contain('TestChip100 User Guide');
        expect(ctx.stdout).not.to.contain('===== Cores =====');
        expect(ctx.stdout).not.to.contain('===== Boards =====');
      });

    // Scenario: Handle SoC with no documentation
    //   Given I have a SoC with no documentation available
    //   When I run "socs info SampleProc300 --docs"
    //   Then I should see a message indicating no documentation is available
    test
      .stdout()
      .command(['socs:info', 'SampleProc300', '--docs'], {
        root: '..'
      })
      .it(
        'displays message when no documentation available',
        (ctx) => {
          expect(ctx.stdout).to.contain('No documentation available');
        }
      );
  });

  describe('flag combinations', () => {
    // Scenario: Display multiple sections using flag combinations
    //   Given I have a SoC with boards and cores
    //   When I run "socs info TestChip100 --boards --cores"
    //   Then I should see both boards and cores sections
    //   And I should not see packages or documentation sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--boards', '--cores'], {
        root: '..'
      })
      .it(
        'displays boards and cores when both flags provided',
        (ctx) => {
          expect(ctx.stdout).to.contain('===== Boards =====');
          expect(ctx.stdout).to.contain('===== Cores =====');
          expect(ctx.stdout).not.to.contain('===== Packages =====');
          expect(ctx.stdout).not.to.contain(
            '===== Documentation ====='
          );
        }
      );

    // Scenario: Display packages and documentation together
    //   Given I have a SoC with packages and documentation
    //   When I run "socs info TestChip100 --packages --docs"
    //   Then I should see both packages and documentation sections
    //   And I should not see boards or cores sections
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--packages', '--docs'], {
        root: '..'
      })
      .it(
        'displays packages and documentation when both flags provided',
        (ctx) => {
          expect(ctx.stdout).to.contain('===== Packages =====');
          expect(ctx.stdout).to.contain('===== Documentation =====');
          expect(ctx.stdout).not.to.contain('===== Boards =====');
          expect(ctx.stdout).not.to.contain('===== Cores =====');
        }
      );
  });

  describe('--format=json flag', () => {
    // Scenario: Output SoC information in JSON format
    //   Given I have a SoC in the catalog
    //   When I run "socs info TestChip100 --format=json"
    //   Then the output should be valid JSON
    //   And it should contain all default fields (name, description, family, cores, boards, packages)
    //   And internal properties should be filtered out (id, socID, accessTag)
    test
      .stdout()
      .command(['socs:info', 'TestChip100', '--format=json'], {
        root: '..'
      })
      .it('outputs valid JSON with default fields', (ctx) => {
        const output = parseJson(ctx.stdout);
        expect(output).to.be.an('object');
        expect(output.name).to.equal('TestChip100');
        expect(output.description).to.contain('Ultra-Low-Power');
        expect(output.familyName).to.equal('TestChipXXX');
        expect(output.cores).to.be.an('array');
        expect(output.boards).to.be.an('array');
        expect(output.packages).to.be.an('array');
        // Verify internal properties are filtered out
        expect(output.id).to.be.undefined;
        expect(output.accessTag).to.be.undefined;
        if (output.boards.length > 0) {
          expect(output.boards[0].id).to.be.undefined;
          expect(output.boards[0].socID).to.be.undefined;
          expect(output.boards[0].accessTag).to.be.undefined;
          expect(output.boards[0].packageIDs).to.be.undefined;
          // Verify packages property is present and properly formatted
          expect(output.boards[0].packages).to.be.an('array');
          expect(output.boards[0].identifier).to.be.a('string');
          expect(output.boards[0].description).to.be.a('string');
          // Verify specific board package mappings
          // DevKit_V1 should have CTBGA-PKG-A-20
          const devkit = output.boards.find(
            (b: any) => b.identifier === 'DevKit_V1'
          );
          expect(devkit).to.exist;
          expect(devkit.packages).to.include('CTBGA-PKG-A-20');
          expect(devkit.packages.length).to.equal(1);
          // EVSYS should have both CTBGA-PKG-A-20 and CTBGA-PKG-B-16
          const evsys = output.boards.find(
            (b: any) => b.identifier === 'EVSYS'
          );
          expect(evsys).to.exist;
          expect(evsys.packages).to.include('CTBGA-PKG-A-20');
          expect(evsys.packages).to.include('CTBGA-PKG-B-16');
          expect(evsys.packages.length).to.equal(2);
        }
        if (output.cores.length > 0) {
          expect(output.cores[0].id).to.be.undefined;
          expect(output.cores[0].socID).to.be.undefined;
          expect(output.cores[0].accessTag).to.be.undefined;
          expect(output.cores[0].coreType?.id).to.be.undefined;
          expect(output.cores[0].aiCompatible).to.be.true;
        }
        if (output.packages.length > 0) {
          expect(output.packages[0].id).to.be.undefined;
          expect(output.packages[0].socID).to.be.undefined;
          expect(output.packages[0].accessTag).to.be.undefined;
        }
      });

    // Scenario: Output filtered JSON with only boards
    //   Given I have a SoC with boards
    //   When I run "socs info TestChip100 --boards --format=json"
    //   Then the JSON output should only contain boards data
    //   And it should not include cores or packages
    //   And internal properties should be filtered out
    test
      .stdout()
      .command(
        ['socs:info', 'TestChip100', '--boards', '--format=json'],
        {
          root: '..'
        }
      )
      .it(
        'outputs JSON with boards including resolved packages',
        (ctx) => {
          const output = parseJson(ctx.stdout);
          expect(output).to.be.an('object');
          expect(output.name).to.equal('TestChip100');
          expect(output.boards).to.be.an('array');
          expect(output.boards.length).to.equal(2);
          expect(output.cores).to.be.undefined;
          expect(output.packages).to.be.undefined;
          // Verify internal properties are filtered from boards
          expect(output.boards[0].id).to.be.undefined;
          expect(output.boards[0].socID).to.be.undefined;
          expect(output.boards[0].accessTag).to.be.undefined;
          expect(output.boards[0].packageIDs).to.be.undefined;
          // Verify expected properties are present
          expect(output.boards[0].identifier).to.be.a('string');
          expect(output.boards[0].description).to.be.a('string');
          expect(output.boards[0].packages).to.be.an('array');
          // Verify specific board-package associations
          const devkit = output.boards.find(
            (b: any) => b.identifier === 'DevKit_V1'
          );
          expect(devkit).to.exist;
          expect(devkit.identifier).to.equal('DevKit_V1');
          expect(devkit.packages).to.be.an('array');
          expect(devkit.packages).to.include('CTBGA-PKG-A-20');
          expect(devkit.description).to.contain('Development board');
          const evsys = output.boards.find(
            (b: any) => b.identifier === 'EVSYS'
          );
          expect(evsys).to.exist;
          expect(evsys.identifier).to.equal('EVSYS');
          expect(evsys.packages).to.be.an('array');
          expect(evsys.packages).to.have.lengthOf(2);
          expect(evsys.packages).to.include.members([
            'CTBGA-PKG-A-20',
            'CTBGA-PKG-B-16'
          ]);
          expect(evsys.description).to.contain('Evaluation system');
        }
      );

    // Scenario: Output JSON with multiple cores
    //   Given I have a SoC with multiple cores
    //   When I run "socs info MockMCU200 --cores --format=json"
    //   Then the JSON output should contain an array of cores
    //   And each core should have its details properly formatted
    //   And internal properties should be filtered out
    test
      .stdout()
      .command(
        ['socs:info', 'MockMCU200', '--cores', '--format=json'],
        {
          root: '..'
        }
      )
      .it('outputs JSON with multiple cores', (ctx) => {
        const output = parseJson(ctx.stdout);
        expect(output.cores).to.be.an('array');
        expect(output.cores.length).to.equal(2);
        // Verify internal properties are filtered from cores
        expect(output.cores[0].id).to.be.undefined;
        expect(output.cores[0].socID).to.be.undefined;
        expect(output.cores[0].accessTag).to.be.undefined;
        expect(output.cores[0].coreType.id).to.be.undefined;
        expect(output.cores[0].coreType.description).to.be.undefined;
        // Verify expected properties are present
        expect(output.cores[0].coreType.architecture).to.be.a(
          'string'
        );
        expect(output.cores[0].coreType.isa).to.be.a('string');
      });
  });

  describe('error handling', () => {
    // Scenario: Handle request for non-existent SoC
    //   Given the catalog does not contain a SoC named "NonExistentSoC"
    //   When I run "socs info NonExistentSoC"
    //   Then the command should fail with an error
    //   And the error message should indicate the SoC was not found
    test
      .stderr()
      .command(['socs:info', 'NonExistentSoC'], {root: '..'})
      .catch((error) => {
        expect(error.message).to.contain(
          "SoC 'NonExistentSoC' not found"
        );
      })
      .it('shows error for unknown SoC');
  });

  describe('command alias', () => {
    // Scenario: Use command with alias
    //   Given the command has an alias "soc:info"
    //   When I run "soc info TestChip100" using the alias
    //   Then it should work exactly like "socs info"
    //   And display the correct SoC information
    test
      .stdout()
      .command(['soc:info', 'TestChip100'], {root: '..'})
      .it('works with soc:info alias', (ctx) => {
        expect(ctx.stdout).to.contain('SoC: TestChip100');
      });
  });
});

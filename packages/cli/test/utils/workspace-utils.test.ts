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
import {mkdirSync, existsSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveWorkspaceFolders} from '../../src/utils/workspace-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Feature: Workspace Folder Resolution
 *   As a CLI user
 *   I want task discovery to work with multi-project workspaces
 *   So that I can run tasks from individual projects in a CFS workspace
 *
 * Background:
 *   Given the CLI needs to discover tasks from CFS workspaces
 *   And multi-project workspaces contain multiple projects in subdirectories
 *   And project structure is defined in .cfs/*.cfsconfig file
 */
describe('workspace-utils', () => {
  describe('resolveWorkspaceFolders', () => {
    // Scenario: Single-project workspace without .cfsconfig
    //   Given a workspace with no .cfs directory
    //   When resolving workspace folders
    //   Then return the workspace root path
    it('returns workspace root for single-project workspace', () => {
      const workspacePath = resolve(__dirname, '../fixtures/socs');
      const folders = resolveWorkspaceFolders(workspacePath);

      expect(folders).to.be.an('array').with.lengthOf(1);
      expect(folders[0]).to.equal(workspacePath);
    });

    // Scenario: Multi-project workspace with valid .cfsconfig
    //   Given a workspace with .cfs/*.cfsconfig file
    //   And .cfsconfig contains Projects with PlatformConfig.ProjectName
    //   When resolving workspace folders
    //   Then return array of project folder paths
    it('returns project folders for multi-project workspace', () => {
      const fixturesDir = resolve(__dirname, '../fixtures');
      const workspacePath = join(
        fixturesDir,
        'multi-project-workspace'
      );

      // Create test workspace structure
      try {
        mkdirSync(workspacePath, {recursive: true});
        mkdirSync(join(workspacePath, '.cfs'), {
          recursive: true
        });
        mkdirSync(join(workspacePath, 'project1'), {
          recursive: true
        });
        mkdirSync(join(workspacePath, 'project2'), {
          recursive: true
        });

        // Create .cfsconfig with two projects
        const cfsconfig = {
          Soc: 'TestChip100',
          Package: 'TQFN',
          Projects: [
            {
              CoreId: 'CM4',
              ProjectId: 'CM4',
              FirmwarePlatform: 'MSDK',
              PlatformConfig: {
                ProjectName: 'project1'
              },
              Partitions: [],
              Peripherals: []
            },
            {
              CoreId: 'RV',
              ProjectId: 'RV',
              FirmwarePlatform: 'MSDK',
              PlatformConfig: {
                ProjectName: 'project2'
              },
              Partitions: [],
              Peripherals: []
            }
          ]
        };

        writeFileSync(
          join(workspacePath, '.cfs', 'test.cfsconfig'),
          JSON.stringify(cfsconfig, null, 2)
        );

        const folders = resolveWorkspaceFolders(workspacePath);

        expect(folders).to.be.an('array').with.lengthOf(2);
        expect(folders[0]).to.equal(join(workspacePath, 'project1'));
        expect(folders[1]).to.equal(join(workspacePath, 'project2'));
      } finally {
        // Clean up test workspace
        if (existsSync(workspacePath)) {
          rmSync(workspacePath, {recursive: true, force: true});
        }
      }
    });

    // Scenario: Multi-project workspace with missing project directories
    //   Given a workspace with .cfsconfig defining projects
    //   But some project directories don't exist
    //   When resolving workspace folders
    //   Then return only existing project folders
    it('returns only existing project folders', () => {
      const fixturesDir = resolve(__dirname, '../fixtures');
      const workspacePath = join(
        fixturesDir,
        'partial-project-workspace'
      );

      try {
        mkdirSync(workspacePath, {recursive: true});
        mkdirSync(join(workspacePath, '.cfs'), {
          recursive: true
        });
        // Only create project1, not project2
        mkdirSync(join(workspacePath, 'project1'), {
          recursive: true
        });

        const cfsconfig = {
          Soc: 'TestChip100',
          Package: 'TQFN',
          Projects: [
            {
              CoreId: 'CM4',
              ProjectId: 'CM4',
              FirmwarePlatform: 'MSDK',
              PlatformConfig: {
                ProjectName: 'project1'
              },
              Partitions: [],
              Peripherals: []
            },
            {
              CoreId: 'RV',
              ProjectId: 'RV',
              FirmwarePlatform: 'MSDK',
              PlatformConfig: {
                ProjectName: 'project2'
              },
              Partitions: [],
              Peripherals: []
            }
          ]
        };

        writeFileSync(
          join(workspacePath, '.cfs', 'test.cfsconfig'),
          JSON.stringify(cfsconfig, null, 2)
        );

        const folders = resolveWorkspaceFolders(workspacePath);

        expect(folders).to.be.an('array').with.lengthOf(1);
        expect(folders[0]).to.equal(join(workspacePath, 'project1'));
      } finally {
        if (existsSync(workspacePath)) {
          rmSync(workspacePath, {recursive: true, force: true});
        }
      }
    });

    // Scenario: .cfsconfig with invalid JSON
    //   Given a workspace with malformed .cfsconfig file
    //   When resolving workspace folders
    //   Then return workspace root as fallback
    it('returns workspace root for invalid .cfsconfig', () => {
      const fixturesDir = resolve(__dirname, '../fixtures');
      const workspacePath = join(
        fixturesDir,
        'invalid-config-workspace'
      );

      try {
        mkdirSync(workspacePath, {recursive: true});
        mkdirSync(join(workspacePath, '.cfs'), {
          recursive: true
        });

        // Write invalid JSON
        writeFileSync(
          join(workspacePath, '.cfs', 'test.cfsconfig'),
          '{invalid json'
        );

        const folders = resolveWorkspaceFolders(workspacePath);

        expect(folders).to.be.an('array').with.lengthOf(1);
        expect(folders[0]).to.equal(workspacePath);
      } finally {
        if (existsSync(workspacePath)) {
          rmSync(workspacePath, {recursive: true, force: true});
        }
      }
    });

    // Scenario: .cfsconfig with no Projects array
    //   Given a workspace with .cfsconfig lacking Projects field
    //   When resolving workspace folders
    //   Then return workspace root
    it('returns workspace root when .cfsconfig has no Projects', () => {
      const fixturesDir = resolve(__dirname, '../fixtures');
      const workspacePath = join(
        fixturesDir,
        'no-projects-workspace'
      );

      try {
        mkdirSync(workspacePath, {recursive: true});
        mkdirSync(join(workspacePath, '.cfs'), {
          recursive: true
        });

        const cfsconfig = {
          Soc: 'TestChip100',
          Package: 'TQFN',
          Projects: []
        };

        writeFileSync(
          join(workspacePath, '.cfs', 'test.cfsconfig'),
          JSON.stringify(cfsconfig, null, 2)
        );

        const folders = resolveWorkspaceFolders(workspacePath);

        expect(folders).to.be.an('array').with.lengthOf(1);
        expect(folders[0]).to.equal(workspacePath);
      } finally {
        if (existsSync(workspacePath)) {
          rmSync(workspacePath, {recursive: true, force: true});
        }
      }
    });

    // Scenario: Project without ProjectName uses ProjectId
    //   Given a project with no PlatformConfig.ProjectName
    //   When resolving workspace folders
    //   Then fall back to ProjectId
    it('uses ProjectId when ProjectName is missing', () => {
      const fixturesDir = resolve(__dirname, '../fixtures');
      const workspacePath = join(
        fixturesDir,
        'projectid-fallback-workspace'
      );

      try {
        mkdirSync(workspacePath, {recursive: true});
        mkdirSync(join(workspacePath, '.cfs'), {
          recursive: true
        });
        mkdirSync(join(workspacePath, 'CM4'), {
          recursive: true
        });

        const cfsconfig = {
          Soc: 'TestChip100',
          Package: 'TQFN',
          Projects: [
            {
              CoreId: 'CM4',
              ProjectId: 'CM4',
              FirmwarePlatform: 'MSDK',
              PlatformConfig: {},
              Partitions: [],
              Peripherals: []
            }
          ]
        };

        writeFileSync(
          join(workspacePath, '.cfs', 'test.cfsconfig'),
          JSON.stringify(cfsconfig, null, 2)
        );

        const folders = resolveWorkspaceFolders(workspacePath);

        expect(folders).to.be.an('array').with.lengthOf(1);
        expect(folders[0]).to.equal(join(workspacePath, 'CM4'));
      } finally {
        if (existsSync(workspacePath)) {
          rmSync(workspacePath, {recursive: true, force: true});
        }
      }
    });
  });
});

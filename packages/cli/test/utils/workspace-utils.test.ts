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
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';

import {
  findWorkspaceDependencyManifests,
  findWorkspaceRoot,
  getValidTemplate
} from '../../src/utils/workspace-utils.js';
import {getCfsConfig} from '../../src/utils/utils.js';

describe('workspace-utils', () => {
  describe('findWorkspaceRoot', () => {
    let workspacePath: string;

    beforeEach(() => {
      workspacePath = mkdtempSync(
        join(tmpdir(), 'cfs-workspace-utils-')
      );
      mkdirSync(join(workspacePath, '.cfs'), {recursive: true});
      writeFileSync(
        join(workspacePath, '.cfs', '.cfsworkspace'),
        '{}'
      );
    });

    afterEach(() => {
      rmSync(workspacePath, {recursive: true, force: true});
    });

    it('returns the workspace root from the root itself', () => {
      expect(findWorkspaceRoot(workspacePath)).to.equal(
        workspacePath
      );
    });

    it('returns the nearest workspace root from a nested project path', () => {
      const projectPath = join(workspacePath, 'project', 'source');
      mkdirSync(projectPath, {recursive: true});

      expect(findWorkspaceRoot(projectPath)).to.equal(workspacePath);
    });

    it('returns the nearest root when nested workspaces exist', () => {
      const nestedWorkspacePath = join(
        workspacePath,
        'nested-workspace'
      );
      const nestedProjectPath = join(
        nestedWorkspacePath,
        'project',
        'source'
      );
      mkdirSync(join(nestedWorkspacePath, '.cfs'), {
        recursive: true
      });
      writeFileSync(
        join(nestedWorkspacePath, '.cfs', '.cfsworkspace'),
        '{}'
      );
      mkdirSync(nestedProjectPath, {recursive: true});

      expect(findWorkspaceRoot(nestedProjectPath)).to.equal(
        nestedWorkspacePath
      );
    });

    it('returns the workspace root from a file within a nested project path', () => {
      const filePath = join(
        workspacePath,
        'project',
        'source',
        'main.c'
      );
      mkdirSync(dirname(filePath), {recursive: true});
      writeFileSync(filePath, '');

      expect(findWorkspaceRoot(filePath)).to.equal(workspacePath);
    });

    it('returns undefined when no workspace exists before the filesystem root', () => {
      const outsidePath = mkdtempSync(
        join(tmpdir(), 'cfs-outside-workspace-')
      );

      try {
        expect(findWorkspaceRoot(outsidePath)).to.be.undefined;
      } finally {
        rmSync(outsidePath, {recursive: true, force: true});
      }
    });

    it('does not treat a bare .cfs directory as a workspace', () => {
      const markerPath = join(workspacePath, '.cfs', '.cfsworkspace');
      rmSync(markerPath);

      expect(findWorkspaceRoot(workspacePath)).to.be.undefined;
    });
  });

  describe('findWorkspaceDependencyManifests', () => {
    let workspacePath: string;

    beforeEach(() => {
      workspacePath = mkdtempSync(
        join(tmpdir(), 'cfs-workspace-manifest-')
      );
      mkdirSync(join(workspacePath, '.cfs'), {recursive: true});
      writeFileSync(
        join(workspacePath, '.cfs', '.cfsworkspace'),
        '{}'
      );
    });

    afterEach(() => {
      rmSync(workspacePath, {recursive: true, force: true});
    });

    it('returns the shared manifest from a nested project path', () => {
      const manifestPath = join(
        workspacePath,
        '.cfs',
        '.cfsdependencies'
      );
      const projectPath = join(workspacePath, 'project');
      mkdirSync(projectPath);
      writeFileSync(manifestPath, '{"version": 1, "packages": []}');

      expect(
        findWorkspaceDependencyManifests(projectPath)
      ).to.deep.equal([manifestPath]);
    });

    it('returns an empty list for a workspace without manifests', () => {
      expect(findWorkspaceDependencyManifests(workspacePath)).to.be
        .empty;
    });

    it('returns an empty list when no CFS workspace contains the input path', () => {
      const outsidePath = mkdtempSync(
        join(tmpdir(), 'cfs-outside-workspace-')
      );

      try {
        expect(findWorkspaceDependencyManifests(outsidePath)).to.be
          .empty;
      } finally {
        rmSync(outsidePath, {recursive: true, force: true});
      }
    });
  });

  describe('getCfsConfig', () => {
    let workspacePath: string;

    beforeEach(() => {
      workspacePath = mkdtempSync(
        join(tmpdir(), 'cfs-workspace-config-')
      );
      mkdirSync(join(workspacePath, '.cfs'), {recursive: true});
      mkdirSync(join(workspacePath, 'project', 'source'), {
        recursive: true
      });
      writeFileSync(
        join(workspacePath, '.cfs', '.cfsworkspace'),
        JSON.stringify({Soc: 'test-soc', Package: 'test-package'})
      );
      writeFileSync(
        join(
          workspacePath,
          '.cfs',
          'test-soc-test-package.cfsconfig'
        ),
        JSON.stringify({Projects: []})
      );
    });

    afterEach(() => {
      rmSync(workspacePath, {recursive: true, force: true});
    });

    it('resolves configuration from a nested project path', () => {
      const result = getCfsConfig(
        join(workspacePath, 'project', 'source')
      );

      expect(result.pathToConfig).to.equal(
        join(workspacePath, '.cfs', 'test-soc-test-package.cfsconfig')
      );
      expect(result.config).to.deep.equal({Projects: []});
    });
  });

  describe('getValidTemplate', () => {
    it('returns older compatible version when newer version targets a different package', async () => {
      const mockPluginManager = {
        getPluginsInfoList: async () => [
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v1',
            pluginVersion: '1.0.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'APARD',
                package: 'WLP',
                cores: ['CM4']
              }
            ],
            features: {}
          },
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v2',
            pluginVersion: '2.0.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'EvKit_V1',
                package: 'TQFN',
                cores: ['CM4']
              }
            ],
            features: {}
          }
        ]
      } as any;

      const errors: string[] = [];
      const result = await getValidTemplate(
        {
          soc: 'MAX32690',
          board: 'APARD',
          package: 'WLP',
          'template-id': 'com.test.plugin',
          core: 'CM4'
        },
        mockPluginManager,
        errors
      );

      expect(errors).to.have.lengthOf(0);
      expect(result).to.not.be.undefined;
      expect(result?.pluginVersion).to.equal('1.0.0');
    });

    it('returns newest compatible version when multiple match', async () => {
      const mockPluginManager = {
        getPluginsInfoList: async () => [
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v1',
            pluginVersion: '1.0.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'APARD',
                package: 'WLP',
                cores: ['CM4']
              }
            ],
            features: {}
          },
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v1.1',
            pluginVersion: '1.1.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'APARD',
                package: 'WLP',
                cores: ['CM4']
              }
            ],
            features: {}
          },
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v2',
            pluginVersion: '2.0.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'APARD2',
                package: 'WLP',
                cores: ['CM4']
              }
            ],
            features: {}
          }
        ]
      } as any;

      const errors: string[] = [];
      const result = await getValidTemplate(
        {
          soc: 'MAX32690',
          board: 'APARD',
          package: 'WLP',
          'template-id': 'com.test.plugin',
          core: 'CM4'
        },
        mockPluginManager,
        errors
      );

      expect(errors).to.have.lengthOf(0);
      expect(result).to.not.be.undefined;
      expect(result?.pluginVersion).to.equal('1.1.0');
    });

    it('reports error when no version is compatible', async () => {
      const mockPluginManager = {
        getPluginsInfoList: async () => [
          {
            pluginId: 'com.test.plugin',
            pluginName: 'Test Plugin v2',
            pluginVersion: '2.0.0',
            supportedSocs: [
              {
                name: 'MAX32690',
                board: 'EvKit_V1',
                package: 'TQFN',
                cores: ['CM4']
              }
            ],
            features: {}
          }
        ]
      } as any;

      const errors: string[] = [];
      const result = await getValidTemplate(
        {
          soc: 'MAX32690',
          board: 'EvKit_V1',
          package: 'WLP',
          'template-id': 'com.test.plugin',
          core: 'CM4'
        },
        mockPluginManager,
        errors
      );

      expect(result).to.be.undefined;
      expect(errors).to.have.lengthOf(1);
    });
  });
});

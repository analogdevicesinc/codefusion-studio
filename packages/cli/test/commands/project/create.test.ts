import {test, expect} from '@oclif/test';
import type {CfsWorkspace} from 'cfs-lib';
import fs, {promises as fsp} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CFS_DATA_MODELS_PATH,
  CFS_PLUGINS_PATH
} from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('project:create', () => {
  const pluginsPath = path.resolve(__dirname, '..', CFS_PLUGINS_PATH);
  const dataModelsPath = path.resolve(
    __dirname,
    CFS_DATA_MODELS_PATH
  );
  const workspacePath = path.resolve(
    __dirname,
    'sample.cfsworkspace'
  );

  let workspace: CfsWorkspace;
  let workspaceFolder: string;
  const invalidProject = 'invalid-test-project';

  before(async () => {
    try {
      const fileContent = fs.readFileSync(workspacePath, 'utf8');
      workspace = JSON.parse(fileContent) as CfsWorkspace;
      workspaceFolder = `${workspace.location}/${workspace.workspaceName}/.cfs`;
      await fsp.mkdir(workspaceFolder, {recursive: true});
    } catch (error) {
      console.log('Error before tests', error);
      throw error;
    }
  });

  after(async () => {
    try {
      fs.rmSync(workspace.location, {
        recursive: true,
        force: true
      });
    } catch (error) {
      console.log('Error inside test after', error);
      throw error;
    }
  });

  test
    .stderr()
    .command(
      [
        'project:create',
        '--workspace-file-path',
        workspacePath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath,
        '--project-name',
        'test-project'
      ],
      {
        root: '..'
      }
    )
    .it('should create the projects', (ctx) => {
      expect(ctx.stderr, 'stderr should be empty').to.be.empty;

      expect(
        fs.statSync(workspace.location).isDirectory(),
        'workspace.location should be created'
      ).to.be.true;

      if (workspaceFolder) {
        expect(
          fs.statSync(workspaceFolder).isDirectory(),
          'workspaceFolder should be created'
        ).to.be.true;

        if (Array.isArray(workspace.projects)) {
          for (const project of workspace.projects) {
            const projectFolder = path.join(
              path.resolve(workspace.location),
              workspace.workspaceName,
              project.name || ''
            );
            expect(
              fs.statSync(projectFolder).isDirectory(),
              'project folder should exist inside workspace folder'
            ).to.be.true;
          }
        }
      }
    });

  test
    .stderr({print: true})
    .command(
      [
        'project:create',
        '--workspace-file-path',
        workspacePath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath,
        '--project-name',
        invalidProject
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.include(
        `Project: ${invalidProject} was not found in the workspace projects list`
      );
    })
    .it('should throw an error if invalid project name is provided');
});

import {test, expect} from '@oclif/test';
import {CfsWorkspace} from 'cfs-plugins-api';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('workspace:create', () => {
  let cfsworkspace: CfsWorkspace;
  const pluginsPath = path.resolve(__dirname, '../utils/plugins');
  const workspacePath = path.resolve(
    __dirname,
    'sample.cfsworkspace'
  );

  before(async () => {
    try {
      cfsworkspace = JSON.parse(
        fs.readFileSync(workspacePath, 'utf8')
      );
    } catch (error) {
      console.log('Error inside test before', error);
      throw error;
    }
  });

  after(async () => {
    try {
      fs.rmSync(
        path.resolve(__dirname, path.basename(cfsworkspace.location)),
        {
          recursive: true,
          force: true
        }
      );
    } catch (error) {
      console.log('Error inside test after', error);
      throw error;
    }
  });

  test
    .stderr({print: true})
    .command(
      [
        'workspace:create',
        '--workspace-file-path',
        workspacePath,
        '--search-path',
        pluginsPath
      ],
      {
        root: '..'
      }
    )
    .it('should create a workspace', (ctx) => {
      expect(ctx.stderr, 'stderr should be empty').to.be.empty;
      expect(fs.statSync(cfsworkspace.location).isDirectory()).to.be
        .true;
    });
});

import {expect, test} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('cfsplugins list', () => {
  const pluginsPath = path.resolve(__dirname, '../utils/plugins/');

  test
    .stdout()
    .command(['cfsplugins:list', '-s', pluginsPath], {root: '..'})
    .it('should list available plugins', (ctx) => {
      expect(ctx.stdout, 'stdout should contain plugins information')
        .to.not.to.be.empty;
    });

  test
    .stdout()
    .command(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--search-path',
        pluginsPath,
        '-s',
        '/somepath'
      ],
      {root: '..'}
    )
    .it(
      'should list available plugins by providing multiple plugin paths',
      (ctx) => {
        expect(
          ctx.stdout,
          'stdout should contain plugins information'
        ).to.not.to.be.empty;
      }
    );
});

import {expect, test} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CFS_PLUGINS_PATH} from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('cfsplugins list', () => {
  const pluginsPath = path.resolve(__dirname, '..', CFS_PLUGINS_PATH);

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

  test
    .stdout()
    .command(
      ['cfsplugins:list', '-s', pluginsPath, '--soc', 'MAX32690'],
      {root: '..'}
    )
    .it('should filter plugins by SoC', (ctx) => {
      expect(
        ctx.stdout,
        'stdout should contain filtered plugins information'
      ).to.not.to.be.empty;
    });

  test
    .stdout()
    .command(
      ['cfsplugins:list', '-s', pluginsPath, '--board', 'EvKit_V1'],
      {root: '..'}
    )
    .it('should filter plugins by board', (ctx) => {
      expect(
        ctx.stdout,
        'stdout should contain filtered plugins information'
      ).to.not.to.be.empty;
    });

  test
    .stdout()
    .command(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--service',
        'workspace'
      ],
      {root: '..'}
    )
    .it('should filter plugins by service', (ctx) => {
      expect(
        ctx.stdout,
        'stdout should contain filtered plugins information'
      ).to.not.to.be.empty;
    });

  test
    .stdout()
    .command(
      ['cfsplugins:list', '-s', pluginsPath, '--config-options'],
      {root: '..'}
    )
    .it('should show configuration options when requested', (ctx) => {
      expect(
        ctx.stdout,
        'stdout should contain plugins with config options'
      ).to.not.to.be.empty;
    });

  test
    .stdout()
    .command(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--soc',
        'MAX32690',
        '--board',
        'EvKit_V1'
      ],
      {root: '..'}
    )
    .it('should filter plugins by multiple criteria', (ctx) => {
      expect(
        ctx.stdout,
        'stdout should contain filtered plugins information'
      ).to.not.to.be.empty;
    });
});

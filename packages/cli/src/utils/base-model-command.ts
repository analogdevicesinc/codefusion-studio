import {Flags} from '@oclif/core';
import {readJsonFile} from 'cfs-lib';
import {CfsConfig} from 'cfs-types';
import {promises as fs} from 'node:fs';
import path from 'node:path';

import {BaseCommand} from './base-command.js';
import {RecoverableError} from './recoverable-error.js';
import {getCfsConfig} from './utils.js';

export abstract class BaseModelCommand extends BaseCommand<
  typeof BaseModelCommand
> {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    workspace: Flags.string({
      char: 'w',
      summary: 'Path to workspace',
      required: false
    }),
    config: Flags.string({
      summary: 'Path to .cfsconfig file',
      required: false
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target Core',
      required: false
    })
  };

  protected getConfig(configPath?: string, workspacePath?: string) {
    if (!configPath && !workspacePath) {
      throw new RecoverableError(
        '--config or --workspace must be provided',
        {
          suggestion:
            'Provide either a path to a .cfsconfig file or a CodeFusion Studio workspace directory'
        }
      );
    }

    if (configPath && workspacePath) {
      this.warn('--workspace is ignored when --config is provided.');
    }

    if (configPath) {
      const config = readJsonFile(configPath) as CfsConfig;
      return {config, pathToConfig: configPath};
    }

    return getCfsConfig(workspacePath);
  }

  protected getModelNameFromFilename(filename: string) {
    try {
      // If it's a URL, parse it
      const url = new URL(filename);
      return path.basename(url.pathname, path.extname(url.pathname));
    } catch {
      // Not a URL → treat as local path
      return path.basename(filename, path.extname(filename));
    }
  }

  protected getModelNamesFromConfig(config: CfsConfig): string[] {
    return config.Projects.flatMap(
      (project) =>
        project.AIModels?.map((aiModel) => aiModel.Name) ?? []
    );
  }

  protected async writeCfsConfig(
    configPath: string,
    config: CfsConfig
  ) {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}

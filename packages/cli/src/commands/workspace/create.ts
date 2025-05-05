import {Command, Flags} from '@oclif/core';
import {CfsWorkspace} from 'cfs-lib';
import fs from 'node:fs';
import path from 'node:path';

import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  lowercaseFirstLetterProps,
  readJsonFile
} from '../../utils/utils.js';

export default class WorkspaceCreate extends Command {
  static description =
    'Generates a workspace based on a configuration file.';

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Specify additional directory paths to search for plugins and data models. Can be used multiple times.',
      multiple: true
    }),
    'workspace-file-path': Flags.string({
      char: 'w',
      required: true,
      summary: '.cfsworkspace file path'
    })
  };

  checkIfFileExists(filename: string | undefined) {
    if (!filename) {
      this.log('Provided filename is undefined.');
      return false;
    }

    const filepath = path.isAbsolute(filename)
      ? filename
      : path.resolve(process.cwd(), filename);

    return fs.existsSync(filepath);
  }

  async run() {
    const {flags} = await this.parse(WorkspaceCreate);
    const cfsWorkspaceFile = flags['workspace-file-path'];

    if (!this.checkIfFileExists(cfsWorkspaceFile)) {
      this.error(
        `Workspace file: ${cfsWorkspaceFile} does not exist.`
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      readJsonFile(cfsWorkspaceFile)
    ) as CfsWorkspace;

    const formattedProjects =
      cfsWorkspace.projects?.map((project) => ({
        ...lowercaseFirstLetterProps(project)
      })) ?? [];

    cfsWorkspace.projects = formattedProjects;

    const pluginManager = getPluginManager(flags['search-path']);

    await pluginManager.generateWorkspace(cfsWorkspace);
  }
}

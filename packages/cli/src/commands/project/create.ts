import {Command, Flags} from '@oclif/core';
import {CfsWorkspace} from 'cfs-lib';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {getPluginManager} from '../../utils/plugin-manager.js';
import {
  checkIfFileExists,
  lowercaseFirstLetterProps,
  readJsonFile
} from '../../utils/utils.js';

export default class ProjectCreate extends Command {
  static description = 'Generates the project';

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
    }),
    'project-name': Flags.string({
      char: 'p',
      required: true,
      summary:
        'Name of the project to be generated as found in the workspace file.'
    })
  };

  async run() {
    const {flags} = await this.parse(ProjectCreate);
    const cfsWorkspaceFile = flags['workspace-file-path'];
    const projectName = flags['project-name'];

    if (!checkIfFileExists(cfsWorkspaceFile)) {
      this.error(
        `Workspace file: ${cfsWorkspaceFile} does not exist.`
      );
    }

    const cfsWorkspace = lowercaseFirstLetterProps(
      readJsonFile(cfsWorkspaceFile)
    ) as CfsWorkspace;

    const formattedProjects =
      cfsWorkspace.projects?.map((project) => ({
        ...lowercaseFirstLetterProps(project),
        soc: cfsWorkspace.soc
      })) ?? [];

    cfsWorkspace.projects = formattedProjects;

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager
    );

    const pluginManager = getPluginManager(
      flags['search-path'],
      packageManager,
      dmManager
    );

    await pluginManager.generateProject(cfsWorkspace, projectName);
  }
}

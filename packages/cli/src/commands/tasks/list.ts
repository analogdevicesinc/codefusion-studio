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
import {Command, Flags} from '@oclif/core';

import type {CliConfig} from '../../types/cli-config.js';

import {CliTaskProvider} from '../../providers/cli-task-provider.js';
import {readUserConfig} from '../../utils/utils.js';

export default class List extends Command {
  static description = 'List tasks for a named workspace';

  static flags = {
    workspace: Flags.string({
      char: 'w',
      summary: 'The workspace for which tasks should be listed',
      required: false,
      default: process.cwd()
    }),
    project: Flags.string({
      char: 'p',
      summary: 'The project for which tasks should be listed',
      required: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Also display the command associated with each task',
      required: false,
      default: false
    })
  };

  public async run(): Promise<void> {
    const {flags} = await this.parse(List);

    // Load user config
    const userConfig = readUserConfig(this.config) as
      | CliConfig
      | undefined;

    // Create task provider with infrastructure
    const taskProvider = new CliTaskProvider(
      flags.workspace ?? process.cwd(),
      undefined,
      userConfig
    );

    const tasks = await taskProvider.fetchTasks(flags.project);
    if (tasks.length === 0) {
      this.error(
        'No tasks found for the specified workspace/project.'
      );
    }

    this.log(
      `Tasks for workspace "${flags.workspace}"${flags.project ? ` and project "${flags.project}"` : ''}:`
    );

    // Sort the tasks by project name and then by task name. First identify the project names in the list
    const projectNames = [
      ...new Set(tasks.map((task) => task.projectId).filter(Boolean))
    ];

    // For each project, print the project name and then the tasks associated with that project, sorted by task name
    for (const project of projectNames) {
      if (project) {
        this.log(`\n=== Project: ${project} ===`);
        const tasksForProject = tasks
          .filter((task) => task.projectId === project)
          .sort((a, b) => {
            const aName = String(a.userFriendlyName ?? a.label ?? '');
            const bName = String(b.userFriendlyName ?? b.label ?? '');

            return aName.localeCompare(bName);
          });
        for (const task of tasksForProject) {
          this.log(`${task.userFriendlyName ?? 'Unnamed Task'}`);
          if (flags.verbose) {
            this.log(`  Command: ${task.command ?? 'N/A'}`);
          }
        }
      }
    }
  }
}

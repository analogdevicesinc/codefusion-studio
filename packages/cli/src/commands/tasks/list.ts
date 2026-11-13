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
import {Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';

import type {CliConfig} from '../../types/cli-config.js';

import {CliTaskProvider} from '../../providers/cli-task-provider.js';
import {readUserConfig} from '../../utils/utils.js';

interface TaskItem {
  name?: string;
  command?: string;
}

interface TaskGroup {
  project: string;
  tasks: TaskItem[];
}

export default class List extends BaseCommand<typeof List> {
  static description = 'List tasks for a named workspace';
  static useResponseEnvelope = true;

  static flags = {
    workspace: Flags.string({
      char: 'w',
      summary: 'The workspace for which tasks should be listed',
      required: false,
      default: process.cwd(),
      defaultHelp: async () => '.'
    }),
    project: Flags.string({
      char: 'p',
      summary: 'The project for which tasks should be listed',
      required: false
    })
  };

  public async run(): Promise<{tasks: TaskGroup[]}> {
    const {flags} = this;

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

    const groupedTasks: TaskGroup[] = [];

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
        const projectTasks: TaskItem[] = [];
        for (const task of tasksForProject) {
          const taskName = task.userFriendlyName ?? 'Unnamed Task';
          this.log(taskName);
          if (flags.verbose) {
            this.log(`  Command: ${task.command ?? 'N/A'}`);
          }
          projectTasks.push({
            name: task.userFriendlyName,
            command: task.command
          });
        }
        groupedTasks.push({
          project: String(project),
          tasks: projectTasks
        });
      }
    }

    return {tasks: groupedTasks};
  }
}

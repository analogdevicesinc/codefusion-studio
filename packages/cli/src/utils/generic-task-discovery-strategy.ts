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

import type {TaskDiscoveryStrategy} from 'cfs-lib';
import type {Task} from 'cfs-types';

import {globFiles, readJsonFile} from 'cfs-lib';

/**
 * Strategy for discovering standard task files (.vscode/tasks.json).
 *
 * This strategy:
 * 1. Globs for .vscode/tasks.json files
 * 2. Parses them as standard task format (version "2.0.0")
 * 3. Converts to Task.Definition[] format
 *
 * Note: This is CLI-specific because the IDE delegates tasks.json
 * parsing to VS Code's native task system.
 */
export class GenericTaskDiscoveryStrategy
  implements TaskDiscoveryStrategy
{
  readonly id = 'generic';

  async discoverTasks(
    workspaceFolders: string[]
  ): Promise<Task.Definition[]> {
    const result: Task.Definition[] = [];

    for (const workspaceFolder of workspaceFolders) {
      const taskFiles = await globFiles(['.vscode/tasks.json'], {
        cwd: workspaceFolder,
        deep: 2,
        onlyFiles: true,
        dot: true,
        absolute: true
      });

      for (const taskFile of taskFiles) {
        try {
          const tasksJson = readJsonFile<Task.File>(taskFile);

          // Validate version
          if (tasksJson.version !== '2.0.0') {
            console.warn(
              `Unsupported tasks.json version in ${taskFile}: ${tasksJson.version}`
            );
            continue;
          }

          if (
            !Array.isArray(tasksJson.tasks) ||
            tasksJson.tasks.length === 0
          ) {
            continue;
          }

          // Convert each task to Task.Definition format
          for (const task of tasksJson.tasks) {
            const taskDefinition = this.convertToTaskDefinition(task);
            if (taskDefinition) {
              result.push(taskDefinition);
            }
          }
        } catch (error) {
          console.error(
            `Error reading tasks.json from ${taskFile}: ${error}`
          );
        }
      }
    }

    return result;
  }

  /**
   * Converts a standard tasks.json task to Task.Definition format.
   *
   * Handling differences:
   * - tasks.json may have `args` array that needs to be joined with command
   * - tasks.json uses same platform override structure
   * - Shell options are compatible between formats
   *
   * @param task - Raw task object from tasks.json
   * @returns Task.Definition or undefined if invalid
   */
  private convertToTaskDefinition(
    task: Record<string, unknown>
  ): Task.Definition | undefined {
    if (
      typeof task.label !== 'string' ||
      typeof task.type !== 'string'
    ) {
      console.warn(
        `Task missing required fields (label, type):`,
        task
      );
      return undefined;
    }

    // Build command from command + args if present
    let command = String(task.command ?? '');
    if (Array.isArray(task.args)) {
      const argsStr = task.args
        .filter((arg): arg is string => typeof arg === 'string')
        .join(' ');
      command = `${command} ${argsStr}`.trim();
    }

    const taskDefinition: Task.Definition = {
      label: task.label,
      type: task.type,
      command,
      options: task.options as Task.Definition['options'],
      windows: task.windows as Task.Definition['windows'],
      linux: task.linux as Task.Definition['linux'],
      osx: task.osx as Task.Definition['osx'],
      group: task.group as Task.Definition['group'],
      problemMatcher:
        task.problemMatcher as Task.Definition['problemMatcher'],
      dependsOn: task.dependsOn as Task.Definition['dependsOn']
    };

    // Preserve any additional properties
    for (const [key, value] of Object.entries(task)) {
      if (!(key in taskDefinition) && value !== undefined) {
        taskDefinition[key] = value;
      }
    }

    return taskDefinition;
  }
}

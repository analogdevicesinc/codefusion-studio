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

import {MissingDependencyError} from 'cfs-lib';

/**
 * Handles MissingDependencyError by providing user-friendly, actionable error messages.
 * Throws an error with context-specific installation instructions.
 *
 * If the error is not a MissingDependencyError, returns without throwing.
 *
 * @param error - The error to handle (checks if it's MissingDependencyError)
 * @returns void
 * @throws Error with formatted message if it's a MissingDependencyError
 */
export function handleMissingDependencyError(error: unknown): void {
  if (!(error instanceof MissingDependencyError)) {
    return; // Not a MissingDependencyError, let caller handle it
  }

  const dependencyTypeName =
    error.dependencyType === 'data-model'
      ? 'data model'
      : error.dependencyType;

  let message = `${error.message}\n\n`;

  // Add dependency-specific guidance
  if (error.dependencyType === 'data-model') {
    const {details = {}} = error as MissingDependencyError;
    const {socName, packageId, requestedVersion} = details;

    if (socName && packageId) {
      message += `Requested: ${socName}/${packageId}`;

      if (requestedVersion) {
        message += ` (version ${requestedVersion})`;
      }

      message += '\n';
    }
  } else if (error.dependencyType === 'plugin') {
    const {details} = error as MissingDependencyError;
    const {plugins} = details;

    if (Array.isArray(plugins) && plugins.length > 0) {
      message += 'Missing plugins:\n';
      for (const plugin of plugins) {
        message += `  - ${plugin.id}`;
        if (plugin.version) {
          message += ` (version ${plugin.version})`;
        }

        if (
          plugin.availableVersions &&
          plugin.availableVersions.length > 0
        ) {
          message += `\n    Available versions: ${plugin.availableVersions.join(', ')}`;
        }

        message += '\n';
      }
    }
  }

  message += `\nTo install the required ${dependencyTypeName}, run:\n`;
  message += '  cfsutil pkg search <package-name>\n';
  message += '  cfsutil pkg install <package>/<version>';

  throw new Error(message);
}

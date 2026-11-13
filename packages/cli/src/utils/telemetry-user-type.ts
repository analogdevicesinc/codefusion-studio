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

import {UserType} from 'cfs-lib';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';

import {getSessionManager} from './session-manager.js';

const execAsync = promisify(exec);

export const telemetryUserTypeDeps = {
  getLocalSessionEmails: () =>
    getSessionManager().getLocalSessionEmails(),
  platform: () => process.platform,
  exec: execAsync
};

/**
 * Classifies usage using local session and managed-device indicators only.
 * Only the resulting user type is returned; identifiers stay local.
 * TODO(CFSIO-27357): Extract classification into a common cfs-lib service
 * consumed by both the CLI and the IDE extension.
 * @param warn - Reports check failures without exposing local details.
 * @returns Internal if either local check identifies ADI usage.
 */
export async function determineTelemetryUserType(
  warn: (message: string) => void
): Promise<UserType> {
  let sessionCheckFailed = false;
  try {
    const emails =
      await telemetryUserTypeDeps.getLocalSessionEmails();
    if (
      emails.some((email) =>
        email.trim().toLowerCase().endsWith('@analog.com')
      )
    ) {
      return UserType.INTERNAL;
    }
  } catch {
    sessionCheckFailed = true;
    warn(
      'Unable to check the local myAnalog session for telemetry; checking the device instead.'
    );
  }

  try {
    let command: string;
    switch (telemetryUserTypeDeps.platform()) {
      case 'win32':
        command =
          'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystem).Domain"';
        break;
      case 'linux':
        command = 'grep -i analog /etc/hosts';
        break;
      case 'darwin':
        command = 'profiles status -type enrollment';
        break;
      default:
        throw new Error('Unsupported platform');
    }

    let output: string;
    try {
      ({stdout: output} = await telemetryUserTypeDeps.exec(command, {
        windowsHide: true,
        timeout: 5000
      }));
    } catch (error) {
      // grep exits with 1 when no indicator matches, not when the check fails.
      if (
        telemetryUserTypeDeps.platform() === 'linux' &&
        error instanceof Error &&
        'code' in error &&
        error.code === 1
      ) {
        output = '';
      } else {
        throw error;
      }
    }

    // Match the device heuristic in the IDE until CFSIO-27357 unifies it.
    if (output.toLowerCase().includes('analog')) {
      return UserType.INTERNAL;
    }
    if (sessionCheckFailed) {
      throw new Error('Telemetry classification was incomplete');
    }
    return UserType.EXTERNAL;
  } catch {
    throw new Error(
      'Unable to determine the telemetry user type from local checks. Telemetry was not initialized.'
    );
  }
}

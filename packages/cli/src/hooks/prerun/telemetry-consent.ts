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

import type {Config} from '@oclif/core';
import {Hook} from '@oclif/core';
import {TelemetryManager, UserType} from 'cfs-lib';

import type {CliTelemetryConfig} from '../../types/cli-config.js';
import {isNonInteractiveSession} from '../../utils/is-non-interactive.js';
import {isTelemetrySuppressed} from '../../utils/telemetry.js';
import {TELEMETRY_CONSENT_MESSAGE} from '../../utils/telemetry-disclosure.js';
import {initTelemetrySession} from '../../utils/telemetry-session.js';
import {determineTelemetryUserType} from '../../utils/telemetry-user-type.js';
import {
  readUserConfig,
  writeTelemetryPreference
} from '../../utils/utils.js';

const TELEMETRY_COMMANDS = new Set([
  'telemetry:enable',
  'telemetry:disable',
  'telemetry:status'
]);

export type TelemetryConsentDeps = {
  determineTelemetryUserType: typeof determineTelemetryUserType;
  isTelemetrySuppressed: (
    env: Record<string, string | undefined>
  ) => boolean;
  input: (options: {
    message: string;
    validate: (value: string) => boolean | string;
  }) => Promise<string>;
};

export const telemetryConsentDeps: TelemetryConsentDeps = {
  determineTelemetryUserType,
  isTelemetrySuppressed,
  async input(options) {
    const {input} = await import('@inquirer/prompts');
    return input(options);
  }
};

const hook: Hook<'prerun'> = async function (options) {
  const commandId = options.Command.id;
  if (commandId && TELEMETRY_COMMANDS.has(commandId)) {
    return;
  }

  if (telemetryConsentDeps.isTelemetrySuppressed(process.env)) {
    return;
  }

  const config = options.config as Config;
  const userConfig = readUserConfig(config);
  const telemetry = userConfig?.telemetry;

  let enabled = telemetry?.enabled;
  let classifiedUserType: UserType | undefined;

  if (enabled === undefined) {
    const argv = options.argv ?? [];
    const requestsJson =
      argv.includes('--format=json') ||
      (argv.includes('--format') &&
        argv[argv.indexOf('--format') + 1] === 'json') ||
      argv.includes('--json') ||
      argv.includes('-j');

    if (isNonInteractiveSession() || requestsJson) {
      return;
    }

    try {
      const choice = await telemetryConsentDeps.input({
        message: TELEMETRY_CONSENT_MESSAGE,
        validate: (value) =>
          /^[yn]$/i.test(value.trim()) || 'Please enter Y or N.'
      });

      enabled = choice.trim().toLowerCase() === 'y';

      if (enabled) {
        try {
          classifiedUserType =
            await telemetryConsentDeps.determineTelemetryUserType(
              (message) => this.warn(message)
            );
        } catch {
          this.warn(
            'Unable to determine the telemetry user type locally; telemetry will not be enabled.'
          );
          return;
        }
      }

      const newTelemetry: CliTelemetryConfig = {
        version: 1,
        enabled,
        userId: enabled ? crypto.randomUUID() : '',
        userType: classifiedUserType ?? UserType.EXTERNAL
      };

      writeTelemetryPreference(config, newTelemetry);
    } catch {
      return;
    }
  }

  if (enabled !== true) {
    return;
  }

  if (isNonInteractiveSession()) {
    return;
  }

  const freshConfig = readUserConfig(config);
  const storedTelemetry = freshConfig?.telemetry;
  const userId = storedTelemetry?.userId ?? '';
  const cachedUserType =
    storedTelemetry?.userType === UserType.INTERNAL ||
    storedTelemetry?.userType === UserType.EXTERNAL
      ? storedTelemetry.userType
      : undefined;
  let userType: UserType;
  try {
    userType =
      classifiedUserType ??
      cachedUserType ??
      (await telemetryConsentDeps.determineTelemetryUserType(
        (message) => this.warn(message)
      ));
  } catch {
    this.warn(
      'Unable to determine the telemetry user type locally; telemetry will not be sent.'
    );
    return;
  }
  if (storedTelemetry?.userType !== userType) {
    writeTelemetryPreference(config, {
      version: 1,
      enabled: true,
      userId,
      userType
    });
  }
  const manager = new TelemetryManager(
    true,
    config.version,
    '',
    userId,
    userType,
    crypto.randomUUID()
  );

  initTelemetrySession(manager, performance.now());
};

export default hook;

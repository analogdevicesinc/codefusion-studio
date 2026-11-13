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

import type {CliTelemetryConfig} from '../../types/cli-config.js';
import {BaseCommand} from '../../utils/base-command.js';
import {isNonInteractiveSession} from '../../utils/is-non-interactive.js';
import {determineTelemetryUserType} from '../../utils/telemetry-user-type.js';
import {
  createTelemetryManagerForCommand,
  isTelemetrySuppressed
} from '../../utils/telemetry.js';
import {
  readUserConfig,
  writeTelemetryPreference
} from '../../utils/utils.js';

export const telemetryEnableDeps = {determineTelemetryUserType};

export default class TelemetryEnable extends BaseCommand<
  typeof TelemetryEnable
> {
  static description = 'Enable telemetry.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...BaseCommand.baseFlags
  };

  async run() {
    const userConfig = readUserConfig(this.config);
    const userType =
      await telemetryEnableDeps.determineTelemetryUserType(
        (message) => {
          this.warn(message);
        }
      );

    if (userConfig?.telemetry?.enabled === true) {
      writeTelemetryPreference(this.config, {
        ...userConfig.telemetry,
        version: 1,
        userType
      });
      if (this.jsonEnabled()) {
        this.logJson({telemetryEnabled: true});
      } else {
        this.log('Telemetry is already enabled.');
      }

      return;
    }

    const telemetry: CliTelemetryConfig = {
      version: 1,
      enabled: true,
      userId: userConfig?.telemetry?.userId || crypto.randomUUID(),
      userType
    };

    writeTelemetryPreference(this.config, telemetry);

    if (
      !isTelemetrySuppressed(process.env) &&
      !isNonInteractiveSession()
    ) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const manager = createTelemetryManagerForCommand(
          this.config,
          telemetry.userId,
          telemetry.userType
        );
        const send = manager.logAction('telemetry_consent_given', {});
        const timeout = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 3000);
          timer.unref();
        });
        await Promise.race([send, timeout]);
      } catch {
        // Send failure does not undo consent
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (this.jsonEnabled()) {
      this.logJson({telemetryEnabled: true});
    } else {
      this.log('Telemetry enabled.');
    }
  }
}

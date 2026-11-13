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

import type {CliTelemetryConfig} from '../../types/cli-config.js';
import {BaseCommand} from '../../utils/base-command.js';
import {
  readUserConfig,
  writeTelemetryPreference
} from '../../utils/utils.js';

export default class TelemetryDisable extends BaseCommand<
  typeof TelemetryDisable
> {
  static description = 'Disable telemetry.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...BaseCommand.baseFlags
  };

  async run() {
    const userConfig = readUserConfig(this.config);
    const existing = userConfig?.telemetry;

    if (existing?.enabled === false) {
      if (this.jsonEnabled()) {
        this.logJson({telemetryEnabled: false});
      } else {
        this.log('Telemetry is already disabled.');
      }

      return;
    }

    const telemetry: CliTelemetryConfig = {
      version: 1,
      enabled: false,
      userId: existing?.userId ?? '',
      userType: existing?.userType ?? UserType.EXTERNAL
    };

    writeTelemetryPreference(this.config, telemetry);

    if (this.jsonEnabled()) {
      this.logJson({telemetryEnabled: false});
    } else {
      this.log('Telemetry disabled.');
    }
  }
}

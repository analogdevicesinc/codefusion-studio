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

import {BaseCommand} from '../../utils/base-command.js';
import {isNonInteractiveSession} from '../../utils/is-non-interactive.js';
import {isTelemetrySuppressed} from '../../utils/telemetry.js';
import {TELEMETRY_DISCLOSURE} from '../../utils/telemetry-disclosure.js';
import {readUserConfig} from '../../utils/utils.js';

export const telemetryStatusDeps = {isTelemetrySuppressed};

export default class TelemetryStatus extends BaseCommand<
  typeof TelemetryStatus
> {
  static description =
    'Show the current telemetry preference and privacy disclosure.';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --format json'
  ];

  static flags = {
    ...BaseCommand.baseFlags
  };

  async run() {
    const telemetry = readUserConfig(this.config)?.telemetry;
    const suppressed = telemetryStatusDeps.isTelemetrySuppressed(
      process.env
    );
    const nonInteractive = isNonInteractiveSession();

    if (this.jsonEnabled()) {
      this.logJson({
        telemetryEnabled: telemetry?.enabled ?? null,
        telemetrySuppressed: suppressed,
        nonInteractiveSession: nonInteractive
      });
      return;
    }

    const enabled = telemetry?.enabled;
    if (enabled === true) {
      this.log('Telemetry: enabled');
    } else if (enabled === false) {
      this.log('Telemetry: disabled');
    } else {
      this.log(
        'Telemetry: not configured (will prompt on next interactive run)'
      );
    }
    if (suppressed) {
      this.log(
        'Telemetry: suppressed (CFS_TELEMETRY_DISABLED is set)'
      );
    }

    if (nonInteractive) {
      this.log(
        'Note: Non-interactive session detected — telemetry will not be sent.'
      );
    }

    this.log('\n' + TELEMETRY_DISCLOSURE);
    if (enabled === true) {
      this.log('\nTo disable telemetry, run: cfs telemetry disable');
    } else if (enabled === false) {
      this.log('\nTo enable telemetry, run: cfs telemetry enable');
    } else {
      this.log(
        '\nTo consent to telemetry, run: cfs telemetry enable\n' +
          'To decline telemetry, run: cfs telemetry disable'
      );
    }
  }
}

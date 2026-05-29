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
import {expect, test} from '@oclif/test';

/**
 * Validate that 'cfs soc' and 'cfs socs' (without commands)
 * print the help text.
 */
for (const command of ['soc', 'socs']) {
  describe(command, () => {
    describe('output with no command', () => {
      //   Display the help text when no command is given.
      test
        .stdout()
        .command(['help', command], {root: '..'})
        .it(
          'displays help text when no command is given',
          (ctx) => {
            expect(ctx.stdout).to.contain('SoC data model and catalog operations');
            expect(ctx.stdout).to.contain(`${command} export`);
            expect(ctx.stdout).to.contain(`${command} list`);
            expect(ctx.stdout).to.contain(`${command} info`);
          }
        );
    });
  });
}

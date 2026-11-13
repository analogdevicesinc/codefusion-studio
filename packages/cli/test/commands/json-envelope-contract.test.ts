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

import {expect} from 'chai';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const commandsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/commands'
);

// Commands not yet migrated to the shared envelope. Remove an entry when the
// command that owns it opts in to the envelope. The trailing group (no
// ticket comment) isn't covered by any CFSIO-26453 ticket yet; it still
// needs a decision (a follow-up ticket, or a DOCUMENTED_EXCEPTIONS entry with
// a reason) but is not silently exempted from this contract in the meantime.
const PENDING_MIGRATION = new Set([
  // CFSIO-26901 — mutating package commands
  // catalog/restore.ts, pkg/install.ts, pkg/delete.ts, pkg/uninstall.ts,
  // pkg/add-remote.ts, pkg/auth-remote.ts, pkg/delete-remote.ts,
  // pkg/enable-remote.ts, and pkg/disable-remote.ts have migrated.
  // pkg/login.ts and pkg/logout.ts are deliberately left pending: both are
  // `state = 'deprecated'` and `hidden = true`, superseded by
  // `pkg auth-remote`, so they are intentionally excluded from this phase's
  // migration rather than redesigned for a command users are being steered
  // away from.
  'pkg/login.ts',
  'pkg/logout.ts',

  // CFSIO-26899/CFSIO-26901 — ai/model/*, ai/workspace/create.ts,
  // workspace/create.ts, workspace/configure.ts, project/create.ts,
  // tasks/run.ts, myanalog/login.ts, and myanalog/logout.ts have migrated.

  // Not yet covered by any CFSIO-26453 ticket.
  'docker/pull.ts',
  'dt/parse.ts',
  'generate.ts',
  'myanalog/apikey/create.ts',
  'myanalog/apikey/delete.ts',
  'myanalog/apikey/list.ts',
  'port/read.ts',
  'validate/config.ts',
  'validate/dependencies.ts',
  'telemetry/disable.ts',
  'telemetry/enable.ts',
  'telemetry/status.ts'
]);

// Commands that intentionally never opt in, with the reason.
const DOCUMENTED_EXCEPTIONS = new Set([
  'ai/e2e.ts' // interactive/streaming hardware workflow, not scriptable JSON output
]);

function allCommandFiles(
  dir: string = commandsDir,
  prefix = ''
): string[] {
  const entries = readdirSync(dir, {withFileTypes: true});
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix
      ? `${prefix}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      files.push(
        ...allCommandFiles(path.join(dir, entry.name), relativePath)
      );
    } else if (entry.name.endsWith('.ts')) {
      files.push(relativePath);
    }
  }

  return files;
}

describe('JSON envelope contract', () => {
  for (const file of allCommandFiles()) {
    it(`${file} opts in, is pending, or is a documented exception`, () => {
      if (DOCUMENTED_EXCEPTIONS.has(file)) return;

      const source = readFileSync(
        path.join(commandsDir, file),
        'utf8'
      );
      // Anchored to a class-field line so comments and strings don't count.
      const optedIn =
        /^\s*static\s+useResponseEnvelope\s*=\s*true\b/m.test(source);

      if (PENDING_MIGRATION.has(file)) {
        expect(
          optedIn,
          `${file} is marked pending but already opted in — remove it ` +
            'from PENDING_MIGRATION'
        ).to.be.false;
        return;
      }

      expect(
        optedIn,
        `${file} is a new or unmigrated command with no JSON envelope ` +
          'decision. Either set static useResponseEnvelope = true and add ' +
          'coverage, or add it to PENDING_MIGRATION/DOCUMENTED_EXCEPTIONS ' +
          'with a reason.'
      ).to.be.true;
    });
  }

  it('keeps PENDING_MIGRATION free of stale/removed command files', () => {
    const existingFiles = new Set(allCommandFiles());

    for (const file of PENDING_MIGRATION) {
      expect(
        existingFiles.has(file),
        `${file} is listed in PENDING_MIGRATION but no longer exists ` +
          'under src/commands — remove the stale entry'
      ).to.be.true;
    }
  });
});

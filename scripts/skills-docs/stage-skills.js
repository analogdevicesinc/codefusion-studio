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

/*
  Stages the agent skills into the VS Code extension for packaging.

  VS Code resolves contributed skill paths from the installed extension root and
  rejects paths that resolve outside it. The skills live in the sibling
  packages/cfs-skills/ directory, so before the VSIX is built they must be copied
  under packages/ide/. This script wipes any previous staged copy and copies a
  fresh set of the skills into packages/ide/skills/.

  It is intended to run after scripts/skills-docs/sync-docs.js (which refreshes
  the cfs-docs references bundle) as part of the ide package's vscode:prepublish
  step. Keeping it separate from sync-docs.js leaves that script package-agnostic
  and its --check mode read-only.

  Dotfiles and dot-directories (for example .claude-plugin) are intentionally
  excluded, matching the previous copyfiles glob behaviour, so marketplace
  metadata is not shipped inside the VSIX.

  Usage:
    node scripts/skills-docs/stage-skills.js
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcDir = path.join(rootDir, 'packages/cfs-skills');
const destDir = path.join(rootDir, 'packages/ide/skills');

/** Recursively copy a directory, skipping dotfiles and dot-directories. */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Count the files under a directory, for the summary line. */
function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else if (entry.isFile()) count += 1;
  }
  return count;
}

// Remove any previous staged copy so we never ship stale leftovers.
fs.rmSync(destDir, { recursive: true, force: true });

copyDir(srcDir, destDir);

console.log(`Staged ${countFiles(destDir)} skill files to packages/ide/skills/.`);

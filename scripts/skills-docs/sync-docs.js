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
  Syncs the documentation pages bundled with the `cfs-docs` skill.

  The cfs-docs skill (packages/cfs-skills/cfs-docs/SKILL.md) routes user questions to
  specific documentation pages. Those pages must travel with the skill so it
  works after the skill is installed as a Claude Code plugin or bundled in the
  VSIX, where the repo's top-level `docs/` tree is not present.

  This script treats the routing table in SKILL.md as the single source of
  truth: it extracts every `references/<path>.md` it cites, copies the matching
  `docs/<path>.md` into packages/cfs-skills/cfs-docs/references/, prunes any bundled
  markdown no longer cited, and reports the resulting file count and size.

  Only markdown is copied — images and other assets are intentionally excluded
  to keep the bundle small (docs images are ~78 MB; the cited markdown is <1 MB).

  Usage:
    node scripts/skills-docs/sync-docs.js          # write the bundle
    node scripts/skills-docs/sync-docs.js --check   # verify only; exit 1 if stale
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const docsDir = path.join(rootDir, 'docs');
const skillDir = path.join(rootDir, 'packages/cfs-skills/cfs-docs');
const referencesDir = path.join(skillDir, 'references');
const skillFile = path.join(skillDir, 'SKILL.md');

const checkOnly = process.argv.includes('--check');

/** Extract the set of `references/<path>.md` paths cited in the skill's routing table. */
function getCitedPaths() {
  const skill = fs.readFileSync(skillFile, 'utf8');
  const matches = skill.match(/references\/[A-Za-z0-9._/-]+\.md/g) ?? [];
  const cited = [
    ...new Set(matches.map((m) => path.posix.normalize(m.replace(/^references\//, '')))),
  ].sort();
  if (
    cited.length === 0 ||
    cited.some((rel) => rel === '..' || rel.startsWith('../') || path.posix.isAbsolute(rel))
  ) {
    throw new Error('SKILL.md must cite documentation paths contained by references/.');
  }
  return cited;
}

/** Recursively list every .md file under a directory, as paths relative to it. */
function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = entry.name;
    const full = path.join(dir, rel);
    if (entry.isDirectory()) {
      out.push(...listMarkdown(full).map((p) => path.posix.join(rel, p)));
    } else if (entry.isFile() && rel.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * Recursively list every file under a directory, as paths relative to it.
 * Unlike listMarkdown, this includes non-markdown files so the prune step can
 * remove any stray assets (images, .DS_Store, leftovers from older tooling)
 * that would otherwise be copied into the VSIX, breaking the markdown-only policy.
 */
function listAllFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = entry.name;
    const full = path.join(dir, rel);
    if (entry.isDirectory()) {
      out.push(...listAllFiles(full).map((p) => path.posix.join(rel, p)));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const cited = getCitedPaths();

// Validate that every cited page exists in the source docs before touching anything.
const missing = cited.filter((rel) => !fs.existsSync(path.join(docsDir, rel)));
if (missing.length) {
  console.error('ERROR: SKILL.md cites documentation pages that do not exist under docs/:');
  for (const m of missing) console.error(`  - docs/${m}`);
  console.error('\nFix the paths in packages/cfs-skills/cfs-docs/SKILL.md or add the missing pages.');
  process.exit(1);
}

// Enumerate every file (not just markdown) so any stray non-markdown asset in
// references/ is treated as stale and pruned — the bundle must stay markdown-only.
const existing = new Set(listAllFiles(referencesDir));
const wanted = new Set(cited);

// Files to add or update, and stale files to prune.
const toWrite = [];
for (const rel of cited) {
  const src = fs.readFileSync(path.join(docsDir, rel), 'utf8');
  const destPath = path.join(referencesDir, rel);
  const current = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : null;
  if (current !== src) toWrite.push({ rel, src, destPath });
}
const toPrune = [...existing].filter((rel) => !wanted.has(rel));

if (checkOnly) {
  if (toWrite.length || toPrune.length) {
    console.error('Bundled docs are out of date with docs/ and SKILL.md.');
    for (const { rel } of toWrite) console.error(`  changed: references/${rel}`);
    for (const rel of toPrune) console.error(`  stale:   references/${rel}`);
    console.error('\nRun: yarn skills:sync-docs');
    process.exit(1);
  }
  console.log(`Bundled docs are up to date (${cited.length} pages).`);
  process.exit(0);
}

// Write changed files.
for (const { rel, src, destPath } of toWrite) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, src);
}

// Prune stale files, then remove any directories left empty.
for (const rel of toPrune) fs.rmSync(path.join(referencesDir, rel));
pruneEmptyDirs(referencesDir);

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name));
  }
  if (dir !== referencesDir && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

const finalFiles = listMarkdown(referencesDir);
const totalBytes = finalFiles.reduce(
  (sum, rel) => sum + fs.statSync(path.join(referencesDir, rel)).size,
  0,
);

console.log(
  `Synced ${finalFiles.length} pages to packages/cfs-skills/cfs-docs/references/ ` +
    `(${humanSize(totalBytes)}); ${toWrite.length} written, ${toPrune.length} pruned.`,
);

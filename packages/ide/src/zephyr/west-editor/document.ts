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

import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  stringify,
  type Document,
  type YAMLError,
} from "yaml";
import type { WestManifest, WestYamlProblem } from "./types";
import { validateWestManifest } from "./schema";

/** Path segments addressing a node inside the YAML document. */
type NodePath = Array<string | number>;

/**
 * Options shared by every parse in this module.
 *
 * The failsafe schema resolves every scalar to a string. That is what this
 * editor wants: west manifests are text, and YAML's usual type resolution is
 * lossy for values that matter here - `revision: 0123456` (a short SHA) would
 * otherwise resolve to the number `123456` and be written back as a different
 * commit, because YAML stringifies numbers from their value, not their source.
 * Keeping scalars as strings removes that whole class of corruption, and means
 * what the form shows is exactly what the file says.
 */
const PARSE_OPTIONS = { schema: "failsafe" } as const;

/**
 * Options shared by every stringify in this module.
 *
 * `flowCollectionPadding` is off because YAML otherwise rewrites an existing
 * `[-optional, +ci]` as `[ -optional, +ci ]`, which would show up as a
 * spurious change the first time anything in the file was edited.
 */
const STRINGIFY_OPTIONS = { flowCollectionPadding: false } as const;

/**
 * Renders a `submodules` value as YAML text for the editor model.
 *
 * A scalar is already text and is passed through, so the common
 * `submodules: true` stays `"true"` rather than gaining quotes or a newline.
 */
function submodulesToText(value: unknown): string | undefined {
  if (value === undefined || typeof value === "string") {
    return value;
  }

  return stringify(value, PARSE_OPTIONS).trimEnd();
}

/** Parses the text form of `submodules` back into YAML values. */
function submodulesFromText(text: string): unknown {
  return parseDocument(text, PARSE_OPTIONS).toJS();
}

/** Most characters of a source line shown in a YAML error frame. */
const FRAME_WIDTH = 80;

/** Characters kept before the error when a long line is cut. */
const FRAME_CONTEXT = 20;

/** Marks where a long line in a YAML error frame was cut. */
const ELLIPSIS = "...";

/**
 * Renders the line a YAML error is on, prefixed by its number, with carets
 * under the span the error covers.
 */
function formatYamlFrame(
  text: string,
  lineCounter: LineCounter,
  error: YAMLError,
  numberWidth: number,
): string {
  const [start, end] = error.pos;
  const { line, col } = lineCounter.linePos(start);
  const lineStart = lineCounter.lineStarts[line - 1];
  const lineEnd = text.indexOf("\n", lineStart);
  // A tab is one column but renders wider, which would shift the carets
  const source = text
    .slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    .replace(/\r$/, "")
    .replaceAll("\t", " ");
  const column = col - 1;

  // Long lines are cut to a window around the error, marked with `...`
  const from =
    column > FRAME_WIDTH - FRAME_CONTEXT ? column - FRAME_CONTEXT : 0;
  const to = Math.min(source.length, from + FRAME_WIDTH);
  const prefix = from > 0 ? ELLIPSIS : "";
  const suffix = to < source.length ? ELLIPSIS : "";
  const width = Math.max(1, Math.min(end - start, to - column));
  const gutter = ` ${String(line).padStart(numberWidth)}| `;

  return [
    `${gutter}${prefix}${source.slice(from, to)}${suffix}`,
    `${" ".repeat(gutter.length + prefix.length + column - from)}${"^".repeat(width)}`,
  ].join("\n");
}

/** Renders a problem as text: its message, location and code frame. */
function formatYamlProblem(problem: WestYamlProblem): string {
  return `${problem.message} at line ${problem.line}, column ${problem.column}:\n\n${problem.frame}`;
}

/** Thrown when a document is not well-formed YAML; one problem per error. */
export class WestYamlError extends Error {
  constructor(readonly problems: WestYamlProblem[]) {
    super(`Invalid YAML:\n${problems.map(formatYamlProblem).join("\n\n")}`);
    this.name = "WestYamlError";
  }
}

/** Parses a document, rejecting anything that is not well-formed YAML. */
function parseManifestDocument(text: string): Document {
  const lineCounter = new LineCounter();
  // The parser's own code frame has no line numbers, so build ours instead
  const doc = parseDocument(text, {
    ...PARSE_OPTIONS,
    lineCounter,
    prettyErrors: false,
  });

  if (doc.errors.length > 0) {
    // Every frame shares one gutter width, so line numbers right-align
    const numberWidth = Math.max(
      ...doc.errors.map(
        (error) => String(lineCounter.linePos(error.pos[0]).line).length,
      ),
    );
    // The parser does not always report errors in document order
    const errors = [...doc.errors].sort((a, b) => a.pos[0] - b.pos[0]);
    throw new WestYamlError(
      errors.map((error) => {
        const { line, col } = lineCounter.linePos(error.pos[0]);

        return {
          message: error.message,
          line,
          column: col,
          frame: formatYamlFrame(text, lineCounter, error, numberWidth),
          start: error.pos[0],
          end: error.pos[1],
        };
      }),
    );
  }

  return doc;
}

/**
 * Parses `west.yml` text into the shared manifest data model.
 *
 * The result is validated against the west schema rather than cast, so the
 * returned value genuinely has the shape its type claims.
 *
 * @param text Raw contents of a `west.yml` document.
 * @returns The parsed and validated manifest.
 * @throws If the text is not valid YAML, does not contain a `manifest`
 *   mapping, or does not match the west manifest schema.
 */
export function parseWestManifest(text: string): WestManifest {
  const parsed = parseManifestDocument(text).toJS() as {
    manifest?: unknown;
  } | null;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("west.yml is empty or does not contain a mapping.");
  }

  if (!parsed.manifest || typeof parsed.manifest !== "object") {
    throw new Error("west.yml does not contain a top-level 'manifest' key.");
  }

  const validated = validateWestManifest(parsed.manifest);

  return {
    ...validated,
    projects: validated.projects?.map((project) => ({
      ...project,
      submodules: submodulesToText(project.submodules),
    })),
  } as WestManifest;
}

/**
 * Writes an edited manifest back into an existing `west.yml` document.
 *
 * The original document is mutated node by node rather than re-serialized
 * from scratch, so comments, key ordering and quoting style survive the round
 * trip - inside sequences such as `remotes` and `projects` as well, which are
 * reconciled element by element rather than rebuilt. The one case that does
 * not survive is deleting an element from the middle of a sequence: later
 * elements shift up, so a comment attached by position ends up alongside a
 * different entry.
 *
 * Keys of the mappings this walks into are only ever removed when `manifest`
 * carries them with an explicit `undefined` value. Omitting a key leaves
 * whatever is in the document untouched, so passing a partial manifest is
 * safe. Sequence entries are the exception and must be passed whole: an
 * omitted key is removed there, because entries are matched by position and a
 * key left behind by a deleted entry would otherwise end up on a different
 * one.
 *
 * @param text Current contents of the document.
 * @param manifest Manifest to write into it.
 * @returns The updated document text.
 */
export function applyManifestEdits(
  text: string,
  manifest: WestManifest,
): string {
  const doc = parseManifestDocument(text);

  // `setIn` seeds a missing root mapping for us, but it throws on a document
  // whose root is a scalar or sequence, so reject that up front.
  if (doc.contents !== null && !isMap(doc.contents)) {
    throw new Error("west.yml does not contain a top-level mapping.");
  }

  syncNode(doc, ["manifest"], expandSubmodules(manifest));

  return doc.toString(STRINGIFY_OPTIONS);
}

/**
 * Undoes {@link submodulesToText} so the document is written from YAML values
 * rather than from a string that would replace the whole node.
 */
function expandSubmodules(manifest: WestManifest): unknown {
  const projects = manifest.projects;

  if (!projects?.some((project) => typeof project.submodules === "string")) {
    return manifest;
  }

  return {
    ...manifest,
    projects: projects.map((project) =>
      typeof project.submodules === "string"
        ? { ...project, submodules: submodulesFromText(project.submodules) }
        : project,
    ),
  };
}

/**
 * Recursively reconciles the node at `path` with `value`, preferring in-place
 * updates over node replacement so formatting and comments are retained.
 */
function syncNode(
  doc: Document,
  path: NodePath,
  value: unknown,
  /**
   * Whether a key the replacement omits is removed rather than left in
   * place. Set for everything below a sequence entry - see
   * {@link syncSequence}.
   */
  replace = false,
): void {
  if (Array.isArray(value)) {
    syncSequence(doc, path, value);

    return;
  }

  if (typeof value !== "object" || value === null) {
    setLeaf(doc, path, value);

    return;
  }

  const entries = value as Record<string, unknown>;
  const existing = doc.getIn(path, true);

  // Nothing to merge into, so build the whole subtree in one go. `createNode`
  // matters here: planting a bare object would leave a non-node in the tree
  // that later recursion cannot descend into.
  if (!isMap(existing)) {
    doc.setIn(path, doc.createNode(entries));

    return;
  }

  // Outside a sequence entry a key is removed only when the caller explicitly
  // passes `undefined` for it. A key that is simply absent is left alone, so
  // parts of the document this editor does not model - `import`,
  // `clone-depth`, vendor extensions - survive a write-back even if the
  // caller hands us a partial manifest. Inside a sequence entry an absent key
  // is removed as well: see `replace`.
  const replacementKeys = new Set(Object.keys(entries));
  const clearedKeys = existing.items
    .map((item) => String(item.key))
    .filter((key) =>
      replace
        ? !replacementKeys.has(key) || entries[key] === undefined
        : replacementKeys.has(key) && entries[key] === undefined,
    );

  for (const key of clearedKeys) {
    doc.deleteIn([...path, key]);
  }

  for (const [key, entry] of Object.entries(entries)) {
    if (entry === undefined) continue;

    syncNode(doc, [...path, key], entry, replace);
  }
}

/**
 * Reconciles the sequence at `path` element by element rather than replacing
 * it, so entries that did not change keep their key order and their comments.
 * Only entries the caller added or removed are created or dropped.
 *
 * Entries are matched by position, so removing one shifts every later entry
 * onto the node of its predecessor. Each entry is therefore merged as a full
 * replacement: a key the caller did not pass is removed, rather than
 * surviving as a leftover from the entry that used to occupy the position.
 */
function syncSequence(doc: Document, path: NodePath, values: unknown[]): void {
  const existing = doc.getIn(path, true);

  if (!isSeq(existing)) {
    doc.setIn(path, doc.createNode(values));

    return;
  }

  // Entries that already exist are merged in place; the rest are appended as
  // freshly created nodes.
  const reusable = Math.min(existing.items.length, values.length);

  existing.items.length = reusable;

  values.forEach((item, index) => {
    if (index < reusable) {
      syncNode(doc, [...path, index], item, true);
    } else {
      existing.items.push(doc.createNode(item));
    }
  });
}

/**
 * Assigns a scalar or null leaf, reusing the existing scalar node when
 * possible so its trailing and leading comments are preserved.
 *
 * An unchanged value is left strictly alone. This matters more than it looks:
 * YAML resolves `revision: 0123456` - a short SHA with a leading zero - to the
 * number `123456`, and re-emitting that number would write a different commit
 * back to the file. Skipping the assignment keeps the original source text,
 * so a scalar the user never touched is never rewritten.
 */
function setLeaf(doc: Document, path: NodePath, value: unknown): void {
  const existing = doc.getIn(path, true);

  if (isScalar(existing)) {
    if (existing.value !== value) {
      existing.value = value;
    }

    return;
  }

  doc.setIn(path, value);
}

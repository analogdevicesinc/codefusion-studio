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

/**
 * Data model for a Zephyr `west.yml` manifest.
 *
 * This module is the single source of truth for the manifest shape and is
 * imported by both the extension host (`src/zephyr/west-editor/`) and the
 * webview front end (`src/webviews/west-editor/`, via the `@west-editor`
 * alias), so the two sides can never drift apart.
 *
 * Every scalar is typed as a string. The document is parsed with YAML's
 * failsafe schema, which does not resolve numbers or booleans, so the model
 * holds exactly the text the manifest contains - `clone-depth: 1` is `"1"`.
 * That keeps values such as a leading-zero SHA intact, which YAML's normal
 * type resolution would silently rewrite.
 *
 * The model intentionally covers only the subset of the west manifest schema
 * the editor understands. Values parsed from a document keep any keys outside
 * this subset at runtime even though they are not declared here, and
 * `applyManifestEdits` never removes a key it was not explicitly asked to
 * clear, so an unmodelled key survives a round trip through the editor.
 */

/**
 * Shape of the mapping form of an `import`.
 *
 * Descriptive only: `import` is `type: any` in west's schema, so this is not
 * enforced at the boundary. Use it to narrow a {@link WestImport} once
 * something in the editor actually reads one.
 */
export type WestImportFilter = {
  /** Manifest file or directory to import, relative to the repository root. */
  file?: string;
  /** Only import projects whose name appears here. */
  "name-allowlist"?: string[];
  /** Only import projects whose path appears here. */
  "path-allowlist"?: string[];
  /** Skip imported projects whose name appears here. */
  "name-blocklist"?: string[];
  /** Skip imported projects whose path appears here. */
  "path-blocklist"?: string[];
  /** Prefix prepended to the path of every imported project. */
  "path-prefix"?: string;
};

/**
 * Value of `projects[].import` and `self.import`.
 *
 * `unknown` rather than a union, because west declares `import` as `type: any`
 * and this editor validates no further: claiming a shape the boundary never
 * checks would make the type a lie. A reader must narrow, and
 * {@link WestImportFilter} describes the mapping form it will find.
 */
export type WestImport = unknown;

/**
 * Shape of one entry in the sequence form of `submodules`.
 *
 * Descriptive only, for the same reason as {@link WestImportFilter}.
 */
export type WestSubmodule = {
  /** Submodule path within the project. */
  path: string;
  /** Submodule name, if it differs from its path. */
  name?: string;
};

/**
 * Value of `projects[].submodules`, carried as YAML text.
 *
 * west allows either a flag or a sequence of {@link WestSubmodule} entries
 * here. Rather than surface that union, the editor renders the value to text
 * on the way in and parses it back on the way out, so the form can offer a
 * single editable block. A value that is already a scalar - `submodules: true`
 * reaches us as `"true"` under the failsafe schema - is passed through
 * untouched.
 */
export type WestSubmodules = string;

/** A remote repository host that projects can be resolved against. */
export type WestRemote = {
  /** Identifier referenced by `WestProject.remote` and `WestDefaults.remote`. */
  name: string;
  /**
   * Base URL joined to `repo-path` (or the project name) with a `/` to form
   * the fetch URL. Required by west's schema, unlike most keys here.
   */
  "url-base": string;
};

/** Values applied to any project that does not override them. */
export type WestDefaults = {
  /** Name of the remote used when a project omits `remote`. */
  remote?: string;
  /** Git revision used when a project omits `revision`. Defaults to `master`. */
  revision?: string;
};

/**
 * A single repository pulled in by the manifest.
 *
 * Two constraints west enforces that this type cannot: `remote` and `url` are
 * mutually exclusive (`repo-path` requires `remote`), and `import` may not be
 * combined with `groups`.
 */
export type WestProject = {
  /** Project name, unique within the manifest. May not be `west` or `manifest`. */
  name: string;
  /** Informational only; west ignores it. Requires schema version 0.13+. */
  description?: string;
  /** Name of the remote this project is resolved against. */
  remote?: string;
  /** Path appended to the remote's `url-base` instead of the project name. */
  "repo-path"?: string;
  /** Explicit fetch URL, in place of `remote`. */
  url?: string;
  /** Revision to check out: a branch, tag or SHA. */
  revision?: string;
  /** Destination path relative to the workspace topdir. Defaults to `name`. */
  path?: string;
  /** Submodules to check out within the project. */
  submodules?: WestSubmodules;
  /** Shallow-clone depth. Requires `revision` to name a branch or tag. */
  "clone-depth"?: string;
  /** Path to a `west-commands.yml` inside the project. */
  "west-commands"?: string;
  /** Further manifest data to import from this project. */
  import?: WestImport;
  /** Groups this project belongs to, filtered by `group-filter`. */
  groups?: string[];
  /** Arbitrary user data; west carries it through untouched. */
  userdata?: unknown;
};

/** Description of the manifest repository itself. */
export type WestSelf = {
  /** Path of the manifest repository relative to the workspace topdir. */
  path?: string;
  /** Path to a `west-commands.yml` inside the manifest repository. */
  "west-commands"?: string;
  /** Further manifest data to import from the manifest repository. */
  import?: WestImport;
  /** Arbitrary user data; west carries it through untouched. */
  userdata?: unknown;
};

/** Contents of the `manifest` mapping in a `west.yml` file. */
export type WestManifest = {
  /** Minimum west schema version required to parse this manifest. */
  version?: string;
  defaults?: WestDefaults;
  remotes?: WestRemote[];
  projects?: WestProject[];
  self?: WestSelf;
  /** Group enable/disable list, e.g. `["-optional", "+ci"]`. */
  "group-filter"?: string[];
};

/**
 * One manifest file imported by the open manifest, as resolved on disk by the
 * extension host.
 */
export type WestManifestImport = {
  /** Project the manifest is imported from; absent for `self.import`. */
  projectName?: string;
  /**
   * Imported manifest, relative to the workspace topdir. Outside a west
   * workspace, relative to the directory of the open manifest instead.
   */
  path: string;
  /**
   * Absolute path of the imported manifest, used to open it. Absent for a
   * project import outside a west workspace, where it cannot be located.
   * May name a file that is not on disk yet.
   */
  absolutePath?: string;
};

/** Top level shape of a `west.yml` document. */
export type WestManifestFile = {
  manifest: WestManifest;
};

/** How a project on disk compares with the manifest; one badge per card. */
export type WestProjectStatus =
  | "in-sync"
  | "not-cloned"
  | "different-revision"
  | "modified-files"
  | "untracked-files"
  | "disabled";

/** Why the West engine could not answer. */
export type WestEngineErrorKind =
  | "not-installed"
  | "not-a-workspace"
  | "timeout"
  | "aborted"
  | "failed";

/** Project statuses computed by the extension host for the open manifest. */
export type WestProjectStatuses = {
  /** By project name. A project without a status is absent. */
  statuses: Record<string, WestProjectStatus>;
  /** Set when west could not run; `statuses` then holds only Not cloned projects. */
  unavailable?: { reason: WestEngineErrorKind; message: string };
};

/** A YAML syntax error in the document, with where it is. */
export type WestYamlProblem = {
  /** What is wrong, as the parser words it. */
  message: string;
  /** Where the error starts, both 1-based. */
  line: number;
  column: number;
  /** The numbered source line with carets under the error, for a monospace font. */
  frame: string;
  /** Offsets of the span the error covers in the document text. */
  start: number;
  end: number;
};

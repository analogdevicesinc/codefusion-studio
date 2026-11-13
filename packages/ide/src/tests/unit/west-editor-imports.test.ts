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

import { describe, it } from "mocha";
import { expect } from "chai";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  resolveImportPaths,
  resolveManifestImports,
  selectManifestFiles,
} from "../../zephyr/west-editor/imports";
import type {
  WestManifest,
  WestManifestImport,
} from "../../zephyr/west-editor/types";
import { createLayout, createTempDir } from "./west-editor-test-utils";

describe("resolveImportPaths", () => {
  const cases: Array<[name: string, value: unknown, expected: string[]]> = [
    ["no import", undefined, []],
    ["null", null, []],
    ["false", "false", []],
    ["an empty path", "", []],
    ["true", "true", ["west.yml"]],
    ["a boolean true", true, ["west.yml"]],
    ["a path", "submanifests", ["submanifests"]],
    ["a mapping with a file", { file: "sub.yml" }, ["sub.yml"]],
    [
      "a mapping with only filters",
      { "name-allowlist": ["cmsis_6"], "path-prefix": "x" },
      ["west.yml"],
    ],
    ["an empty mapping", {}, ["west.yml"]],
    ["a mapping whose file is not a string", { file: 3 }, ["west.yml"]],
    [
      "a sequence",
      ["a.yml", { file: "b.yml" }, "true"],
      ["a.yml", "b.yml", "west.yml"],
    ],
    ["a nested sequence", [["a.yml"], "b.yml"], ["a.yml", "b.yml"]],
  ];

  for (const [name, value, expected] of cases) {
    it(`resolves ${name}`, () => {
      expect(resolveImportPaths(value)).to.deep.equal(expected);
    });
  }
});

describe("selectManifestFiles", () => {
  it("keeps .yml and .yaml files only", () => {
    expect(
      selectManifestFiles(["a.yml", "README.md", "b.yaml", "c.yml.sample"]),
    ).to.deep.equal(["a.yml", "b.yaml"]);
  });

  it("sorts by code point, whatever order it is given", () => {
    expect(
      selectManifestFiles([
        "c.yml",
        "a.yaml",
        "B.yml",
        "_x.yml",
        "10.yml",
        "9.yml",
      ]),
    ).to.deep.equal(["10.yml", "9.yml", "B.yml", "_x.yml", "a.yaml", "c.yml"]);
  });
});

type ImportCase = {
  name: string;
  /** Workspace contents; see {@link createLayout}. `.west/` is added. */
  layout: string[];
  /** The open manifest, relative to the root. Defaults to `app/west.yml`. */
  manifestAt?: string;
  manifest: WestManifest;
  /** False to resolve without a topdir, as outside a west workspace. */
  inWorkspace?: boolean;
  /** Contents of `.west/config`; the file is not written without it. */
  westConfig?: string;
  /**
   * Expected entries. `at` is the absolute path relative to the root, or
   * `null` when the entry must carry none.
   */
  expected: Array<{ projectName?: string; path: string; at: string | null }>;
};

const IMPORT_CASES: ImportCase[] = [
  // self
  {
    name: "self: a directory, keeping .yml and .yaml files only",
    layout: [
      "app/.git/",
      "app/west.yml",
      "app/sub/b.yaml",
      "app/sub/a.yml",
      "app/sub/README.md",
      "app/sub/c.yml.sample",
      // A directory named like a manifest is skipped, not descended into.
      "app/sub/nested.yml/inner.yml",
    ],
    manifest: { self: { import: "sub" } },
    expected: [
      { path: "app/sub/a.yml", at: "app/sub/a.yml" },
      { path: "app/sub/b.yaml", at: "app/sub/b.yaml" },
    ],
  },
  {
    name: "self: a directory, sorted by code point whatever the disk order",
    layout: [
      "app/.git/",
      "app/west.yml",
      "app/sub/c.yml",
      "app/sub/a.yaml",
      "app/sub/B.yml",
    ],
    manifest: { self: { import: "sub" } },
    expected: [
      { path: "app/sub/B.yml", at: "app/sub/B.yml" },
      { path: "app/sub/a.yaml", at: "app/sub/a.yaml" },
      { path: "app/sub/c.yml", at: "app/sub/c.yml" },
    ],
  },
  {
    name: "self: a file",
    layout: ["app/.git/", "app/west.yml", "app/extra.yml"],
    manifest: { self: { import: "extra.yml" } },
    expected: [{ path: "app/extra.yml", at: "app/extra.yml" }],
  },
  {
    name: "self: a mapping whose file is a directory",
    layout: ["app/.git/", "app/west.yml", "app/sub/a.yml"],
    manifest: {
      self: { import: { file: "sub", "name-allowlist": ["zephyr"] } },
    },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: a sequence of a file and a directory",
    layout: ["app/.git/", "app/west.yml", "app/extra.yml", "app/sub/a.yml"],
    manifest: { self: { import: ["extra.yml", "sub"] } },
    expected: [
      { path: "app/extra.yml", at: "app/extra.yml" },
      { path: "app/sub/a.yml", at: "app/sub/a.yml" },
    ],
  },
  {
    name: "self: a path not on disk, kept as written",
    layout: ["app/.git/", "app/west.yml"],
    manifest: { self: { import: "missing" } },
    expected: [{ path: "app/missing", at: "app/missing" }],
  },
  {
    name: "self: resolved from the repository root below a subdirectory",
    layout: ["app/.git/", "app/manifests/west.yml", "app/sub/a.yml"],
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: resolved from the manifest's directory without a repository",
    layout: ["app/manifests/west.yml", "app/manifests/sub/a.yml"],
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [
      { path: "app/manifests/sub/a.yml", at: "app/manifests/sub/a.yml" },
    ],
  },
  {
    name: "self: the configured manifest.path wins over a parent .git",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: "[manifest]\npath = app\nfile = manifests/west.yml\n",
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: the configured manifest.path is used without any .git",
    layout: ["app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: "[manifest]\npath = app\nfile = manifests/west.yml\n",
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: manifest.file defaults to west.yml",
    layout: [".git/", "app/west.yml", "app/sub/a.yml"],
    westConfig: "[manifest]\npath = app\n",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: config read like configparser (comments, ':', case, sections)",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: [
      "# written by west init",
      "[zephyr]",
      "path = elsewhere",
      "[manifest]",
      "; the manifest repository",
      "Path: app",
      "file = manifests/west.yml",
    ].join("\n"),
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  // .west/config as it appears in practice. Each row keeps a parent .git and
  // a non-default manifest.file, so misreading either key falls back to the
  // .git search and lists `sub` instead of `app/sub/a.yml`.
  {
    name: "config: as west init writes it, with zephyr.base",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: [
      "[manifest]",
      "path = app",
      "file = manifests/west.yml",
      "",
      "[zephyr]",
      "base = zephyr",
      "",
    ].join("\n"),
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "config: group-filter and project-filter beside path and file",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: [
      "[manifest]",
      "group-filter = +optional,-unstable",
      "path = app",
      "project-filter = -hal_.*,+hal_nordic",
      "file = manifests/west.yml",
    ].join("\n"),
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "config: path and file in later sections do not override [manifest]",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: [
      "[manifest]",
      "path = app",
      "file = manifests/west.yml",
      "[build]",
      "board = nrf52dk/nrf52832",
      "pristine = auto",
      "[update]",
      "narrow = true",
      // Aliases can take any name, including path and file.
      "[alias]",
      "path = manifest --path",
      "file = manifest --freeze",
    ].join("\n"),
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "config: Windows line endings and a value continued on the next line",
    layout: [".git/", "app/manifests/west.yml", "app/sub/a.yml"],
    westConfig: [
      "[manifest]",
      "group-filter = +optional,",
      "    -unstable",
      "path = app",
      "file = manifests/west.yml",
    ].join("\r\n"),
    manifestAt: "app/manifests/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "app/sub/a.yml", at: "app/sub/a.yml" }],
  },
  {
    name: "self: a manifest other than the configured one falls back to .git",
    layout: [
      "app/west.yml",
      "zephyr/.git/",
      "zephyr/west.yml",
      "zephyr/sub/a.yml",
    ],
    westConfig: "[manifest]\npath = app\nfile = west.yml\n",
    manifestAt: "zephyr/west.yml",
    manifest: { self: { import: "sub" } },
    expected: [{ path: "zephyr/sub/a.yml", at: "zephyr/sub/a.yml" }],
  },

  // projects
  {
    name: "project: no import",
    layout: ["app/west.yml", "zephyr/west.yml"],
    manifest: { projects: [{ name: "zephyr" }] },
    expected: [],
  },
  {
    name: "project: true",
    layout: ["app/west.yml", "zephyr/west.yml"],
    manifest: { projects: [{ name: "zephyr", import: "true" }] },
    expected: [
      { projectName: "zephyr", path: "zephyr/west.yml", at: "zephyr/west.yml" },
    ],
  },
  {
    name: "project: a file, below a custom path",
    layout: ["app/west.yml", "modules/hal/zephyr/module.yml"],
    manifest: {
      projects: [
        { name: "hal", path: "modules/hal", import: "zephyr/module.yml" },
      ],
    },
    expected: [
      {
        projectName: "hal",
        path: "modules/hal/zephyr/module.yml",
        at: "modules/hal/zephyr/module.yml",
      },
    ],
  },
  {
    name: "project: a directory",
    layout: ["app/west.yml", "zephyr/sub/b.yml", "zephyr/sub/a.yaml"],
    manifest: { projects: [{ name: "zephyr", import: "sub" }] },
    expected: [
      {
        projectName: "zephyr",
        path: "zephyr/sub/a.yaml",
        at: "zephyr/sub/a.yaml",
      },
      {
        projectName: "zephyr",
        path: "zephyr/sub/b.yml",
        at: "zephyr/sub/b.yml",
      },
    ],
  },
  {
    name: "project: a mapping without a file",
    layout: ["app/west.yml", "zephyr/west.yml"],
    manifest: {
      projects: [{ name: "zephyr", import: { "name-allowlist": ["cmsis_6"] } }],
    },
    expected: [
      { projectName: "zephyr", path: "zephyr/west.yml", at: "zephyr/west.yml" },
    ],
  },
  {
    name: "project: a mapping whose file is a directory",
    layout: ["app/west.yml", "zephyr/sub/a.yml"],
    manifest: { projects: [{ name: "zephyr", import: { file: "sub" } }] },
    expected: [
      {
        projectName: "zephyr",
        path: "zephyr/sub/a.yml",
        at: "zephyr/sub/a.yml",
      },
    ],
  },
  {
    name: "project: a sequence, one entry per file",
    layout: ["app/west.yml", "zephyr/west.yml", "zephyr/sub/a.yml"],
    manifest: {
      projects: [{ name: "zephyr", import: ["true", { file: "sub" }] }],
    },
    expected: [
      { projectName: "zephyr", path: "zephyr/west.yml", at: "zephyr/west.yml" },
      {
        projectName: "zephyr",
        path: "zephyr/sub/a.yml",
        at: "zephyr/sub/a.yml",
      },
    ],
  },
  {
    name: "project: a file not cloned yet, kept as written",
    layout: ["app/west.yml"],
    manifest: {
      projects: [{ name: "hal", path: "modules/hal", import: "true" }],
    },
    expected: [
      {
        projectName: "hal",
        path: "modules/hal/west.yml",
        at: "modules/hal/west.yml",
      },
    ],
  },
  {
    name: "project: a directory not cloned yet, kept unexpanded",
    layout: ["app/west.yml"],
    manifest: { projects: [{ name: "hal", import: "submanifests" }] },
    expected: [
      { projectName: "hal", path: "hal/submanifests", at: "hal/submanifests" },
    ],
  },
  {
    name: "project: a path with .. and a trailing slash, normalised",
    layout: ["app/west.yml", "zephyr/west.yml"],
    manifest: {
      projects: [
        { name: "a", path: "modules/../zephyr", import: "true" },
        { name: "b", path: "zephyr/", import: "true" },
      ],
    },
    expected: [
      { projectName: "a", path: "zephyr/west.yml", at: "zephyr/west.yml" },
      { projectName: "b", path: "zephyr/west.yml", at: "zephyr/west.yml" },
    ],
  },

  // ordering and workspace
  {
    name: "self first, then projects in manifest order",
    layout: [
      "app/.git/",
      "app/west.yml",
      "app/extra.yml",
      "zephyr/west.yml",
      "hal/west.yml",
    ],
    manifest: {
      projects: [
        { name: "zephyr", import: "true" },
        { name: "plain" },
        { name: "hal", import: "true" },
      ],
      self: { import: "extra.yml" },
    },
    expected: [
      { path: "app/extra.yml", at: "app/extra.yml" },
      { projectName: "zephyr", path: "zephyr/west.yml", at: "zephyr/west.yml" },
      { projectName: "hal", path: "hal/west.yml", at: "hal/west.yml" },
    ],
  },
  {
    name: "outside a workspace: self resolved, projects unexpanded and unlocated",
    layout: ["app/.git/", "app/west.yml", "app/sub/a.yml", "app/app/sub/b.yml"],
    inWorkspace: false,
    manifest: {
      self: { import: "sub" },
      projects: [{ name: "app", import: "sub" }],
    },
    expected: [
      { path: "sub/a.yml", at: "app/sub/a.yml" },
      { projectName: "app", path: "app/sub", at: null },
    ],
  },
];

describe("resolveManifestImports", () => {
  for (const testCase of IMPORT_CASES) {
    it(testCase.name, async () => {
      const root = await createTempDir("west-imports-");

      try {
        const inWorkspace = testCase.inWorkspace ?? true;
        await createLayout(root, [
          ...(inWorkspace ? [".west/"] : []),
          ...testCase.layout,
        ]);

        if (testCase.westConfig !== undefined) {
          await fs.writeFile(
            path.join(root, ".west/config"),
            testCase.westConfig,
          );
        }

        const expected: WestManifestImport[] = testCase.expected.map(
          ({ projectName, path: display, at }) => ({
            ...(projectName === undefined ? {} : { projectName }),
            path: display,
            ...(at === null ? {} : { absolutePath: path.join(root, at) }),
          }),
        );

        expect(
          await resolveManifestImports(
            testCase.manifest,
            path.join(root, testCase.manifestAt ?? "app/west.yml"),
            inWorkspace ? root : undefined,
          ),
        ).to.deep.equal(expected);
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    });
  }
});

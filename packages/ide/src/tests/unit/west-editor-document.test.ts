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
import {
  applyManifestEdits,
  parseWestManifest,
  WestYamlError,
} from "../../zephyr/west-editor/document";

/** A manifest with comments in every position the round trip has to respect. */
const MANIFEST = `# Zephyr west manifest for this workspace.
manifest:
  version: "0.13"

  defaults:
    remote: zephyrproject # fallback remote
    revision: main

  # Where we pull code from.
  remotes:
    - name: zephyrproject
      url-base: https://github.com/zephyrproject-rtos

  projects:
    - name: zephyr
      revision: v3.7.0
      path: zephyr

  self:
    path: application
`;

describe("parseWestManifest", () => {
  it("maps a manifest onto the shared data model", () => {
    const manifest = parseWestManifest(MANIFEST);

    expect(manifest.version).to.equal("0.13");
    expect(manifest.defaults?.remote).to.equal("zephyrproject");
    expect(manifest.remotes?.[0]["url-base"]).to.equal(
      "https://github.com/zephyrproject-rtos",
    );
    expect(manifest.projects?.[0].name).to.equal("zephyr");
    expect(manifest.self?.path).to.equal("application");
  });

  it("keeps keys the data model does not declare", () => {
    const manifest = parseWestManifest(
      "manifest:\n  projects:\n    - name: zephyr\n      clone-depth: 1\n",
    );

    expect(manifest.projects?.[0]).to.have.property("clone-depth", "1");
  });

  it("rejects structurally invalid manifests", () => {
    // Each of these is valid YAML but violates west's schema, and each was
    // accepted before validation replaced the unchecked cast.
    const cases: Array<[string, string]> = [
      ["projects is not a sequence", "manifest:\n  projects: oops\n"],
      [
        "remotes is a mapping",
        "manifest:\n  remotes:\n    zephyr: https://example.com\n",
      ],
      ["project has no name", "manifest:\n  projects:\n    - revision: main\n"],
      ["defaults is a sequence", "manifest:\n  defaults: [a, b]\n"],
      [
        "remote is missing url-base",
        "manifest:\n  remotes:\n    - name: zephyr\n",
      ],
      [
        "groups is not a sequence",
        "manifest:\n  projects:\n    - name: zephyr\n      groups: optional\n",
      ],
    ];

    for (const [label, source] of cases) {
      expect(() => parseWestManifest(source), label).to.throw(
        /Invalid west.yml structure/,
      );
    }
  });

  it("treats a numeric-looking project name as the text it is", () => {
    // Under the failsafe schema `name: 42` is the string "42", so it is a
    // valid name rather than a type error, and survives a write-back as-is.
    const source = "manifest:\n  projects:\n    - name: 42\n";

    expect(parseWestManifest(source).projects?.[0].name).to.equal("42");
    expect(applyManifestEdits(source, parseWestManifest(source))).to.equal(
      source,
    );
  });

  it("reports the path of the offending key", () => {
    expect(() =>
      parseWestManifest("manifest:\n  projects:\n    - revision: main\n"),
    ).to.throw(/projects\.0\.name/);
  });

  it("accepts everything west's own schema accepts", () => {
    // `import`, `submodules` and `userdata` are `type: any` upstream, so odd
    // but legal values must not be rejected here.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      import: true\n" +
      "      submodules: false\n" +
      "      userdata: [1, 2, 3]\n" +
      "      revision: 1234567\n" +
      "      groups: [1, two]\n";

    expect(() => parseWestManifest(source)).to.not.throw();
  });

  it("does not strip keys it does not model during validation", () => {
    // Zod's default `strip` would silently drop these; the schema uses
    // `.loose()` precisely so the round-trip guarantee survives validation.
    const source =
      "manifest:\n" +
      "  vendor-extension: keep-me\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      future-key: keep-me-too\n";

    const manifest = parseWestManifest(source);

    expect(manifest).to.have.property("vendor-extension", "keep-me");
    expect(manifest.projects?.[0]).to.have.property(
      "future-key",
      "keep-me-too",
    );
    expect(applyManifestEdits(source, manifest)).to.equal(source);
  });

  it("rejects malformed YAML", () => {
    expect(() => parseWestManifest("manifest: [1, 2\n")).to.throw(
      /^Invalid YAML:\n.+at line \d+, column \d+/,
    );
  });

  it("frames a YAML error with its line number and carets", () => {
    const source = "manifest:\n  self:\n    wrokgKey: @\n";

    expect(() => parseWestManifest(source)).to.throw(
      " 3|     wrokgKey: @\n                  ^",
    );
  });

  it("cuts a long line in a YAML error frame around the error", () => {
    const long = "1234567890".repeat(20);

    expect(() => parseWestManifest(`manifest:\n  y: [1] ${long}\n`)).to.throw(
      ` 2|   y: [1] ${long.slice(0, 71)}...\n${" ".repeat(13)}${"^".repeat(71)}`,
    );
    expect(() => parseWestManifest(`manifest:\n  x: "${long}" @\n`)).to.throw(
      ` 2| ...${long.slice(-18)}" @\n                           ^`,
    );
  });

  it("right-aligns line numbers across YAML error frames", () => {
    const source = `manifest:\n${"  # c\n".repeat(97)}  a: @x\n  b: @y\n`;

    expect(() => parseWestManifest(source)).to.throw(
      "\n  99|   a: @x\n           ^\n",
    );
    expect(() => parseWestManifest(source)).to.throw(
      "\n 100|   b: @y\n           ^",
    );
  });

  it("locates each YAML error in the document text", () => {
    const source = "manifest:\n  self:\n    wrokgKey: @\n";

    try {
      parseWestManifest(source);
      expect.fail("expected a YAML error");
    } catch (error) {
      expect(error).to.be.instanceOf(WestYamlError);
      const [problem] = (error as WestYamlError).problems;
      expect(problem.line).to.equal(3);
      expect(source.slice(problem.start, problem.end)).to.equal("@");
    }
  });

  it("shows a tab in a YAML error frame as one space", () => {
    expect(() => parseWestManifest("manifest:\n  a:\t@\n")).to.throw(
      " 2|   a: @\n         ^",
    );
  });

  it("lists YAML errors in document order", () => {
    // The parser reports one of these errors after a later one
    const source = [
      "manifest:",
      "  projects:",
      "    - name: tabs",
      "\tpath: tabs",
      "    - name: dupe",
      "      path: a",
      "      path: b # the comment makes the parser report out of order",
      '    - name: "unterminated',
      "      path: closed",
    ].join("\n");

    try {
      parseWestManifest(source);
      expect.fail("expected a YAML error");
    } catch (error) {
      const starts = (error as WestYamlError).problems.map((p) => p.start);
      expect(starts).to.deep.equal([...starts].sort((a, b) => a - b));
    }
  });

  it("reports every YAML error, one block each", () => {
    const source = "manifest:\n  a: [1\n  b: {2\n";

    expect(() => parseWestManifest(source)).to.throw(/\n\n/);
  });

  it("rejects a document with no manifest key", () => {
    expect(() => parseWestManifest("not_a_manifest: true\n")).to.throw(
      /'manifest' key/,
    );
  });
});

describe("applyManifestEdits", () => {
  it("preserves comments when a scalar changes", () => {
    const manifest = parseWestManifest(MANIFEST);

    const updated = applyManifestEdits(MANIFEST, {
      ...manifest,
      defaults: { ...manifest.defaults, revision: "v4.0.0" },
    });

    expect(updated).to.contain("revision: v4.0.0");
    expect(updated).to.contain("# Zephyr west manifest");
    expect(updated).to.contain("# fallback remote");
    expect(updated).to.contain("# Where we pull code from.");
  });

  it("is byte-identical when nothing changed", () => {
    // This is what stops the editor's own write-back from being mistaken for
    // an external edit and looping the two views against each other.
    expect(applyManifestEdits(MANIFEST, parseWestManifest(MANIFEST))).to.equal(
      MANIFEST,
    );
  });

  it("adds a project without disturbing the rest of the document", () => {
    const manifest = parseWestManifest(MANIFEST);

    const updated = applyManifestEdits(MANIFEST, {
      ...manifest,
      projects: [
        ...(manifest.projects ?? []),
        { name: "hal_stm32", revision: "main", path: "modules/hal/stm32" },
      ],
    });

    expect(parseWestManifest(updated).projects).to.have.lengthOf(2);
    expect(updated).to.contain("# fallback remote");
  });

  it("preserves comments written inside a sequence", () => {
    // Sequences are reconciled element by element rather than rebuilt, so
    // comments attached to individual entries survive an edit elsewhere.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    # the RTOS itself\n" +
      "    - name: zephyr\n" +
      "      revision: v3.7.0 # pinned for release\n" +
      "    # vendor HAL\n" +
      "    - name: hal_stm32\n" +
      "      revision: main\n";

    const manifest = parseWestManifest(source);
    const projects = manifest.projects ?? [];

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: projects.map((project, index) =>
        index === 0 ? { ...project, revision: "v4.0.0" } : project,
      ),
    });

    expect(updated).to.contain("revision: v4.0.0");
    expect(updated).to.contain("# the RTOS itself");
    expect(updated).to.contain("# pinned for release");
    expect(updated).to.contain("# vendor HAL");
  });

  it("appends a sequence entry without rewriting the existing ones", () => {
    const source =
      "manifest:\n" + "  projects:\n" + "    - name: zephyr # do not touch\n";

    const manifest = parseWestManifest(source);

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: [...(manifest.projects ?? []), { name: "hal_stm32" }],
    });

    expect(updated).to.contain("# do not touch");
    expect(parseWestManifest(updated).projects).to.have.lengthOf(2);
  });

  it("does not graft a deleted entry's keys onto the entry that follows it", () => {
    // Entries are reconciled by position, so removing one shifts every later
    // entry onto the node of its predecessor. A key the deleted entry carried
    // must not survive there.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      revision: v3.7.0\n" +
      "      path: modules/zephyr\n" +
      "    - name: hal_adi\n";

    const manifest = parseWestManifest(source);
    const projects = manifest.projects ?? [];

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: projects.filter((project) => project.name !== "zephyr"),
    });

    const remaining = parseWestManifest(updated).projects ?? [];

    expect(remaining).to.have.lengthOf(1);
    expect(remaining[0].name).to.equal("hal_adi");
    expect(remaining[0].revision).to.equal(undefined);
    expect(remaining[0].path).to.equal(undefined);
  });

  it("does not graft keys when a deletion and an addition cancel out", () => {
    // Edits are debounced, so a removal and an addition can reach us as a
    // single write whose sequence is the same length as the document's.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      revision: v3.7.0\n" +
      "    - name: hal_adi\n";

    const manifest = parseWestManifest(source);

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: [{ name: "hal_adi" }, { name: "hal_stm32" }],
    });

    const projects = parseWestManifest(updated).projects ?? [];

    expect(projects.map((project) => project.name)).to.deep.equal([
      "hal_adi",
      "hal_stm32",
    ]);
    expect(projects[0].revision).to.equal(undefined);
  });

  it("clears a nested mapping inside an entry that shifted", () => {
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      userdata:\n" +
      "        owner: rtos\n" +
      "    - name: hal_adi\n" +
      "      userdata:\n" +
      "        maintained: no\n";

    const manifest = parseWestManifest(source);
    const projects = manifest.projects ?? [];

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: projects.filter((project) => project.name !== "zephyr"),
    });

    expect(parseWestManifest(updated).projects?.[0].userdata).to.deep.equal({
      maintained: "no",
    });
  });

  it("keeps an entry's comment and untouched keys when it is renamed", () => {
    // A rename is still the same entry, so nothing about it may be rebuilt.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr # pinned for release\n" +
      "      revision: v3.7.0\n" +
      "      clone-depth: 1\n";

    const manifest = parseWestManifest(source);
    const projects = manifest.projects ?? [];

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: [{ ...projects[0], name: "zephyr-fork" }],
    });

    expect(updated).to.contain("# pinned for release");
    expect(parseWestManifest(updated).projects?.[0]).to.have.property(
      "clone-depth",
      "1",
    );
  });

  it("removes a key that is explicitly cleared", () => {
    const manifest = parseWestManifest(MANIFEST);

    const updated = applyManifestEdits(MANIFEST, {
      ...manifest,
      version: undefined,
    });

    expect(parseWestManifest(updated).version).to.equal(undefined);
    expect(updated).to.not.match(/^\s*version:/m);
  });

  it("leaves omitted keys alone rather than deleting them", () => {
    // A partial manifest must not be read as "delete everything else".
    const updated = applyManifestEdits(MANIFEST, { self: { path: "app" } });

    const manifest = parseWestManifest(updated);

    expect(manifest.self?.path).to.equal("app");
    expect(manifest.projects).to.have.lengthOf(1);
    expect(manifest.remotes).to.have.lengthOf(1);
    expect(manifest.version).to.equal("0.13");
  });

  it("carries unmodelled keys through a write-back", () => {
    const source =
      "manifest:\n" +
      "  self:\n" +
      "    path: app\n" +
      "    west-commands: scripts/west-commands.yml\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      submodules: true\n";

    const updated = applyManifestEdits(source, {
      ...parseWestManifest(source),
      self: { path: "application" },
    });

    expect(updated).to.contain("west-commands: scripts/west-commands.yml");
    expect(updated).to.contain("submodules: true");
  });

  it("round-trips the richer shapes west's schema allows", () => {
    // `import`, `submodules` and `userdata` are typed `any` by west's own
    // schema, so they are the structures most likely to break a node-by-node
    // write-back.
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      repo-path: zephyr-rtos\n" +
      "      clone-depth: 1\n" +
      "      west-commands: scripts/west-commands.yml\n" +
      "      groups:\n" +
      "        - optional\n" +
      "      submodules:\n" +
      "        - path: lib/foo\n" +
      "          name: foo\n" +
      "      import:\n" +
      "        file: submanifest.yml\n" +
      "        name-allowlist:\n" +
      "          - hal_stm32\n" +
      "      userdata:\n" +
      "        vendor:\n" +
      "          tier: 2\n" +
      "  self:\n" +
      "    import: manifests/extra.yml\n" +
      "    userdata: anything\n";

    const manifest = parseWestManifest(source);
    const project = manifest.projects?.[0];

    expect(project?.["repo-path"]).to.equal("zephyr-rtos");
    expect(project?.["clone-depth"]).to.equal("1");
    expect(project?.groups).to.deep.equal(["optional"]);
    expect(project?.submodules).to.equal("- path: lib/foo\n  name: foo");
    expect(project?.import).to.deep.equal({
      file: "submanifest.yml",
      "name-allowlist": ["hal_stm32"],
    });
    expect(project?.userdata).to.deep.equal({ vendor: { tier: "2" } });
    expect(manifest.self?.import).to.equal("manifests/extra.yml");

    // and all of it survives a write-back untouched
    expect(applyManifestEdits(source, manifest)).to.equal(source);
  });

  it("does not corrupt a short SHA with a leading zero", () => {
    // `revision: 0123456` resolves to the number 123456; writing that number
    // back would silently point the project at a different commit.
    const source =
      "manifest:\n  projects:\n    - name: zephyr\n      revision: 0123456\n";

    const manifest = parseWestManifest(source);

    expect(manifest.projects?.[0].revision).to.equal("0123456");

    // an edit elsewhere in the file must leave the revision line untouched -
    // not merely equivalent, but character for character
    const updated = applyManifestEdits(source, {
      ...manifest,
      self: { path: "app" },
    });

    expect(updated).to.contain("revision: 0123456");
    expect(updated).to.not.contain('"0123456"');
  });

  it("reads an all-digit revision as the text it is", () => {
    // Parsed with YAML's failsafe schema, so a numeric-looking SHA never
    // becomes a number that could be reformatted on the way out.
    const source =
      "manifest:\n  projects:\n    - name: zephyr\n      revision: 1234567\n";

    expect(parseWestManifest(source).projects?.[0].revision).to.equal(
      "1234567",
    );
    expect(applyManifestEdits(source, parseWestManifest(source))).to.equal(
      source,
    );
  });

  it("does not reformat flow collections", () => {
    // YAML pads flow collections by default, which would show up as a
    // spurious `[ -optional ]` diff the first time the file was edited.
    const source =
      "manifest:\n" +
      "  group-filter: [-optional, +ci]\n" +
      "  projects:\n" +
      "    - name: zephyr\n" +
      "      groups: [a, b]\n";

    expect(applyManifestEdits(source, parseWestManifest(source))).to.equal(
      source,
    );
  });

  it("carries submodules as text in both of its forms", () => {
    const flag =
      "manifest:\n  projects:\n    - name: z\n      submodules: true\n";
    const list =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: z\n" +
      "      submodules:\n" +
      "        - path: lib/foo\n" +
      "          name: foo\n";

    expect(parseWestManifest(flag).projects?.[0].submodules).to.equal("true");
    expect(parseWestManifest(list).projects?.[0].submodules).to.equal(
      "- path: lib/foo\n  name: foo",
    );

    // and neither form is disturbed by a write-back
    for (const source of [flag, list]) {
      expect(applyManifestEdits(source, parseWestManifest(source))).to.equal(
        source,
      );
    }
  });

  it("writes an edited submodules block back as YAML", () => {
    const source =
      "manifest:\n" +
      "  projects:\n" +
      "    - name: z\n" +
      "      submodules:\n" +
      "        - path: lib/foo\n";

    const manifest = parseWestManifest(source);
    const projects = manifest.projects ?? [];

    const updated = applyManifestEdits(source, {
      ...manifest,
      projects: [
        { ...projects[0], submodules: "- path: lib/foo\n- path: lib/bar" },
      ],
    });

    // the text form is expanded back into real nodes, not dumped as a string
    expect(updated).to.contain("- path: lib/bar");
    expect(updated).to.not.contain("submodules: ");
    expect(parseWestManifest(updated).projects?.[0].submodules).to.equal(
      "- path: lib/foo\n- path: lib/bar",
    );
  });

  it("rejects a document whose root is not a mapping", () => {
    expect(() => applyManifestEdits("- one\n- two\n", {})).to.throw(
      /top-level mapping/,
    );
  });
});

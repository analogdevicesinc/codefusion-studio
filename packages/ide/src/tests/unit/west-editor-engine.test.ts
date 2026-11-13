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

import { after, before, describe, it } from "mocha";
import { expect } from "chai";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  GitClient,
  WestClient,
} from "../../zephyr/west-editor/west/clients";
import { WestEngine } from "../../zephyr/west-editor/west/engine";
import { WestEngineError } from "../../zephyr/west-editor/west/errors";
import { GitCli } from "../../zephyr/west-editor/west/git-cli";
import { WestCli } from "../../zephyr/west-editor/west/west-cli";
import type {
  CommandResult,
  RunOptions,
} from "../../zephyr/west-editor/west/runner";
import type { WestManifest } from "../../zephyr/west-editor/types";
import {
  FakeRunner,
  type RunCall,
  createLayout,
  createTempDir,
} from "./west-editor-test-utils";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

/** A project as `west list` reports it, and what git says about it. */
type FakeProject = {
  name: string;
  cloned?: boolean;
  active?: boolean;
  head?: string;
  manifestRev?: string;
  /** As written in west.yml; "main" is a branch. */
  revision?: string;
  /** The commit a tag or short SHA `revision` names; absent when it is not fetched. */
  resolvesTo?: string;
  status?: string;
};

/** An open manifest naming no projects, so only west's list is classified. */
const MANIFEST: WestManifest = {};

describe("WestEngine.getProjectStatuses", () => {
  let topdir: string;
  let manifestPath: string;

  before(async () => {
    topdir = await createTempDir("west-engine-");
    await createLayout(topdir, [
      ".west/",
      "app/west.yml",
      "zephyr/.git/",
      "tools/bsim/.git/",
    ]);
    manifestPath = path.join(topdir, "app/west.yml");
  });

  after(async () => {
    await fs.rm(topdir, { recursive: true, force: true });
  });

  /** Answers west list with `projects`, and git per project directory. */
  function workspace(projects: FakeProject[]) {
    const byDir = new Map(
      projects.map((project) => [path.join(topdir, project.name), project]),
    );

    return (call: RunCall): Partial<CommandResult> => {
      if (call.command === "west") {
        return {
          stdout: projects
            .map(({ name, cloned = true, active = true, revision = "main" }) =>
              [
                name,
                name,
                path.join(topdir, name),
                revision,
                cloned ? "cloned" : "not-cloned",
                active ? "active" : "inactive",
              ].join("\t"),
            )
            .join("\n"),
        };
      }

      const project = byDir.get(call.cwd);

      if (!project) throw new Error(`unexpected git call in ${call.cwd}`);

      const { revision = "main", resolvesTo } = project;

      // GitCli.resolve: the ref's full name, then the commit it names.
      if (call.args.includes("--symbolic-full-name")) {
        if (revision === "main") return { stdout: "refs/heads/main\n" };

        if (!resolvesTo) return { exitCode: 1 };

        // git prints no name for a SHA, only for a ref.
        return /^[0-9a-f]+$/.test(revision)
          ? { stdout: "\n" }
          : { stdout: `refs/tags/${revision}\n` };
      }

      if (call.args.at(-1)?.endsWith("^{commit}")) {
        return resolvesTo ? { stdout: `${resolvesTo}\n` } : { exitCode: 1 };
      }

      if (call.args[0] === "rev-parse") {
        const { head = SHA_A, manifestRev = SHA_A } = project;

        return { stdout: `${head}\n${manifestRev}\n` };
      }

      return { stdout: project.status ?? "" };
    };
  }

  /** The engine on the command-line clients, fed canned output by `runner`. */
  const engine = (
    runner: Pick<FakeRunner, "run">,
    onProjectError?: (name: string, error: unknown) => void,
  ) =>
    new WestEngine(
      { getEnvironment: async () => ({}), onProjectError },
      { west: new WestCli(runner), git: new GitCli(runner) },
    );

  it("reads west and git through any clients it is given", async () => {
    const west: WestClient = {
      listProjects: async () => [
        {
          name: "lib",
          path: "lib",
          abspath: "/elsewhere/lib",
          revision: "main",
          cloned: true,
          active: true,
        },
      ],
    };
    const git: GitClient = {
      revisions: async () => ({ head: SHA_A, manifestRev: SHA_B }),
      changes: async () => ({ modified: false, untracked: false }),
      resolve: async () => undefined,
    };

    const result = await new WestEngine(
      { getEnvironment: async () => ({}) },
      { west, git },
    ).getProjectStatuses(manifestPath, MANIFEST);

    expect(result).to.deep.equal({
      statuses: { lib: "different-revision" },
    });
  });

  it("gives every badge from west and git output", async () => {
    const runner = new FakeRunner(
      workspace([
        { name: "synced" },
        { name: "moved", head: SHA_B },
        { name: "edited", status: " M main.c\n" },
        { name: "littered", status: "?? scratch.txt\n" },
        { name: "missing", cloned: false },
        { name: "off", active: false },
      ]),
    );

    expect(
      await engine(runner).getProjectStatuses(manifestPath, MANIFEST),
    ).to.deep.equal({
      statuses: {
        synced: "in-sync",
        moved: "different-revision",
        edited: "modified-files",
        littered: "untracked-files",
        missing: "not-cloned",
        off: "disabled",
      },
    });
  });

  it("compares manifest-rev with the commit west.yml names, unless it is a branch", async () => {
    // Every project has HEAD and manifest-rev at SHA_A.
    const runner = new FakeRunner(
      workspace([
        { name: "tagged", revision: "v1.0.0", resolvesTo: SHA_A },
        { name: "retagged", revision: "v2.0.0", resolvesTo: SHA_B },
        { name: "unfetched", revision: "v3.0.0" },
        { name: "pinned", revision: SHA_A },
        { name: "repinned", revision: SHA_B },
        { name: "short", revision: SHA_A.slice(0, 7), resolvesTo: SHA_A },
        { name: "reshort", revision: SHA_B.slice(0, 7), resolvesTo: SHA_B },
        { name: "tracking", revision: "main" },
      ]),
    );

    expect(
      await engine(runner).getProjectStatuses(manifestPath, MANIFEST),
    ).to.deep.equal({
      statuses: {
        tagged: "in-sync",
        retagged: "different-revision",
        // A tag not fetched yet cannot be resolved offline, like a branch.
        unfetched: "in-sync",
        pinned: "in-sync",
        // Not fetched yet: a full SHA still counts.
        repinned: "different-revision",
        short: "in-sync",
        reshort: "different-revision",
        tracking: "in-sync",
      },
    });
  });

  it("runs west in the topdir and git only for active, cloned projects", async () => {
    const runner = new FakeRunner(
      workspace([
        { name: "synced" },
        { name: "missing", cloned: false },
        { name: "off", active: false },
      ]),
    );

    await engine(runner).getProjectStatuses(manifestPath, MANIFEST);

    expect(runner.calls.find((call) => call.command === "west")?.cwd).to.equal(
      topdir,
    );
    expect([
      ...new Set(
        runner.calls
          .filter((call) => call.command === "git")
          .map((call) => call.cwd),
      ),
    ]).to.deep.equal([path.join(topdir, "synced")]);
  });

  describe("projects of the open file that west does not list", () => {
    // tools/bsim/.git exists in the layout; missing is nowhere on disk.
    const BSIM = { name: "bsim", path: "tools/bsim", revision: "0673623" };

    /** An engine on fake clients: west lists nothing, git answers as given. */
    function unlistedEngine(git: Partial<GitClient> = {}, scope?: "workspace") {
      const resolved: string[] = [];
      const engine = new WestEngine(
        { getEnvironment: async () => ({}), scope },
        {
          west: { listProjects: async () => [] },
          git: {
            revisions: async () => ({ head: SHA_A }),
            changes: async () => ({ modified: false, untracked: false }),
            resolve: async (_dir, revision) => {
              resolved.push(revision);

              return SHA_A;
            },
            ...git,
          },
        },
      );

      return { engine, resolved };
    }

    it("judges one on disk against the file's revision, and a missing one as Not Cloned", async () => {
      const { engine, resolved } = unlistedEngine();

      const { statuses } = await engine.getProjectStatuses(manifestPath, {
        projects: [BSIM, { name: "missing" }],
      });

      expect(statuses).to.deep.equal({
        bsim: "in-sync",
        missing: "not-cloned",
      });
      expect(resolved).to.deep.equal(["0673623"]);
    });

    it("gives Different Revision when HEAD is elsewhere", async () => {
      const { engine } = unlistedEngine({
        revisions: async () => ({ head: SHA_B }),
      });

      const { statuses } = await engine.getProjectStatuses(manifestPath, {
        projects: [BSIM],
      });

      expect(statuses).to.deep.equal({ bsim: "different-revision" });
    });

    it("reports local changes", async () => {
      const { engine } = unlistedEngine({
        changes: async () => ({ modified: false, untracked: true }),
      });

      const { statuses } = await engine.getProjectStatuses(manifestPath, {
        projects: [BSIM],
      });

      expect(statuses).to.deep.equal({ bsim: "untracked-files" });
    });

    it("gives no badge when the revision cannot be resolved offline", async () => {
      const { engine } = unlistedEngine({ resolve: async () => undefined });

      const { statuses } = await engine.getProjectStatuses(manifestPath, {
        projects: [BSIM],
      });

      expect(statuses).to.deep.equal({});
    });

    it("falls back to the file's default revision, then to master", async () => {
      const bsim = { name: "bsim", path: "tools/bsim" };
      const withDefault = unlistedEngine();
      const without = unlistedEngine();

      await withDefault.engine.getProjectStatuses(manifestPath, {
        defaults: { revision: "v3.7.0" },
        projects: [bsim],
      });
      await without.engine.getProjectStatuses(manifestPath, {
        projects: [bsim],
      });

      expect(withDefault.resolved).to.deep.equal(["v3.7.0"]);
      expect(without.resolved).to.deep.equal(["master"]);
    });

    it("gives them no status in workspace scope", async () => {
      const { engine, resolved } = unlistedEngine({}, "workspace");

      const { statuses } = await engine.getProjectStatuses(manifestPath, {
        projects: [BSIM, { name: "missing" }],
      });

      expect(statuses).to.deep.equal({});
      expect(resolved).to.deep.equal([]);
    });
  });

  it("drops only the badge of a project git cannot read", async () => {
    const failures: string[] = [];
    const answer = workspace([{ name: "synced" }, { name: "broken" }]);
    const runner = new FakeRunner((call) =>
      call.cwd.endsWith("broken")
        ? { exitCode: 128, stderr: "fatal: bad object" }
        : answer(call),
    );

    // Listed by west, so a git failure must not turn it into Not Cloned.
    const result = await engine(runner, (name) =>
      failures.push(name),
    ).getProjectStatuses(manifestPath, { projects: [{ name: "broken" }] });

    expect(result).to.deep.equal({ statuses: { synced: "in-sync" } });
    expect(failures).to.deep.equal(["broken"]);
  });

  it("reports a file outside any workspace", async () => {
    const outside = await createTempDir("west-engine-outside-");

    try {
      const result = await engine(
        new FakeRunner(() => ({})),
      ).getProjectStatuses(path.join(outside, "west.yml"), MANIFEST);

      expect(result.statuses).to.deep.equal({});
      expect(result.unavailable?.reason).to.equal("not-a-workspace");
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  });

  it("falls back to the disk for Not cloned when west fails", async () => {
    const runner = new FakeRunner(() => {
      throw new WestEngineError("not-installed", "west was not found");
    });

    const result = await engine(runner).getProjectStatuses(manifestPath, {
      projects: [
        { name: "zephyr" },
        { name: "hal", path: "modules/hal" },
        { name: "lib" },
      ],
    });

    expect(result).to.deep.equal({
      statuses: { hal: "not-cloned", lib: "not-cloned" },
      unavailable: { reason: "not-installed", message: "west was not found" },
    });
  });

  it("reports west's own failure as failed", async () => {
    const runner = new FakeRunner(() => ({ exitCode: 1, stderr: "FATAL" }));

    const result = await engine(runner).getProjectStatuses(
      manifestPath,
      MANIFEST,
    );

    expect(result.unavailable?.reason).to.equal("failed");
  });

  it("checks at most four projects at once", async () => {
    const answer = workspace(
      Array.from({ length: 10 }, (_, index) => ({ name: `p${index}` })),
    );
    let running = 0;
    let peak = 0;
    const runner = {
      async run(
        command: string,
        args: string[],
        { cwd }: RunOptions,
      ): Promise<CommandResult> {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running--;

        return {
          stdout: "",
          stderr: "",
          exitCode: 0,
          ...answer({ command, args, cwd }),
        };
      },
    };

    const { statuses } = await engine(runner).getProjectStatuses(
      manifestPath,
      MANIFEST,
    );

    expect(Object.keys(statuses)).to.have.length(10);
    expect(peak).to.equal(8); // four projects, two git processes each
  });

  it("rejects when cancelled instead of dropping badges", async () => {
    const answer = workspace([{ name: "synced" }]);
    const runner = new FakeRunner((call) => {
      if (call.command === "git") {
        throw new WestEngineError("aborted", "git was cancelled");
      }

      return answer(call);
    });

    try {
      await engine(runner).getProjectStatuses(manifestPath, MANIFEST);
    } catch (error) {
      expect((error as WestEngineError).kind).to.equal("aborted");

      return;
    }

    throw new Error("expected a rejection");
  });
});

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
import { WestEngineError } from "../../zephyr/west-editor/west/errors";
import { GitCli } from "../../zephyr/west-editor/west/git-cli";
import type { CommandResult } from "../../zephyr/west-editor/west/runner";
import { FakeRunner } from "./west-editor-test-utils";

const DIR = "/ws/zephyr";
const SHA_A = "6d2e535ecbc89ac789eeffc4a2f065b4fb6cee1c";
const SHA_B = "1c1840af7a7e757d6e2fec3ddb0e5ce0dfcc93c8";

const answering = (result: Partial<CommandResult>) =>
  new GitCli(new FakeRunner(() => result));

describe("GitCli.revisions", () => {
  it("runs one rev-parse for HEAD and manifest-rev in the project", async () => {
    const runner = new FakeRunner(() => ({ stdout: `${SHA_A}\n${SHA_A}\n` }));

    await new GitCli(runner).revisions(DIR);

    expect(runner.calls).to.deep.equal([
      {
        command: "git",
        args: ["rev-parse", "HEAD", "refs/heads/manifest-rev"],
        cwd: DIR,
      },
    ]);
  });

  it("reads both commits", async () => {
    expect(
      await answering({ stdout: `${SHA_A}\n${SHA_B}\n` }).revisions(DIR),
    ).to.deep.equal({ head: SHA_A, manifestRev: SHA_B });
  });

  it("leaves manifestRev out when west update never set it", async () => {
    // What git prints: HEAD's id, then the unresolved ref echoed by name.
    const result = await answering({
      exitCode: 128,
      stdout: `${SHA_A}\nrefs/heads/manifest-rev\n`,
      stderr: "fatal: ambiguous argument 'refs/heads/manifest-rev'",
    }).revisions(DIR);

    expect(result).to.deep.equal({ head: SHA_A, manifestRev: undefined });
  });

  it("leaves head out in a repository with no commit", async () => {
    const result = await answering({
      exitCode: 128,
      stdout: "HEAD\nrefs/heads/manifest-rev\n",
    }).revisions(DIR);

    expect(result).to.deep.equal({ head: undefined, manifestRev: undefined });
  });

  it("accepts SHA-256 commit ids", async () => {
    const sha256 = "a".repeat(64);

    expect(
      await answering({ stdout: `${sha256}\n${sha256}\n` }).revisions(DIR),
    ).to.deep.equal({ head: sha256, manifestRev: sha256 });
  });

  it("fails when git prints nothing, as outside a repository", async () => {
    try {
      await answering({
        exitCode: 128,
        stderr: "fatal: not a git repository",
      }).revisions(DIR);
    } catch (error) {
      expect(error).to.be.instanceOf(WestEngineError);
      expect((error as WestEngineError).stderr).to.equal(
        "fatal: not a git repository",
      );

      return;
    }

    throw new Error("expected a rejection");
  });
});

describe("GitCli.changes", () => {
  const cases: Array<
    [name: string, stdout: string, modified: boolean, untracked: boolean]
  > = [
    ["a clean tree", "", false, false],
    ["untracked files only", "?? new.c\n?? notes/\n", false, true],
    ["a modified file", " M src/main.c\n", true, false],
    ["a staged file", "M  src/main.c\n", true, false],
    ["a deleted file", " D old.c\n", true, false],
    ["a modified submodule", " M modules/lib\n", true, false],
    ["both", " M src/main.c\r\n?? new.c\r\n", true, true],
  ];

  for (const [name, stdout, modified, untracked] of cases) {
    it(`reads ${name}`, async () => {
      expect(await answering({ stdout }).changes(DIR)).to.deep.equal({
        modified,
        untracked,
      });
    });
  }

  it("runs git status --porcelain in the project", async () => {
    const runner = new FakeRunner(() => ({}));

    await new GitCli(runner, "/sdk/git").changes(DIR);

    expect(runner.calls).to.deep.equal([
      { command: "/sdk/git", args: ["status", "--porcelain"], cwd: DIR },
    ]);
  });

  it("fails when git status fails", async () => {
    try {
      await answering({ exitCode: 128, stderr: "fatal: bad" }).changes(DIR);
    } catch (error) {
      expect((error as WestEngineError).kind).to.equal("failed");

      return;
    }

    throw new Error("expected a rejection");
  });
});

describe("GitCli.resolve", () => {
  /** Answers rev-parse as git does for a revision of the given kind. */
  const revParse = (symbolic: string, commit: string, found = true) =>
    new FakeRunner((call) => {
      if (!found) return { exitCode: 1 };

      return call.args.includes("--symbolic-full-name")
        ? { stdout: `${symbolic}\n` }
        : { stdout: `${commit}\n` };
    });

  it("resolves a SHA to its commit", async () => {
    const runner = revParse("", SHA_A);

    expect(await new GitCli(runner).resolve(DIR, "6d2e535")).to.equal(SHA_A);
    expect(runner.calls.map(({ args }) => args)).to.deep.equal([
      ["rev-parse", "--verify", "--quiet", "--symbolic-full-name", "6d2e535"],
      ["rev-parse", "--verify", "--quiet", "6d2e535^{commit}"],
    ]);
  });

  it("peels a full SHA locally, with one rev-parse", async () => {
    const runner = revParse("", SHA_B);

    expect(await new GitCli(runner).resolve(DIR, SHA_B)).to.equal(SHA_B);
    expect(runner.calls.map(({ args }) => args)).to.deep.equal([
      ["rev-parse", "--verify", "--quiet", `${SHA_B}^{commit}`],
    ]);
  });

  it("resolves an annotated tag's full object ID to its commit", async () => {
    // The tag object's own ID, as `git rev-parse v1.0.0` prints it.
    const tagObject = "f".repeat(40);

    expect(
      await new GitCli(revParse("", SHA_A)).resolve(DIR, tagObject),
    ).to.equal(SHA_A);
  });

  it("takes a full SHA not in the repository as written", async () => {
    expect(
      await new GitCli(revParse("", "", false)).resolve(DIR, SHA_B),
    ).to.equal(SHA_B);
  });

  it("resolves a tag to the commit it points to", async () => {
    expect(
      await new GitCli(revParse("refs/tags/v3.7.0", SHA_B)).resolve(
        DIR,
        "v3.7.0",
      ),
    ).to.equal(SHA_B);
  });

  it("does not resolve a branch, which may be stale locally", async () => {
    const runner = revParse("refs/heads/main", SHA_A);

    expect(await new GitCli(runner).resolve(DIR, "main")).to.equal(undefined);
    expect(runner.calls).to.have.length(1);
  });

  it("does not resolve a remote-tracking branch", async () => {
    expect(
      await new GitCli(revParse("refs/remotes/origin/main", SHA_A)).resolve(
        DIR,
        "origin/main",
      ),
    ).to.equal(undefined);
  });

  it("gives nothing for a name the repository does not know", async () => {
    expect(
      await new GitCli(revParse("", "", false)).resolve(DIR, "v9.9.9"),
    ).to.equal(undefined);
  });

  it("never passes a revision that git would read as an option", async () => {
    const runner = revParse("", SHA_A);

    expect(await new GitCli(runner).resolve(DIR, "--all")).to.equal(undefined);
    expect(runner.calls).to.deep.equal([]);
  });
});

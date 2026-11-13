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
import { WestCli } from "../../zephyr/west-editor/west/west-cli";
import { FakeRunner, type RunCall } from "./west-editor-test-utils";

const TOPDIR = "/ws";

/** Tab-joined `west list` output, one line per row. */
const rows = (...lines: string[][]) =>
  lines.map((fields) => fields.join("\t")).join("\n") + "\n";

const isAllList = ({ args }: RunCall) => args.includes("--all");
const asksForActive = ({ args }: RunCall) =>
  args.at(-1)?.includes("{active}") ?? false;

/** How west before 1.4 answers a format string with `{active}`. */
const NO_ACTIVE_KEY = {
  exitCode: 1,
  stderr: 'FATAL ERROR: unknown key "active" in format string',
};

async function rejection(promise: Promise<unknown>): Promise<WestEngineError> {
  try {
    await promise;
  } catch (error) {
    expect(error).to.be.instanceOf(WestEngineError);

    return error as WestEngineError;
  }

  throw new Error("expected a rejection");
}

describe("WestCli.listProjects", () => {
  it("runs one west list --all in the topdir, fields tab-separated", async () => {
    const runner = new FakeRunner(() => ({}));

    await new WestCli(runner).listProjects(TOPDIR);

    expect(runner.calls).to.deep.equal([
      {
        command: "west",
        args: [
          "list",
          "--all",
          "-f",
          "{name}\t{path}\t{abspath}\t{revision}\t{cloned}\t{active}",
        ],
        cwd: TOPDIR,
      },
    ]);
  });

  it("parses each project and drops the manifest repository", async () => {
    const runner = new FakeRunner(() => ({
      stdout: rows(
        ["manifest", "app", "/ws/app", "HEAD", "cloned", "active"],
        ["zephyr", "zephyr", "/ws/zephyr", "main", "cloned", "active"],
        [
          "hal x",
          "modules/hal x",
          "/ws/modules/hal x",
          "v1",
          "not-cloned",
          "active",
        ],
        ["opt", "opt", "/ws/opt", "abc123", "cloned", "inactive"],
      ),
    }));

    expect(await new WestCli(runner).listProjects(TOPDIR)).to.deep.equal([
      {
        name: "zephyr",
        path: "zephyr",
        abspath: "/ws/zephyr",
        revision: "main",
        cloned: true,
        active: true,
      },
      {
        name: "hal x",
        path: "modules/hal x",
        abspath: "/ws/modules/hal x",
        revision: "v1",
        cloned: false,
        active: true,
      },
      {
        name: "opt",
        path: "opt",
        abspath: "/ws/opt",
        revision: "abc123",
        cloned: true,
        active: false,
      },
    ]);
  });

  it("reads Windows line endings", async () => {
    const runner = new FakeRunner(() => ({
      stdout: "zephyr\tzephyr\tC:\\ws\\zephyr\tmain\tcloned\tactive\r\n",
    }));

    const [project] = await new WestCli(runner).listProjects(TOPDIR);

    expect(project.abspath).to.equal("C:\\ws\\zephyr");
    expect(project.active).to.equal(true);
  });

  it("uses the configured west command", async () => {
    const runner = new FakeRunner(() => ({}));

    await new WestCli(runner, "/sdk/bin/west").listProjects(TOPDIR);

    expect(runner.calls[0].command).to.equal("/sdk/bin/west");
  });

  it("falls back to diffing two lists on west older than 1.4", async () => {
    const runner = new FakeRunner((call) => {
      if (asksForActive(call)) return NO_ACTIVE_KEY;

      return isAllList(call)
        ? {
            stdout: rows(
              ["manifest", "app", "/ws/app", "HEAD", "cloned"],
              ["zephyr", "zephyr", "/ws/zephyr", "main", "cloned"],
              ["opt", "opt", "/ws/opt", "v1", "not-cloned"],
            ),
          }
        : { stdout: rows(["manifest"], ["zephyr"]) };
    });

    const projects = await new WestCli(runner).listProjects(TOPDIR);

    expect(
      projects.map(({ name, active }) => ({ name, active })),
    ).to.deep.equal([
      { name: "zephyr", active: true },
      { name: "opt", active: false },
    ]);
    expect(runner.calls.map(({ args }) => args)).to.deep.equal([
      [
        "list",
        "--all",
        "-f",
        "{name}\t{path}\t{abspath}\t{revision}\t{cloned}\t{active}",
      ],
      [
        "list",
        "--all",
        "-f",
        "{name}\t{path}\t{abspath}\t{revision}\t{cloned}",
      ],
      ["list", "-f", "{name}"],
    ]);
  });

  it("reports any other failure with west's stderr", async () => {
    const runner = new FakeRunner(() => ({
      exitCode: 1,
      stderr: "FATAL ERROR: no west workspace found",
    }));

    const error = await rejection(new WestCli(runner).listProjects(TOPDIR));

    expect(error.kind).to.equal("failed");
    expect(error.stderr).to.equal("FATAL ERROR: no west workspace found");
  });

  it("reports a failure in the fallback lists", async () => {
    const runner = new FakeRunner((call) => {
      if (asksForActive(call)) return NO_ACTIVE_KEY;

      return isAllList(call) ? { exitCode: 1, stderr: "boom" } : {};
    });

    expect(
      (await rejection(new WestCli(runner).listProjects(TOPDIR))).stderr,
    ).to.equal("boom");
  });

  it("rejects output it cannot read rather than guessing", async () => {
    const runner = new FakeRunner(() => ({ stdout: "zephyr\tzephyr\n" }));

    expect(
      (await rejection(new WestCli(runner).listProjects(TOPDIR))).kind,
    ).to.equal("failed");
  });
});

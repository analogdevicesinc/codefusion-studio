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
import * as os from "node:os";
import * as path from "node:path";
import { WestEngineError } from "../../zephyr/west-editor/west/errors";
import {
  CommandRunner,
  mergeEnvironment,
} from "../../zephyr/west-editor/west/runner";

// Under the VS Code test host, process.execPath is Electron; this makes it act as node.
const NODE_ENV = { ELECTRON_RUN_AS_NODE: "1" };

function runner(timeoutMs?: number, extra: Record<string, string> = {}) {
  return new CommandRunner({
    getEnvironment: async () => ({ ...NODE_ENV, ...extra }),
    timeoutMs,
  });
}

/** Runs a node script through the runner. */
function runScript(script: string, target = runner(), signal?: AbortSignal) {
  return target.run(process.execPath, ["-e", script], {
    cwd: os.tmpdir(),
    signal,
  });
}

async function rejection(promise: Promise<unknown>): Promise<WestEngineError> {
  try {
    await promise;
  } catch (error) {
    expect(error).to.be.instanceOf(WestEngineError);

    return error as WestEngineError;
  }

  throw new Error("expected a rejection");
}

describe("mergeEnvironment", () => {
  it("overrides and adds names, keeping the rest", () => {
    expect(
      mergeEnvironment({ A: "1", B: "2" }, { B: "3", C: "4" }, "linux"),
    ).to.deep.equal({ A: "1", B: "3", C: "4" });
  });

  it("treats names as case-sensitive outside Windows", () => {
    expect(
      mergeEnvironment({ Path: "old" }, { PATH: "new" }, "darwin"),
    ).to.deep.equal({ Path: "old", PATH: "new" });
  });

  it("replaces Path with PATH on Windows instead of keeping both", () => {
    expect(
      mergeEnvironment({ Path: "old", Other: "x" }, { PATH: "new" }, "win32"),
    ).to.deep.equal({ Other: "x", PATH: "new" });
  });

  it("drops undefined values, and unsets a name overridden with one", () => {
    expect(
      mergeEnvironment({ A: "1", B: undefined }, { A: undefined }, "linux"),
    ).to.deep.equal({});
  });

  it("keeps the base when the host adds nothing", () => {
    expect(mergeEnvironment({ A: "1" }, undefined, "linux")).to.deep.equal({
      A: "1",
    });
  });
});

describe("CommandRunner", function () {
  this.timeout(20_000);

  it("returns stdout, stderr and the exit code without throwing", async () => {
    const result = await runScript(
      "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)",
    );

    expect(result).to.deep.equal({ stdout: "out", stderr: "err", exitCode: 3 });
  });

  it("runs in the given directory", async () => {
    const result = await runScript("process.stdout.write(process.cwd())");

    // realpath: on macOS the temp directory sits behind a symlink.
    expect(await fs.realpath(result.stdout)).to.equal(
      await fs.realpath(os.tmpdir()),
    );
  });

  it("passes the host's variables to the command", async () => {
    const result = await runScript(
      "process.stdout.write(process.env.WEST_TEST_VALUE)",
      runner(undefined, { WEST_TEST_VALUE: "from-host" }),
    );

    expect(result.stdout).to.equal("from-host");
  });

  it("passes arguments verbatim, tabs and braces included", async () => {
    const format = "{name}\t{path}";
    const result = await runner().run(
      process.execPath,
      ["-e", "process.stdout.write(process.argv[1])", format],
      { cwd: os.tmpdir() },
    );

    expect(result.stdout).to.equal(format);
  });

  it("reports a missing binary as not-installed", async () => {
    const error = await rejection(
      runner().run("west-editor-no-such-command", [], { cwd: os.tmpdir() }),
    );

    expect(error.kind).to.equal("not-installed");
  });

  it("reports a missing directory as failed, not as a missing binary", async () => {
    const error = await rejection(
      runner().run(process.execPath, ["-e", ""], {
        cwd: path.join(os.tmpdir(), "west-editor-no-such-dir"),
      }),
    );

    expect(error.kind).to.equal("failed");
  });

  it("kills a command that runs past the timeout, keeping its stderr", async () => {
    const error = await rejection(
      runScript(
        "process.stderr.write('started'); setTimeout(() => {}, 10000)",
        runner(500),
      ),
    );

    expect(error.kind).to.equal("timeout");
    expect(error.stderr).to.equal("started");
  });

  it("kills a command when cancelled", async () => {
    const controller = new AbortController();
    const pending = runScript(
      "setTimeout(() => {}, 10000)",
      runner(),
      controller.signal,
    );

    setTimeout(() => controller.abort(), 200);

    expect((await rejection(pending)).kind).to.equal("aborted");
  });

  it("does not start a command that is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await rejection(runScript("", runner(), controller.signal));

    expect(error.kind).to.equal("aborted");
  });

  it("does not start a command cancelled while the environment resolves", async () => {
    const controller = new AbortController();
    const cancelling = new CommandRunner({
      getEnvironment: async () => {
        controller.abort();

        return NODE_ENV;
      },
    });

    // Without the re-check this would spawn and resolve, the abort unheard.
    const error = await rejection(runScript("", cancelling, controller.signal));

    expect(error.kind).to.equal("aborted");
  });
});

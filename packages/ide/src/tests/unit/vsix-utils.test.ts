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

import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { findVsix } from "../ui-test-utils/vsix-utils";

describe("findVsix", () => {
  let root: string;
  let originalVsixDir: string | undefined;

  /** Creates a VSIX at the given relative path with a controlled modification time. */
  async function writeVsix(relativePath: string, mtime: Date) {
    const target = path.join(root, relativePath);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "");
    await fs.utimes(target, mtime, mtime);

    return target;
  }

  beforeEach(async () => {
    originalVsixDir = process.env.CFS_VSIX_DIR;
    delete process.env.CFS_VSIX_DIR;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "find-vsix-"));
  });

  afterEach(async () => {
    if (originalVsixDir === undefined) {
      delete process.env.CFS_VSIX_DIR;
    } else {
      process.env.CFS_VSIX_DIR = originalVsixDir;
    }

    await fs.rm(root, { recursive: true, force: true });
  });

  /** Returns the error thrown by `findVsix`, failing the test when it resolves. */
  async function expectFindVsixToThrow(searchRoot?: string): Promise<Error> {
    try {
      const resolved = await findVsix(searchRoot);

      expect.fail(`Expected findVsix to throw, but it returned ${resolved}`);
    } catch (error) {
      return error as Error;
    }
  }

  it("returns the VSIX in the search root", async () => {
    const expected = await writeVsix("cfs-ide-1.0.0.vsix", new Date());

    expect(await findVsix(root)).to.equal(expected);
  });

  it("selects the most recently modified VSIX", async () => {
    await writeVsix("cfs-ide-1.0.0.vsix", new Date("2020-01-01T00:00:00Z"));
    const newest = await writeVsix(
      "cfs-ide-2.0.0.vsix",
      new Date("2026-01-01T00:00:00Z"),
    );
    await writeVsix("cfs-ide-1.5.0.vsix", new Date("2023-01-01T00:00:00Z"));

    expect(await findVsix(root)).to.equal(newest);
  });

  it("finds a VSIX nested in a subdirectory", async () => {
    const expected = await writeVsix(
      path.join("artifacts", "dist", "cfs-ide-1.0.0.vsix"),
      new Date(),
    );

    expect(await findVsix(root)).to.equal(expected);
  });

  it("ignores VSIX files in node_modules and out", async () => {
    await writeVsix(
      path.join("node_modules", "some-dep", "bundled.vsix"),
      new Date(),
    );
    await writeVsix(path.join("out", "stale.vsix"), new Date());

    const error = await expectFindVsixToThrow(root);

    expect(error.message).to.match(/No VSIX file found/);
  });

  it("defaults the search root to CFS_VSIX_DIR when set", async () => {
    const expected = await writeVsix("cfs-ide-1.0.0.vsix", new Date());

    process.env.CFS_VSIX_DIR = root;

    expect(await findVsix()).to.equal(expected);
  });

  it("throws with guidance when no VSIX exists", async () => {
    const error = await expectFindVsixToThrow(root);

    expect(error.message).to.match(/Run 'yarn ws:ide package'/);
  });
});

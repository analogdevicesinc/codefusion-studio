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
import * as os from "node:os";
import * as path from "node:path";
import { findWestTopdir } from "../../zephyr/west-editor/west/workspace";
import { createLayout, createTempDir } from "./west-editor-test-utils";

describe("findWestTopdir", () => {
  let topdir: string;

  before(async () => {
    topdir = await createTempDir("west-topdir-");
    await createLayout(topdir, [".west/", "app/submanifests/", "zephyr/"]);
  });

  after(async () => {
    await fs.rm(topdir, { recursive: true, force: true });
  });

  it("walks up to the directory holding .west", async () => {
    expect(
      await findWestTopdir(path.join(topdir, "app/submanifests"), undefined),
    ).to.equal(topdir);
  });

  it("falls back to ZEPHYR_BASE outside a workspace", async () => {
    expect(
      await findWestTopdir(os.tmpdir(), path.join(topdir, "zephyr")),
    ).to.equal(topdir);
  });

  it("finds nothing outside a workspace without ZEPHYR_BASE", async () => {
    expect(await findWestTopdir(os.tmpdir(), undefined)).to.equal(undefined);
  });
});

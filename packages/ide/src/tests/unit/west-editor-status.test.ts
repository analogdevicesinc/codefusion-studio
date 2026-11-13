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
  classifyProjectStatus,
  type ProjectState,
} from "../../zephyr/west-editor/west/status";
import type { WestProjectStatus } from "../../zephyr/west-editor/types";

/** An active, cloned project at its manifest-rev with a clean tree. */
const IN_SYNC: ProjectState = {
  active: true,
  cloned: true,
  head: "a".repeat(40),
  manifestRev: "a".repeat(40),
  modified: false,
  untracked: false,
};

const OTHER_COMMIT = "b".repeat(40);

describe("classifyProjectStatus", () => {
  const cases: Array<
    [name: string, state: Partial<ProjectState>, expected: WestProjectStatus]
  > = [
    ["a clean project at manifest-rev", {}, "in-sync"],
    ["an inactive project", { active: false }, "disabled"],
    ["an uncloned project", { cloned: false }, "not-cloned"],
    ["HEAD elsewhere", { head: OTHER_COMMIT }, "different-revision"],
    ["no manifest-rev", { manifestRev: undefined }, "different-revision"],
    [
      "neither HEAD nor manifest-rev",
      { head: undefined, manifestRev: undefined },
      "different-revision",
    ],
    ["modified files", { modified: true }, "modified-files"],
    ["untracked files", { untracked: true }, "untracked-files"],

    // Priority, first match wins.
    ["disabled over not cloned", { active: false, cloned: false }, "disabled"],
    [
      "not cloned over a revision mismatch",
      { cloned: false, head: undefined },
      "not-cloned",
    ],
    [
      "different revision over local changes",
      { head: OTHER_COMMIT, modified: true, untracked: true },
      "different-revision",
    ],
    [
      "modified over untracked",
      { modified: true, untracked: true },
      "modified-files",
    ],
  ];

  for (const [name, state, expected] of cases) {
    it(`gives ${expected} for ${name}`, () => {
      expect(classifyProjectStatus({ ...IN_SYNC, ...state })).to.equal(
        expected,
      );
    });
  }
});

describe("classifyProjectStatus against west.yml", () => {
  const A = "a".repeat(40);
  const B = "b".repeat(40);
  const C = "c".repeat(40);

  // west.yml / manifest-rev / HEAD: in sync only when all three agree.
  const scenarios: Array<
    [
      name: string,
      target: string,
      manifestRev: string,
      head: string,
      expected: WestProjectStatus,
    ]
  > = [
    ["west update just succeeded", A, A, A, "in-sync"],
    ["HEAD moved outside west", A, A, B, "different-revision"],
    [
      "manifest-rev elsewhere, HEAD at west.yml's commit",
      A,
      B,
      A,
      "different-revision",
    ],
    ["west.yml changed, west update not run", B, A, A, "different-revision"],
    ["west.yml changed and HEAD moved", A, B, C, "different-revision"],
  ];

  for (const [name, manifestTarget, manifestRev, head, expected] of scenarios) {
    it(`gives ${expected} when ${name}`, () => {
      expect(
        classifyProjectStatus({
          ...IN_SYNC,
          manifestTarget,
          manifestRev,
          head,
        }),
      ).to.equal(expected);
    });
  }

  it("compares only HEAD and manifest-rev when west.yml's revision cannot be resolved", () => {
    expect(
      classifyProjectStatus({ ...IN_SYNC, manifestTarget: undefined }),
    ).to.equal("in-sync");
  });
});

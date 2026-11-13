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
import type { GdbToolboxScript } from "../../debug-tools/gdb-toolbox/types/types";
import {
  UNKNOWN_ARCHITECTURE,
  detectArchitecture,
  isScriptSupportedForArchitecture,
} from "../../debug-tools/gdb-toolbox/core/session-architecture-store";

/** Minimal script factory for architecture-visibility assertions. */
function script(
  name: string,
  arch?: string | string[],
  core?: string | string[],
): GdbToolboxScript {
  return { name, description: name, commands: [], arch, core };
}

/**
 * Returns the names of the scripts that remain visible for the architecture
 * detected from the given `show architecture` output, mirroring the panel's
 * detect-then-filter pipeline.
 */
function visibleScriptNames(
  showArchitectureOutput: unknown,
  scripts: GdbToolboxScript[],
): string[] {
  const sessionArch = detectArchitecture(showArchitectureOutput);
  return scripts
    .filter((s) => isScriptSupportedForArchitecture(s, sessionArch))
    .map((s) => s.name);
}

describe("detectArchitecture", () => {
  it("recognises Arm targets", () => {
    expect(
      detectArchitecture('The target architecture is set to "arm".'),
    ).to.equal("arm");
  });

  it("recognises RISC-V targets", () => {
    expect(
      detectArchitecture("The target architecture is set to riscv:rv32."),
    ).to.equal("riscv");
  });

  it("recognises Xtensa targets", () => {
    expect(
      detectArchitecture("The target architecture is set to xtensa."),
    ).to.equal("xtensa");
  });

  it("is case-insensitive", () => {
    expect(detectArchitecture("Currently ARM")).to.equal("arm");
  });

  it("returns the unknown sentinel for unrecognised SHARC-FX output", () => {
    expect(
      detectArchitecture(
        "The target architecture is set to auto (currently sharc-fx).",
      ),
    ).to.equal(UNKNOWN_ARCHITECTURE);
  });

  it("returns the unknown sentinel for non-string output", () => {
    expect(detectArchitecture(undefined)).to.equal(UNKNOWN_ARCHITECTURE);
    expect(detectArchitecture(null)).to.equal(UNKNOWN_ARCHITECTURE);
    expect(detectArchitecture("")).to.equal(UNKNOWN_ARCHITECTURE);
  });
});

describe("isScriptSupportedForArchitecture", () => {
  it("always shows architecture-agnostic scripts", () => {
    expect(isScriptSupportedForArchitecture(script("generic"), "arm")).to.equal(
      true,
    );
    expect(
      isScriptSupportedForArchitecture(script("generic"), UNKNOWN_ARCHITECTURE),
    ).to.equal(true);
  });

  it("shows a constrained script only for its declared architecture", () => {
    const armScript = script("arm-only", "arm");
    expect(isScriptSupportedForArchitecture(armScript, "arm")).to.equal(true);
    expect(isScriptSupportedForArchitecture(armScript, "riscv")).to.equal(false);
  });

  it("honours the deprecated core field", () => {
    const coreScript = script("core-riscv", undefined, ["riscv"]);
    expect(isScriptSupportedForArchitecture(coreScript, "riscv")).to.equal(true);
    expect(isScriptSupportedForArchitecture(coreScript, "arm")).to.equal(false);
  });

  it("hides every constrained script for the unknown sentinel", () => {
    expect(
      isScriptSupportedForArchitecture(
        script("arm-only", "arm"),
        UNKNOWN_ARCHITECTURE,
      ),
    ).to.equal(false);
    expect(
      isScriptSupportedForArchitecture(
        script("xtensa-only", ["xtensa"]),
        UNKNOWN_ARCHITECTURE,
      ),
    ).to.equal(false);
  });

  it("does not treat a script declaring the sentinel string as unconstrained", () => {
    expect(
      isScriptSupportedForArchitecture(
        script("fake-unknown", UNKNOWN_ARCHITECTURE),
        UNKNOWN_ARCHITECTURE,
      ),
    ).to.equal(false);
  });
});

describe("GDB Toolbox architecture visibility pipeline", () => {
  const scripts = [
    script("generic"),
    script("arm-only", "arm"),
    script("riscv-only", ["riscv"]),
    script("xtensa-only", "xtensa"),
    script("multi-arch", ["arm", "riscv"]),
  ];

  it("shows agnostic and matching scripts for recognised Arm output", () => {
    expect(
      visibleScriptNames('The target architecture is set to "arm".', scripts),
    ).to.have.members(["generic", "arm-only", "multi-arch"]);
  });

  it("shows agnostic and matching scripts for recognised RISC-V output", () => {
    expect(
      visibleScriptNames(
        "The target architecture is set to riscv:rv32.",
        scripts,
      ),
    ).to.have.members(["generic", "riscv-only", "multi-arch"]);
  });

  it("shows only architecture-agnostic scripts for unrecognised SHARC-FX output", () => {
    expect(
      visibleScriptNames(
        "The target architecture is set to auto (currently sharc-fx).",
        scripts,
      ),
    ).to.deep.equal(["generic"]);
  });
});

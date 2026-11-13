/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { expect } from "chai";
import { describe, it } from "mocha";
import type { CfsConfig } from "cfs-types";
import {
  applyResolvedVersionRequirements,
  rebaseResolvedVersionRange,
} from "../../utils/resolved-version-requirements";

describe("resolved version requirements", () => {
  describe("rebaseResolvedVersionRange", () => {
    it("rebases caret and tilde ranges onto the resolved version", () => {
      expect(rebaseResolvedVersionRange("^1.1.0", "1.3.0")).to.equal("^1.3.0");
      expect(rebaseResolvedVersionRange("~1.1.0", "1.1.5")).to.equal("~1.1.5");
    });

    it("retains compound range constraints without redundant lower bounds", () => {
      const rebased = rebaseResolvedVersionRange(">=1.1.0 <2.0.0", "1.3.0");

      expect(rebased).to.equal(">=1.3.0 <2.0.0");
      expect(rebaseResolvedVersionRange(rebased, "1.3.0")).to.equal(rebased);
    });

    it("does not change exact, invalid, or incompatible requirements", () => {
      expect(rebaseResolvedVersionRange("1.1.0", "1.1.0")).to.equal("1.1.0");
      expect(rebaseResolvedVersionRange("invalid", "1.3.0")).to.equal(
        "invalid",
      );
      expect(rebaseResolvedVersionRange("^1.1.0", "2.0.0")).to.equal("^1.1.0");
    });
  });

  describe("applyResolvedVersionRequirements", () => {
    function createConfig(): CfsConfig {
      return {
        DataModelVersion: "^1.1.0",
        Projects: [
          {
            ProjectId: "primary",
            PluginId: "shared-plugin",
            PluginVersion: "^1.1.0",
          },
          {
            ProjectId: "secondary",
            PluginId: "shared-plugin",
            PluginVersion: "~1.1.0",
          },
          {
            ProjectId: "external",
            PluginId: "shared-plugin",
            PluginVersion: "^1.1.0",
            ExternallyManaged: true,
          },
        ],
      } as CfsConfig;
    }

    it("updates the data model and each project using its own resolution", () => {
      const config = createConfig();

      const changed = applyResolvedVersionRequirements(config, "1.3.0", {
        primary: "1.3.0",
        secondary: "1.1.5",
        external: "1.4.0",
      });

      expect(changed).to.equal(true);
      expect(config.DataModelVersion).to.equal("^1.3.0");
      expect(config.Projects[0].PluginVersion).to.equal("^1.3.0");
      expect(config.Projects[1].PluginVersion).to.equal("~1.1.5");
      expect(config.Projects[2].PluginVersion).to.equal("^1.1.0");
    });

    it("is idempotent once requirements match their resolutions", () => {
      const config = createConfig();

      applyResolvedVersionRequirements(config, "1.3.0", {
        primary: "1.3.0",
        secondary: "1.1.5",
      });

      expect(
        applyResolvedVersionRequirements(config, "1.3.0", {
          primary: "1.3.0",
          secondary: "1.1.5",
        }),
      ).to.equal(false);
    });
  });
});

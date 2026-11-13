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
import {
  PackageExplorerFilterState,
  PackageSummary,
  applyPackageFilters,
  comparePackageNames,
  countPackageTypes,
  getTypeLabel,
  isFilterActive,
  resolveFilterState,
  sortPackageEntries,
} from "../../view-container/package-explorer/package-explorer-utils";

function createPackage(name: string, type?: string): PackageSummary {
  return { name, type };
}

function createState(
  overrides: Partial<PackageExplorerFilterState> = {},
): PackageExplorerFilterState {
  return { dependenciesOnly: false, types: [], ...overrides };
}

const installedPackages = [
  createPackage("zephyr", "sdk"),
  createPackage("msdk", "sdk"),
  createPackage("arm-none-eabi", "toolchain"),
  createPackage("max32690-data", "data-model"),
  createPackage("legacy-blob"),
];

describe("package explorer utils", () => {
  describe("resolveFilterState", () => {
    it("shows only workspace dependencies until the user opts out", () => {
      expect(resolveFilterState(undefined)).to.deep.equal({
        dependenciesOnly: true,
        types: [],
      });
      expect(resolveFilterState({})).to.deep.equal({
        dependenciesOnly: true,
        types: [],
      });
    });

    it("honours a persisted opt out", () => {
      expect(
        resolveFilterState({ dependenciesOnly: false }).dependenciesOnly,
      ).to.equal(false);
    });

    it("restores persisted types and ignores malformed values", () => {
      expect(resolveFilterState({ types: ["sdk"] }).types).to.deep.equal([
        "sdk",
      ]);
      expect(
        resolveFilterState({
          types: "sdk",
        } as unknown as Partial<PackageExplorerFilterState>).types,
      ).to.deep.equal([]);
    });
  });

  describe("isFilterActive", () => {
    it("is inactive only when no filter is set", () => {
      expect(isFilterActive(createState())).to.equal(false);
      expect(isFilterActive(createState({ dependenciesOnly: true }))).to.equal(
        true,
      );
      expect(isFilterActive(createState({ types: ["sdk"] }))).to.equal(true);
    });
  });

  describe("applyPackageFilters", () => {
    it("returns every package when no filter is active", () => {
      const filtered = applyPackageFilters(
        installedPackages,
        createState(),
        new Set(),
      );

      expect(filtered).to.have.lengthOf(installedPackages.length);
    });

    it("keeps only workspace dependencies, matching on name alone", () => {
      const filtered = applyPackageFilters(
        installedPackages,
        createState({ dependenciesOnly: true }),
        new Set(["zephyr", "arm-none-eabi", "not-installed"]),
      );

      expect(filtered.map((pkg) => pkg.name)).to.deep.equal([
        "zephyr",
        "arm-none-eabi",
      ]);
    });

    it("keeps only the selected types and treats untyped packages as an empty type", () => {
      expect(
        applyPackageFilters(
          installedPackages,
          createState({ types: ["sdk", "toolchain"] }),
          new Set(),
        ).map((pkg) => pkg.name),
      ).to.deep.equal(["zephyr", "msdk", "arm-none-eabi"]);

      expect(
        applyPackageFilters(
          installedPackages,
          createState({ types: [""] }),
          new Set(),
        ).map((pkg) => pkg.name),
      ).to.deep.equal(["legacy-blob"]);
    });

    it("requires a package to satisfy both filters at once", () => {
      const filtered = applyPackageFilters(
        installedPackages,
        createState({ dependenciesOnly: true, types: ["sdk"] }),
        new Set(["zephyr", "arm-none-eabi"]),
      );

      expect(filtered.map((pkg) => pkg.name)).to.deep.equal(["zephyr"]);
    });

    it("does not modify the input array", () => {
      const input = [...installedPackages];

      applyPackageFilters(input, createState({ types: ["sdk"] }), new Set());

      expect(input).to.deep.equal(installedPackages);
    });
  });

  describe("countPackageTypes", () => {
    it("tallies each type and groups untyped packages under an empty key", () => {
      const counts = countPackageTypes(installedPackages);

      expect(counts.get("sdk")).to.equal(2);
      expect(counts.get("toolchain")).to.equal(1);
      expect(counts.get("data-model")).to.equal(1);
      expect(counts.get("")).to.equal(1);
    });

    it("returns an empty map for an empty package list", () => {
      expect(countPackageTypes([]).size).to.equal(0);
    });
  });

  describe("getTypeLabel", () => {
    it("maps known types to friendly labels", () => {
      expect(getTypeLabel("data-model")).to.equal("Data Model");
      expect(getTypeLabel("sdk")).to.equal("SDK");
    });

    it("falls back to the raw type and labels the empty type", () => {
      expect(getTypeLabel("firmware")).to.equal("firmware");
      expect(getTypeLabel("")).to.equal("Untyped");
    });
  });

  describe("sortPackageEntries", () => {
    it("lists directories before files, each ordered case insensitively", () => {
      const sorted = sortPackageEntries([
        { name: "README.md", isDirectory: false },
        { name: "src", isDirectory: true },
        { name: "CMakeLists.txt", isDirectory: false },
        { name: "include", isDirectory: true },
      ]);

      expect(sorted.map((entry) => entry.name)).to.deep.equal([
        "include",
        "src",
        "CMakeLists.txt",
        "README.md",
      ]);
    });

    it("does not modify the input array", () => {
      const input = [
        { name: "b", isDirectory: false },
        { name: "a", isDirectory: true },
      ];

      sortPackageEntries(input);

      expect(input.map((entry) => entry.name)).to.deep.equal(["b", "a"]);
    });
  });

  describe("comparePackageNames", () => {
    it("ignores case but keeps names differing only in case stably ordered", () => {
      expect(comparePackageNames("apple", "Banana")).to.be.lessThan(0);
      expect(comparePackageNames("README", "readme")).to.not.equal(0);
    });
  });
});

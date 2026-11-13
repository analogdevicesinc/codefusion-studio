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
import * as chai from "chai";

import { conflictFromGraphError } from "../src/conflicts/graph-error.js";
import type { ConanGraphError } from "../src/conflicts/graph-error.js";

const expect = chai.expect;

// A real `graph.error` from `conan graph info`, captured from two selected
// packages whose closures disagree on test_pkg_dep1. Note branch1's src_ref:
// Conan hangs the transitive requirement off the graph root and writes "None",
// even though test_pkg_consumer12 is what declared it.
const conflictFixture: ConanGraphError = {
	type: "conflict",
	name: "test_pkg_dep1",
	branch1: {
		src_id: "0",
		src_ref: "None",
		require: { ref: "test_pkg_dep1/1.0" }
	},
	branch2: {
		src_id: "7",
		src_ref: "test_pkg_consumer1/2.0",
		require: { ref: "test_pkg_dep1/2.0" }
	}
};

describe("conflictFromGraphError", () => {
	it("names the disputed dependency", () => {
		expect(
			conflictFromGraphError(conflictFixture)?.packageName
		).to.equal("test_pkg_dep1");
	});

	it("reports the requirement from each side of the conflict", () => {
		expect(
			conflictFromGraphError(conflictFixture)?.conflictingRequirements
		).to.deep.equal([
			{ name: "test_pkg_dep1", version: "1.0" },
			{ name: "test_pkg_dep1", version: "2.0" }
		]);
	});

	it("ignores which package Conan says placed the requirement", () => {
		// src_ref is the node Conan hung the requirement off, not the package
		// that declared it, so it must not reach the result. Here it names
		// test_pkg_consumer1, which the user never selected.
		const requirements =
			conflictFromGraphError(conflictFixture)
				?.conflictingRequirements ?? [];

		expect(
			requirements.map((requirement) => requirement.name)
		).to.deep.equal(["test_pkg_dep1", "test_pkg_dep1"]);
	});

	it("strips Conan's bracket syntax from a range requirement", () => {
		const conflict = conflictFromGraphError({
			type: "conflict",
			name: "libX",
			branch1: {
				src_ref: "None",
				require: { ref: "libX/[^1.0.0, include_prerelease]" }
			}
		});

		expect(conflict?.conflictingRequirements[0]).to.deep.equal({
			name: "libX",
			version: "^1.0.0"
		});
	});

	it("strips a revision suffix from a requirement", () => {
		const conflict = conflictFromGraphError({
			type: "conflict",
			name: "libX",
			branch2: {
				src_ref: "pkgA/1.2.0",
				require: {
					ref: "libX/2.0.0#765fc11caf7a48e265dd29920bb2e097"
				}
			}
		});

		expect(conflict?.conflictingRequirements[0]).to.deep.equal({
			name: "libX",
			version: "2.0.0"
		});
	});

	it("lists a requirement once when both sides report the same one", () => {
		const conflict = conflictFromGraphError({
			type: "conflict",
			name: "libX",
			branch1: {
				src_ref: "pkgA/1.0",
				require: { ref: "libX/^1.0.0" }
			},
			branch2: {
				src_ref: "pkgB/1.0",
				require: { ref: "libX/^1.0.0" }
			}
		});

		expect(conflict?.conflictingRequirements).to.have.lengthOf(1);
	});

	it("ignores a branch with no requirement to read", () => {
		const conflict = conflictFromGraphError({
			type: "conflict",
			name: "libX",
			branch1: { src_ref: "None" },
			branch2: {
				src_ref: "pkgA/1.0",
				require: { ref: "libX/^2.0.0" }
			}
		});

		expect(conflict?.conflictingRequirements).to.deep.equal([
			{ name: "libX", version: "^2.0.0" }
		]);
	});

	it("returns nothing for a failure that is not a conflict", () => {
		expect(
			conflictFromGraphError({
				type: "missing",
				name: "libX"
			})
		).to.be.undefined;
	});

	it("returns nothing when the disputed package is unnamed", () => {
		expect(conflictFromGraphError({ type: "conflict" })).to.be
			.undefined;
	});
});

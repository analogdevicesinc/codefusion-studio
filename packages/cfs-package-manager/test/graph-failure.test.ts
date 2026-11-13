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

import {
	ConanGraphFailure,
	isConanGraphFailure
} from "../src/conflicts/graph-failure.js";
import type { ConanGraphError } from "../src/conflicts/graph-error.js";

const expect = chai.expect;

// The same shape `conan graph info` reports when two selected packages
// disagree on a shared dependency.
const conflictError: ConanGraphError = {
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

describe("ConanGraphFailure", () => {
	it("keeps Conan's own description of the failure", () => {
		expect(new ConanGraphFailure(conflictError).graphError).to.equal(
			conflictError
		);
	});

	it("carries the conflict a conflict describes", () => {
		const failure = new ConanGraphFailure(conflictError);

		expect(failure.conflict?.packageName).to.equal("test_pkg_dep1");
		expect(failure.conflict?.conflictingRequirements).to.deep.equal([
			{ name: "test_pkg_dep1", version: "1.0" },
			{ name: "test_pkg_dep1", version: "2.0" }
		]);
	});

	it("names the disputed dependency in its message", () => {
		// The extension surfaces this message directly, so it has to read as
		// an explanation rather than as Conan's own output.
		expect(new ConanGraphFailure(conflictError).message).to.equal(
			"Version conflict on test_pkg_dep1"
		);
	});

	it("carries no conflict when the failure was not a conflict", () => {
		expect(
			new ConanGraphFailure({ type: "missing", name: "libX" })
				.conflict
		).to.be.undefined;
	});

	it("falls back to the failure type in its message", () => {
		expect(
			new ConanGraphFailure({ type: "missing", name: "libX" }).message
		).to.equal("Dependency resolution failed (missing)");
	});

	it("is an Error, so it can be thrown and caught as one", () => {
		const failure = new ConanGraphFailure(conflictError);

		expect(failure).to.be.an.instanceOf(Error);
		expect(failure.name).to.equal("ConanGraphFailure");
	});
});

describe("isConanGraphFailure", () => {
	it("recognises a failure this module built", () => {
		expect(isConanGraphFailure(new ConanGraphFailure(conflictError)))
			.to.be.true;
	});

	it("recognises a failure that crossed a module boundary", () => {
		// A bundler can hand the thrower and the catcher separate copies of
		// this module, so the guard reads the shape rather than the class.
		// This stand-in is what such a copy's instance looks like here.
		const fromAnotherCopy = Object.assign(
			new Error("Version conflict on test_pkg_dep1"),
			{ name: "ConanGraphFailure", graphError: conflictError }
		);

		expect(isConanGraphFailure(fromAnotherCopy)).to.be.true;
	});

	it("rejects a plain error", () => {
		expect(isConanGraphFailure(new Error("conan exited with code 1")))
			.to.be.false;
	});

	it("rejects an error named after this failure but carrying nothing", () => {
		const impostor = new Error("Version conflict on test_pkg_dep1");
		impostor.name = "ConanGraphFailure";

		expect(isConanGraphFailure(impostor)).to.be.false;
	});

	it("rejects a non-error that happens to have the right shape", () => {
		expect(
			isConanGraphFailure({
				name: "ConanGraphFailure",
				graphError: conflictError
			})
		).to.be.false;
	});

	it("rejects nothing at all", () => {
		expect(isConanGraphFailure(undefined)).to.be.false;
		expect(isConanGraphFailure(null)).to.be.false;
	});
});

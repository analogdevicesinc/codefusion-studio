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

import { expect } from "chai";

import type {
	SocControl,
	SocNumericBase as NumericBase
} from "cfs-types";

import {
	generateValidationErrorType,
	getFormErrors
} from "../../src/validation/control-validation.js";

describe("generateValidationErrorType", () => {
	it("rejects an empty integer", () => {
		expect(
			generateValidationErrorType({
				content: "",
				controlType: "integer"
			})
		).to.equal("INVALID_INTEGER");
	});

	it("rejects a non-numeric integer", () => {
		expect(
			generateValidationErrorType({
				content: "abc",
				controlType: "integer"
			})
		).to.equal("INVALID_INTEGER");
	});

	it("rejects a value below the minimum", () => {
		expect(
			generateValidationErrorType({
				content: "3",
				controlType: "integer",
				minVal: 5,
				maxVal: 10
			})
		).to.equal("INVALID_MIN_VAL");
	});

	it("rejects a value above the maximum", () => {
		expect(
			generateValidationErrorType({
				content: "42",
				controlType: "integer",
				minVal: 5,
				maxVal: 10
			})
		).to.equal("INVALID_MAX_VAL");
	});

	it("accepts an in-range integer", () => {
		expect(
			generateValidationErrorType({
				content: "7",
				controlType: "integer",
				minVal: 5,
				maxVal: 10
			})
		).to.be.undefined;
	});

	it("rejects text that does not match the pattern", () => {
		expect(
			generateValidationErrorType({
				content: "abc",
				controlType: "text",
				pattern: "[0-9]+"
			})
		).to.equal("INVALID_TEXT");
	});

	it("accepts text that matches the pattern", () => {
		expect(
			generateValidationErrorType({
				content: "123",
				controlType: "text",
				pattern: "[0-9]+"
			})
		).to.be.undefined;
	});

	it("interprets the value in the given numeric base", () => {
		// 0xFF = 255, which is above the maximum of 200.
		expect(
			generateValidationErrorType({
				content: "FF",
				controlType: "integer",
				maxVal: "C8",
				base: "Hexadecimal"
			})
		).to.equal("INVALID_MAX_VAL");
	});

	it("does not validate enum or boolean kinds (intentional skip)", () => {
		// Documented gap: an enum's permitted set needs condition-aware
		// EnumValues, and boolean has no constraints, so these kinds return
		// no error even for otherwise-suspect values. This test pins that
		// intentional behaviour so it cannot change silently.
		expect(
			generateValidationErrorType({
				content: "NOT_AN_OPTION",
				controlType: "enum"
			})
		).to.be.undefined;
		expect(
			generateValidationErrorType({
				content: "maybe",
				controlType: "boolean"
			})
		).to.be.undefined;
	});

	it("rejects digits that are invalid for the declared base", () => {
		// parseInt stops at the first invalid digit and returns what it read,
		// so "102" in binary used to yield 2 and pass an in-range check.
		expect(
			generateValidationErrorType({
				content: "102",
				controlType: "integer",
				base: "Binary",
				maxVal: "111"
			})
		).to.equal("INVALID_INTEGER");

		expect(
			generateValidationErrorType({
				content: "1G",
				controlType: "integer",
				base: "Hexadecimal",
				maxVal: "FF"
			})
		).to.equal("INVALID_INTEGER");

		expect(
			generateValidationErrorType({
				content: "8",
				controlType: "integer",
				base: "Octal"
			})
		).to.equal("INVALID_INTEGER");
	});

	it("rejects a radix prefix in the decimal base", () => {
		expect(
			generateValidationErrorType({
				content: "0x10",
				controlType: "integer",
				base: "Decimal"
			})
		).to.equal("INVALID_INTEGER");
	});

	it("accepts a radix-prefixed bound in a matching base", () => {
		// Plugin manifests write hexadecimal bounds as "0x3ff".
		expect(
			generateValidationErrorType({
				content: "3ff",
				controlType: "integer",
				base: "Hexadecimal",
				minVal: "0x0",
				maxVal: "0x3ff"
			})
		).to.be.undefined;
	});

	it("rejects a fractional value for an integer control", () => {
		// Number("1.5") succeeds, so only the range checks used to run and a
		// fraction inside the bounds passed.
		expect(
			generateValidationErrorType({
				content: "1.5",
				controlType: "integer",
				minVal: 0,
				maxVal: 10
			})
		).to.equal("INVALID_INTEGER");
	});

	it("anchors the whole pattern, including alternation", () => {
		// "A|B" must compile as ^(?:A|B)$, not ^A|B$, which would match
		// anything starting with A or ending with B.
		expect(
			generateValidationErrorType({
				content: "Axyz",
				controlType: "text",
				pattern: "A|B"
			})
		).to.equal("INVALID_TEXT");

		expect(
			generateValidationErrorType({
				content: "xyzB",
				controlType: "text",
				pattern: "A|B"
			})
		).to.equal("INVALID_TEXT");

		expect(
			generateValidationErrorType({
				content: "B",
				controlType: "text",
				pattern: "A|B"
			})
		).to.be.undefined;
	});

	it("applies numeric bounds regardless of the display base", () => {
		// SocControl permits numeric bounds. NumericBase says how to read a
		// string, so it must not discard a bound that is already a number.
		expect(
			generateValidationErrorType({
				content: "FFFF",
				controlType: "integer",
				maxVal: 255,
				base: "Hexadecimal"
			})
		).to.equal("INVALID_MAX_VAL");

		expect(
			generateValidationErrorType({
				content: "FF",
				controlType: "integer",
				maxVal: 255,
				base: "Hexadecimal"
			})
		).to.be.undefined;
	});

	it("treats an unrecognised numeric base as unparseable, not a crash", () => {
		// SocControl.NumericBase is an unvalidated string that getFormErrors
		// casts to the union, so an external model can supply anything.
		const call = () =>
			generateValidationErrorType({
				content: "10",
				controlType: "integer",
				base: "Radix50" as unknown as NumericBase
			});

		expect(call).to.not.throw();
		expect(call()).to.equal("INVALID_INTEGER");
	});

	it("parses radix-prefixed values in every base", () => {
		// parseInt understands 0x but reads 0b10 and 0o10 as 0.
		expect(
			generateValidationErrorType({
				content: "0b10",
				controlType: "integer",
				base: "Binary",
				minVal: "0b10",
				maxVal: "0b10"
			})
		).to.be.undefined;

		expect(
			generateValidationErrorType({
				content: "0o10",
				controlType: "integer",
				base: "Octal",
				maxVal: 7
			})
		).to.equal("INVALID_MAX_VAL");
	});

	it("does not mistake hexadecimal digits for a radix prefix", () => {
		// "0b1" is three valid hex digits (177), not a binary prefix.
		expect(
			generateValidationErrorType({
				content: "0b1",
				controlType: "integer",
				base: "Hexadecimal",
				maxVal: 176
			})
		).to.equal("INVALID_MAX_VAL");
	});

	it("does not throw on a malformed pattern", () => {
		expect(() =>
			generateValidationErrorType({
				content: "anything",
				controlType: "text",
				pattern: "[unterminated"
			})
		).to.not.throw();

		expect(
			generateValidationErrorType({
				content: "anything",
				controlType: "text",
				pattern: "[unterminated"
			})
		).to.equal("INVALID_TEXT");
	});
});

describe("getFormErrors", () => {
	const control = {
		Id: "DIV",
		Type: "integer",
		MinimumValue: 1,
		MaximumValue: 8
	} as unknown as SocControl;

	it("adds an entry for an invalid value", () => {
		const errors = getFormErrors({}, control, 99);

		expect(errors).to.have.property("DIV");
		expect(errors.DIV).to.be.a("string").and.not.be.empty;
	});

	it("clears an existing entry when the value becomes valid", () => {
		const errors = getFormErrors(
			{ DIV: "stale error", OTHER: "keep me" },
			control,
			4
		);

		expect(errors).to.not.have.property("DIV");
		expect(errors.OTHER).to.equal("keep me");
	});
});

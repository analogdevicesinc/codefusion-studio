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

import type {
	ControlErrorTypes,
	SocControl,
	SocControlType,
	SocNumericBase
} from "cfs-types";

/**
 * The value a single form control can hold.
 */
export type FormFieldValue = string | number | boolean;

/**
 * The control value kinds this module recognises. Only `integer` and `text`
 * are actually validated; the rest are recognised but intentionally not
 * validated here (see {@link generateValidationErrorType}).
 */
export type ControlType = SocControlType;

/** The numeric base a control's value is expressed in. */
export type NumericBase = SocNumericBase;

/**
 * The error codes produced by control-value validation, keyed by the kind
 * of failure. These match the `ControlErrorTypes` persisted on a
 * `.cfsconfig` pin/clock node.
 */
const controlErrorTypes: Record<string, ControlErrorTypes> = {
	integer: "INVALID_INTEGER",
	text: "INVALID_TEXT",
	minVal: "INVALID_MIN_VAL",
	maxVal: "INVALID_MAX_VAL"
};

/**
 * How to recognise and parse the digits of each numeric base.
 *
 * A radix prefix is accepted because data models and plugin manifests write
 * hexadecimal bounds as `0x3ff`. It is stripped before parsing: `parseInt`
 * understands `0x` but reads `0b10` and `0o10` as `0`. The prefix pattern is
 * per base so that a hexadecimal value such as `0b1` — three valid hex digits
 * — is not mistaken for a binary prefix.
 */
const baseFormats: Record<
	NumericBase,
	{ digits: RegExp; prefix: RegExp; radix: number }
> = {
	Binary: { digits: /^(?:0[bB])?[01]+$/, prefix: /^0[bB]/, radix: 2 },
	Octal: { digits: /^(?:0[oO])?[0-7]+$/, prefix: /^0[oO]/, radix: 8 },
	Hexadecimal: {
		digits: /^(?:0[xX])?[0-9a-fA-F]+$/,
		prefix: /^0[xX]/,
		radix: 16
	},
	Decimal: {
		digits: /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/,
		prefix: /^$/,
		radix: 10
	}
};

/**
 * Convert a value to a number based on the specified numeric base.
 *
 * The whole string must be valid for the base. `parseInt` alone is not
 * sufficient: it stops at the first invalid digit and returns what it read so
 * far, so `parseInt("102", 2)` yields 2 and `parseInt("1G", 16)` yields 1. A
 * malformed value would otherwise become a different, possibly in-range
 * number and pass validation. `Number` is likewise too permissive for the
 * decimal case, where it accepts radix prefixes such as `0x10`.
 * @param value - The value to convert (string or number).
 * @param base - The numeric base to interpret string values in.
 * @returns The parsed number, or undefined when it cannot be parsed.
 */
function convertValueToBase(
	value?: string | number,
	base?: NumericBase
): number | undefined {
	if (value === undefined || value === "") return undefined;

	// `SocControl` permits numeric bounds. A number is already a value; the
	// base only describes how to read a *string*, so it must not discard one.
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : undefined;
	}

	// `SocControl.NumericBase` is an unvalidated string that callers cast to
	// this union, so an unrecognised base must not reach the format entry.
	const format = baseFormats[base ?? "Decimal"] as
		| (typeof baseFormats)[NumericBase]
		| undefined;

	if (format === undefined) return undefined;

	const negative = value.startsWith("-");
	const unsigned =
		negative || value.startsWith("+") ? value.slice(1) : value;

	if (unsigned === "" || !format.digits.test(unsigned))
		return undefined;

	const parsedNumber =
		format.radix === 10
			? Number(unsigned)
			: parseInt(unsigned.replace(format.prefix, ""), format.radix);

	if (isNaN(parsedNumber)) return undefined;

	return negative ? -parsedNumber : parsedNumber;
}

/**
 * Test a value against a data-model pattern, anchored as a full match.
 *
 * The pattern is grouped before anchoring so that alternation binds inside
 * the anchors: `A|B` must compile to `/^(?:A|B)$/`, not `/^A|B$/`, which
 * would match `Axyz` and `xyzB`.
 *
 * A malformed pattern is a defect in the data model rather than in the user's
 * value, but there is no diagnostic code for that distinction today, so the
 * value is reported as invalid.
 * @param value - The value to test.
 * @param pattern - The pattern from the control definition.
 * @returns True when the value matches the whole pattern.
 */
function matchesPattern(value: string, pattern: string): boolean {
	try {
		return new RegExp(`^(?:${pattern})$`).test(value);
	} catch {
		return false;
	}
}

/**
 * Determine which validation error, if any, a control value produces.
 *
 * Pure: it depends only on its arguments, not on any loaded SoC state. Only
 * `integer` and `text` control kinds are validated; the rest are skipped by
 * design (see the note in the body).
 * @param inputData - The value and the constraints to validate it against.
 * @returns The error code, or undefined when the value is valid.
 */
export function generateValidationErrorType(inputData: {
	content: string;
	controlType: ControlType;
	minVal?: number | string;
	maxVal?: number | string;
	base?: NumericBase;
	pattern?: string;
}): ControlErrorTypes | undefined {
	const { content, controlType, minVal, maxVal, base, pattern } =
		inputData;

	// `enum` and `boolean` are intentionally skipped: an enum's permitted set
	// depends on its EnumValues evaluated condition-aware, which needs an
	// expression evaluator this package does not yet have, and `boolean` has
	// no constraints to check. An out-of-set enum value is NOT flagged here.
	if (controlType !== "integer" && controlType !== "text") {
		return undefined;
	}

	const parsedMinVal = convertValueToBase(minVal, base);
	const parsedMaxVal = convertValueToBase(maxVal, base);

	if (!content) {
		if (controlType === "integer") return controlErrorTypes.integer;
	}

	if (controlType === "integer") {
		const parsedContent = convertValueToBase(content, base);

		if (
			parsedContent === undefined ||
			!Number.isInteger(parsedContent)
		) {
			return controlErrorTypes.integer;
		}

		if (parsedMinVal !== undefined && parsedContent < parsedMinVal) {
			return controlErrorTypes.minVal;
		}

		if (parsedMaxVal !== undefined && parsedContent > parsedMaxVal) {
			return controlErrorTypes.maxVal;
		}
	}

	if (
		content &&
		controlType === "text" &&
		pattern &&
		!matchesPattern(content, pattern)
	) {
		return controlErrorTypes.text;
	}

	if (
		!content &&
		controlType === "text" &&
		pattern &&
		!matchesPattern("", pattern)
	) {
		return controlErrorTypes.text;
	}

	return undefined;
}

/**
 * Build a human-readable message for a control validation error.
 * @param errorType - The error code to describe.
 * @param minVal - The lower bound, for range messages.
 * @param maxVal - The upper bound, for range messages.
 * @returns The message to show for the error.
 */
export function generateControlErrorMessage(
	errorType: ControlErrorTypes,
	minVal?: string | number,
	maxVal?: string | number
): string {
	switch (errorType) {
		case controlErrorTypes.integer:
			return "Invalid input type";
		case controlErrorTypes.text:
			return "Invalid format for field";
		case controlErrorTypes.minVal:
			return maxVal === undefined
				? `Value is below the minimum allowed value of ${String(minVal)}`
				: `Value is lower than the allowed range ${String(minVal)} to ${String(maxVal)}`;
		case controlErrorTypes.maxVal:
			return minVal === undefined
				? `Value exceeds the maximum allowed value of ${String(maxVal)}`
				: `Value exceeds the range ${String(minVal)} to ${String(maxVal)}`;
		default:
			return "Unknown error";
	}
}

/**
 * Validate a single control value, returning an `{ [id]: message }` object
 * when it fails or undefined when it passes.
 * @param control - The control identity, kind, value and constraints.
 * @returns The keyed error message, or undefined when the value is valid.
 */
export function computeErrorPerControl(control: {
	id: string;
	type: ControlType;
	value: FormFieldValue | undefined;
	minVal?: number | string;
	maxVal?: number | string;
	base?: NumericBase;
	pattern?: string;
}): Record<string, string> | undefined {
	const { id, type, value, minVal, maxVal, base, pattern } = control;

	const errType = generateValidationErrorType({
		content: value === undefined ? "" : value.toString(),
		controlType: type,
		minVal,
		maxVal,
		base,
		pattern
	});

	if (errType) {
		return {
			[id]: generateControlErrorMessage(errType, minVal, maxVal)
		};
	}

	return undefined;
}

/**
 * Recompute the form errors for a control, adding or clearing its entry in
 * an existing error map.
 *
 * Pure: it derives errors solely from the control definition and value
 * passed in.
 * @param errors - The errors already collected, keyed by control id.
 * @param control - The SoC control definition being validated.
 * @param value - The current value of the control.
 * @returns A new error map with this control's entry set or removed.
 */
export function getFormErrors(
	errors: Record<string, string>,
	control: SocControl,
	value: FormFieldValue
): Record<string, string> {
	const controlError = computeErrorPerControl({
		id: control.Id,
		type: control.Type as ControlType,
		value,
		minVal: control.MinimumValue ?? undefined,
		maxVal: control.MaximumValue ?? undefined,
		base: control.NumericBase as NumericBase,
		pattern: control.Pattern ?? undefined
	});

	if (controlError) {
		return { ...errors, [control.Id]: controlError[control.Id] };
	}

	const remainingErrors: Record<string, string> = {};

	for (const [key, message] of Object.entries(errors)) {
		if (key !== control.Id) {
			remainingErrors[key] = message;
		}
	}

	return remainingErrors;
}

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

import _Ajv, {
	type JSONSchemaType,
	type ValidateFunction
} from "ajv";

// ajv ships as CommonJS; under NodeNext the default import is typed as the
// module namespace, so unwrap the constructable/callable default (same
// interop pattern already used in cfs-config-validator.ts).
const Ajv = _Ajv as unknown as typeof _Ajv.default;

export interface JsonSchemaValidator<T = unknown> {
	validate(data: unknown): data is T;
	errorsText(): string;
}

/**
 * Compile a JSON Schema into a reusable, type-narrowing validator.
 *
 * This is a small, generic wrapper around ajv with no knowledge of any
 * particular schema's shape — callers supply their own schema and consume
 * the result as an `unknown -> T` type guard. Meta-schema validation
 * (`validateSchema`) is left enabled so a structurally invalid schema
 * throws at compile time instead of silently producing a validator that
 * always passes or always fails; `strict` mode is off, so ajv-specific
 * strict-mode issues (unknown keywords, ambiguous types, etc.) are not
 * caught here — only meta-schema violations are. Async schemas
 * (`$async: true`) are not supported. Compiling isn't free — cache and
 * reuse the returned validator rather than calling this repeatedly for the
 * same schema.
 * @param schema - A JSON Schema object. Only draft-07 (ajv's default
 * meta-schema) is supported out of the box; schemas declaring a later
 * `$schema` (e.g. 2019-09, 2020-12) fail to compile unless that
 * meta-schema is registered separately.
 * @returns A validator that checks data against the compiled schema.
 * The type guard narrows to `T` only when the schema is a
 * `JSONSchemaType<T>`, so `T` is checked against the schema at compile
 * time; any other schema yields a `JsonSchemaValidator<unknown>`.
 */
export function compileJsonSchemaValidator<T>(
	schema: JSONSchemaType<T>
): JsonSchemaValidator<T>;
export function compileJsonSchemaValidator(
	schema: object
): JsonSchemaValidator<unknown>;
export function compileJsonSchemaValidator<T>(
	schema: object
): JsonSchemaValidator<T> {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate: ValidateFunction<T> = ajv.compile<T>(schema);

	// ajv sets `$async` on the compiled function but does not type it.
	if ((validate as { $async?: boolean }).$async) {
		throw new TypeError(
			"compileJsonSchemaValidator does not support async schemas ($async: true)"
		);
	}

	return {
		validate: (data: unknown): data is T => validate(data) as boolean,
		errorsText: () => ajv.errorsText(validate.errors)
	};
}

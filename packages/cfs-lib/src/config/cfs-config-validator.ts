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

import _Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";

import type { CfsConfig as CfsConfigData } from "cfs-types";
import type { CfsConfigLatestSchemaVersion } from "cfs-types";
import type { CfsSocDataModel } from "cfs-types";
import type { CheckDiagnostic, CheckResult } from "./check-types.js";

import { isValid } from "./check-types.js";
import { CfsConfigError } from "./cfs-config-error.js";
import { validatePinConfiguration } from "../validation/pin-validation.js";
import { validatePeripheralControls } from "../validation/peripheral-validation.js";
import {
	cfsConfigSchemas,
	LATEST_SCHEMA_VERSION,
	type CfsConfigSchemaVersion
} from "../resources/cfsconfig-schemas.js";

// ajv and ajv-formats ship as CommonJS; under NodeNext the default import is
// typed as the module namespace, so unwrap the constructable/callable default.
const Ajv2020 = _Ajv2020 as unknown as typeof _Ajv2020.default;
const addFormats =
	_addFormats as unknown as typeof _addFormats.default;

// The `SchemaVersion` that new/current `.cfsconfig` documents must declare.
// This is the newest registered schema version (see
// resources/cfsconfig-schemas.ts), so bumping the schema is a matter of
// registering the new version there; this constant follows automatically.
// Note this is deliberately narrower than `CfsConfigData["SchemaVersion"]`,
// which is the union of every version still accepted when reading a document.
export const CURRENT_SCHEMA_VERSION: CfsConfigLatestSchemaVersion =
	LATEST_SCHEMA_VERSION;

// A single Ajv instance shared by every compiled validator. The schemas are
// build-time constants, so validators are compiled lazily on first use and
// cached per schema version for the lifetime of the process.
const ajv = new Ajv2020({
	allErrors: true,
	strict: false,
	verbose: true
});
addFormats(ajv);

const validators = new Map<
	CfsConfigSchemaVersion,
	ValidateFunction<CfsConfigData>
>();

/**
 * Get the compiled validator for a registered schema version, compiling and
 * caching it on first use.
 *
 * Each schema is generated directly from the `CfsConfigData` interface (see
 * scripts/generate-cfsconfig-schema.js), so a passing validation guarantees
 * the document matches `CfsConfigData`. That makes the returned function a
 * sound type guard.
 * @param version - The registered schema version to validate against.
 * @returns The compiled validator for that version.
 */
function getValidator(
	version: CfsConfigSchemaVersion
): ValidateFunction<CfsConfigData> {
	let validator = validators.get(version);

	if (!validator) {
		validator = ajv.compile<CfsConfigData>(cfsConfigSchemas[version]);
		validators.set(version, validator);
	}

	return validator;
}

/**
 * Resolve which registered schema a document should be validated against,
 * based on its declared `SchemaVersion`.
 *
 * Every `.cfsconfig` that CFS produces (from 2.0.0) declares a `SchemaVersion`,
 * so a missing or unrecognized one means the file is invalid.
 * Report an error.
 * @param document - The parsed, not-yet-validated document.
 * @param filePath - The file the document came from, for error reporting.
 * @returns The registered schema version to validate against.
 * @throws {@link CfsConfigError} (`SCHEMA_INVALID`) when the document declares
 * no `SchemaVersion`, or declares one that has no registered schema.
 */
function resolveSchemaVersion(
	document: unknown,
	filePath: string
): CfsConfigSchemaVersion {
	const declared =
		isRecord(document) && typeof document.SchemaVersion === "string"
			? document.SchemaVersion
			: undefined;

	if (declared === undefined) {
		throw new CfsConfigError(
			"SCHEMA_INVALID",
			filePath,
			`The file '${filePath}' does not declare a SchemaVersion.`,
			[
				{
					severity: "critical",
					message: "(root) must declare a string SchemaVersion",
					ruleId: "schema",
					instancePath: "/SchemaVersion"
				}
			]
		);
	}

	if (!(declared in cfsConfigSchemas)) {
		const known = Object.keys(cfsConfigSchemas).join(", ");

		throw new CfsConfigError(
			"SCHEMA_INVALID",
			filePath,
			`The file '${filePath}' declares an unknown SchemaVersion '${declared}'.`,
			[
				{
					severity: "critical",
					message: `/SchemaVersion '${declared}' is not a known schema version (known: ${known})`,
					ruleId: "schema",
					instancePath: "/SchemaVersion"
				}
			]
		);
	}

	return declared as CfsConfigSchemaVersion;
}

/**
 * Type guard for a plain object keyed by string. Used to safely index into
 * Ajv's `error.data` when extracting the offending property of an
 * `additionalProperties` violation.
 * @param value - The value to test.
 * @returns True when `value` is a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

/**
 * Convert the Ajv validation errors for a `.cfsconfig` document into schema
 * diagnostics. All violations are reported as `critical` severity - the
 * document does not match the type definition we rely on, so it cannot be
 * loaded as typed data.
 * @param errors - The Ajv errors from a failed validation, if any.
 * @returns One diagnostic per schema violation.
 */
function schemaDiagnostics(
	errors: ValidateFunction["errors"]
): CheckDiagnostic[] {
	return (errors ?? []).map((error) => {
		const location = error.instancePath || "(root)";
		const params = error.params as {
			allowedValues?: unknown;
			additionalProperty?: unknown;
		};

		let message =
			`${location} ${error.message ?? "is invalid"}`.trim();

		// Ajv reports the offending key for `additionalProperties`
		// violations in `params.additionalProperty`; surface it so the
		// user knows exactly which property is unexpected.
		if (
			error.keyword === "additionalProperties" &&
			typeof params.additionalProperty === "string"
		) {
			message += ` (unexpected property: '${params.additionalProperty}')`;
		}

		const diagnostic: CheckDiagnostic = {
			severity: "critical",
			message,
			ruleId: "schema",
			instancePath: error.instancePath
		};

		// `verbose: true` attaches `error.data`, but that is only the value
		// at the failing path for keyword violations like `enum`, `type` or
		// `const`. For `required` it is the whole containing object (the
		// property is missing, so there is no offending value), and for
		// `additionalProperties` it is the parent object — surface only the
		// unexpected property's value instead of dumping the parent.
		const data = (error as { data?: unknown }).data;

		if (
			error.keyword === "additionalProperties" &&
			typeof params.additionalProperty === "string" &&
			isRecord(data)
		) {
			diagnostic.value = data[params.additionalProperty];
		} else if (
			error.keyword !== "required" &&
			error.keyword !== "additionalProperties" &&
			"data" in error
		) {
			diagnostic.value = data;
		}

		// `enum` violations expose the permitted values via `params`.
		if (Array.isArray(params.allowedValues)) {
			diagnostic.allowedValues = params.allowedValues;
		}

		return diagnostic;
	});
}

/**
 * Manages the common operations performed on a single `.cfsconfig` file.
 *
 * An instance is bound to one file for its whole lifecycle: the path is
 * supplied to the {@link CfsConfigValidator.fromFile} factory, which reads, parses and
 * schema-validates the file up front. Because an unusable file cannot be
 * loaded, construction fails with a {@link CfsConfigError} when the file is
 * missing, is not valid JSON, or does not conform to the `.cfsconfig` schema.
 * Validating in the factory guarantees that every instance holds data matching
 * {@link CfsConfigData} with the default generic plugin property map.
 * Consumer-specific platform contracts are compile-time assumptions, not
 * additional guarantees provided by this schema validation.
 *
 * Recoverable problems that still leave a usable, schema-valid document (for
 * example overlapping memory regions or incompatible peripheral options) are
 * reported separately by {@link CfsConfigValidator.check}.
 *
 * The CLI, the IDE backend and MCP all consume this class so the checks — and
 * their messages — stay identical across every surface.
 */
export class CfsConfigValidator {
	/** The parsed configuration document. */
	private readonly document: CfsConfigData;
	/** The absolute or caller-supplied path this instance is bound to. */
	private readonly path: string;

	/**
	 * @param filePath - The path the instance is bound to.
	 * @param document - The parsed configuration document.
	 */
	private constructor(filePath: string, document: CfsConfigData) {
		this.path = filePath;
		this.document = document;
	}

	/**
	 * Load a `.cfsconfig` file and return a {@link CfsConfigValidator} bound to it.
	 * Acts as an asynchronous constructor: it reads, parses and schema-validates
	 * the file before an instance exists, so an unusable file never yields an
	 * instance and every instance holds data matching {@link CfsConfigData}.
	 * @param filePath - The path to the `.cfsconfig` file.
	 * @returns A promise for the loaded {@link CfsConfigValidator}.
	 * @throws {@link CfsConfigError} when the file cannot be read
	 * (`FILE_NOT_FOUND`), does not contain valid JSON (`INVALID_JSON`), or does
	 * not conform to the `.cfsconfig` schema (`SCHEMA_INVALID`). Schema failures
	 * carry the per-property diagnostics on the error's `diagnostics` field.
	 */
	static async fromFile(
		filePath: string
	): Promise<CfsConfigValidator> {
		let contents: string;

		try {
			contents = await readFile(filePath, "utf8");
		} catch {
			throw new CfsConfigError(
				"FILE_NOT_FOUND",
				filePath,
				`The file '${filePath}' could not be read.`
			);
		}

		let document: unknown;

		try {
			document = JSON.parse(contents);
		} catch {
			throw new CfsConfigError(
				"INVALID_JSON",
				filePath,
				`The file '${filePath}' is not a valid JSON file.`
			);
		}

		const validator = getValidator(
			resolveSchemaVersion(document, filePath)
		);

		if (!validator(document)) {
			throw new CfsConfigError(
				"SCHEMA_INVALID",
				filePath,
				`The file '${filePath}' does not conform to the .cfsconfig schema.`,
				schemaDiagnostics(validator.errors)
			);
		}

		// `validator` is a sound `CfsConfigData` type guard (see the comment on
		// `getValidator` above), and the `if (!validator(document))` check above
		// has already narrowed `document` accordingly.
		return new CfsConfigValidator(filePath, document);
	}

	/** The path this instance is bound to. */
	get filePath(): string {
		return this.path;
	}

	/** The parsed configuration document. */
	get data(): CfsConfigData {
		return this.document;
	}

	/**
	 * Run the recoverable configuration checks over the (already schema-valid)
	 * document.
	 *
	 * Schema conformance is guaranteed by {@link CfsConfigValidator.fromFile}, so this
	 * method is reserved for semantic problems the schema cannot express — for
	 * example pin (pinmux) conflicts, missing required signals, or overlapping
	 * memory regions. Those checks need the SoC data model, so callers that can
	 * resolve it (from the config file's `Soc`/`Package`/`DataModelVersion`) pass it
	 * in. The model-dependent checks are skipped when it is omitted.
	 * @param dataModel - The SoC data model the document targets, when available.
	 * @returns The diagnostics found and the overall validity.
	 */
	check(dataModel?: CfsSocDataModel): CheckResult {
		const diagnostics: CheckDiagnostic[] = [];

		if (dataModel !== undefined) {
			diagnostics.push(
				...validatePinConfiguration(
					this.document.Pins,
					dataModel,
					this.document.Projects
				),
				...validatePeripheralControls(
					this.document.Projects,
					dataModel
				)
			);
		}

		return { diagnostics, valid: isValid(diagnostics) };
	}
}

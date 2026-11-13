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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { CfsConfigSchemaVersion } from "cfs-types";
import type { CheckDiagnostic } from "../../src/config/check-types.js";

import {
	CfsConfigValidator,
	CURRENT_SCHEMA_VERSION
} from "../../src/config/cfs-config-validator.js";
import { CfsConfigError } from "../../src/config/cfs-config-error.js";

describe("CfsConfigValidator", () => {
	let workingDir: string;

	beforeEach(() => {
		workingDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "cfs-config-")
		);
	});

	afterEach(() => {
		fs.rmSync(workingDir, { recursive: true, force: true });
	});

	function writeConfig(contents: string): string {
		const filePath = path.join(workingDir, "test.cfsconfig");
		fs.writeFileSync(filePath, contents);

		return filePath;
	}

	/**
	 * A minimal document that conforms to the `.cfsconfig` schema, used by the
	 * tests that need a successful load. Individual tests clone and mutate it
	 * to produce schema violations.
	 * @returns A schema-valid configuration object.
	 */
	function validConfig(): Record<string, unknown> {
		return {
			Copyright: "Copyright (c) 2026 Analog Devices, Inc.",
			SchemaVersion: "2.1.0",
			DataModelVersion: "1.0.0",
			Soc: "MAX78000",
			Package: "TQFN",
			BoardName: "EvKit_V1",
			Timestamp: "2026-01-01T00:00:00Z",
			Projects: [
				{
					CoreId: "CM4",
					ProjectId: "m4",
					PluginId: "plugin",
					PluginVersion: "1.0.0",
					FirmwarePlatform: "msdk",
					ExternallyManaged: false,
					Partitions: [],
					Peripherals: [],
					PlatformConfig: {}
				}
			],
			Pins: [],
			ClockNodes: [],
			ClockFrequencies: {}
		};
	}

	describe("fromFile", () => {
		it("throws a FILE_NOT_FOUND error when the file cannot be read", async () => {
			const missing = path.join(workingDir, "missing.cfsconfig");

			try {
				await CfsConfigValidator.fromFile(missing);
				expect.fail("expected fromFile to throw");
			} catch (error) {
				expect(error).to.be.instanceOf(CfsConfigError);
				expect((error as CfsConfigError).code).to.equal(
					"FILE_NOT_FOUND"
				);
				expect((error as CfsConfigError).filePath).to.equal(missing);
			}
		});

		it("throws an INVALID_JSON error when the file is not valid JSON", async () => {
			const filePath = writeConfig("{not valid json");

			try {
				await CfsConfigValidator.fromFile(filePath);
				expect.fail("expected fromFile to throw");
			} catch (error) {
				expect(error).to.be.instanceOf(CfsConfigError);
				expect((error as CfsConfigError).code).to.equal(
					"INVALID_JSON"
				);
				expect((error as CfsConfigError).message).to.contain(
					"not a valid JSON file"
				);
			}
		});

		it("throws a SCHEMA_INVALID error carrying diagnostics for a schema-invalid document", async () => {
			const filePath = writeConfig("{}");

			try {
				await CfsConfigValidator.fromFile(filePath);
				expect.fail("expected fromFile to throw");
			} catch (error) {
				expect(error).to.be.instanceOf(CfsConfigError);
				expect((error as CfsConfigError).code).to.equal(
					"SCHEMA_INVALID"
				);
				expect((error as CfsConfigError).filePath).to.equal(filePath);

				const { diagnostics } = error as CfsConfigError;
				expect(diagnostics).to.not.be.empty;
				for (const diagnostic of diagnostics) {
					expect(diagnostic.severity).to.equal("critical");
					expect(diagnostic.ruleId).to.equal("schema");
				}
			}
		});

		it("loads a schema-valid document and binds to its path", async () => {
			const filePath = writeConfig(JSON.stringify(validConfig()));

			const config = await CfsConfigValidator.fromFile(filePath);

			expect(config).to.be.instanceOf(CfsConfigValidator);
			expect(config.filePath).to.equal(filePath);
			expect(config.check().valid).to.be.true;
		});

		it("preserves the declared SchemaVersion of a superseded document", async () => {
			const filePath = writeConfig(
				JSON.stringify({ ...validConfig(), SchemaVersion: "2.1.0" })
			);

			const config = await CfsConfigValidator.fromFile(filePath);

			// A loaded document keeps the version it declared. This only
			// compiles while `CfsConfigValidator.SchemaVersion` stays the union of
			// accepted versions rather than the latest one alone.
			const declared: CfsConfigSchemaVersion =
				config.data.SchemaVersion;

			expect(declared).to.equal("2.1.0");
			expect(declared).to.not.equal(CURRENT_SCHEMA_VERSION);
		});

		it("loads a document declaring the current schema version", async () => {
			const filePath = writeConfig(
				JSON.stringify({
					...validConfig(),
					SchemaVersion: CURRENT_SCHEMA_VERSION
				})
			);

			const config = await CfsConfigValidator.fromFile(filePath);

			expect(config.data.SchemaVersion).to.equal(
				CURRENT_SCHEMA_VERSION
			);
			expect(config.check().valid).to.be.true;
		});

		it("accepts a superseded document upgraded in place to carry a firewall configuration", async () => {
			// Mirrors what the MCU editor writes when firewall settings are
			// edited in a 2.1.0 document: the version is bumped so the new
			// FirewallConfig property is not rejected as an unknown one.
			const upgraded = {
				...validConfig(),
				SchemaVersion: CURRENT_SCHEMA_VERSION,
				FirewallConfig: {
					FirewallStatus: "enabled",
					FirewallZones: [
						{
							Name: "Zone 1",
							Responders: [
								{
									Name: "responder_0",
									Group: "Group_A",
									BaseAddress: "0x61000000"
								}
							],
							AccessModes: { SecurePrivileged: true }
						}
					],
					ResponderOverrides: [
						{ Name: "responder_0", Group: "Group_A", Description: "" }
					]
				}
			};
			const filePath = writeConfig(JSON.stringify(upgraded));

			const config = await CfsConfigValidator.fromFile(filePath);

			expect(config.check().valid).to.be.true;
		});

		it("rejects a firewall configuration left on a superseded document", async () => {
			// The counterpart to the test above: 2.1.0 closes the root with
			// additionalProperties, so writing FirewallConfig without bumping
			// the version produces a file that no longer loads.
			const notUpgraded = {
				...validConfig(),
				SchemaVersion: "2.1.0",
				FirewallConfig: { FirewallStatus: "enabled" }
			};
			const filePath = writeConfig(JSON.stringify(notUpgraded));

			try {
				await CfsConfigValidator.fromFile(filePath);
				expect.fail("expected fromFile to throw");
			} catch (error) {
				expect(error).to.be.instanceOf(CfsConfigError);
				expect((error as CfsConfigError).code).to.equal(
					"SCHEMA_INVALID"
				);
			}
		});

		it("round-trips a document with Sru.SignalAliases", async () => {
			const withSruAliases = {
				...validConfig(),
				SchemaVersion: "2.1.0",
				Sru: {
					Connections: { SIGNAL_A_I: "SIGNAL_B_O" },
					UserDescriptions: {},
					SignalAliases: { SIGNAL_A_I: "My Friendly Name" }
				}
			};
			const filePath = writeConfig(JSON.stringify(withSruAliases));

			const config = await CfsConfigValidator.fromFile(filePath);

			expect(config.check().valid).to.be.true;
			expect(config.data.Sru?.SignalAliases).to.deep.equal({
				SIGNAL_A_I: "My Friendly Name"
			});
		});

		it("round-trips a document with Sru.SignalInversions", async () => {
			const withSruInversions = {
				...validConfig(),
				SchemaVersion: "2.1.0",
				Sru: {
					Connections: { SIGNAL_A_I: "SIGNAL_B_O" },
					UserDescriptions: {},
					SignalInversions: { SIGNAL_A_I: true }
				}
			};
			const filePath = writeConfig(JSON.stringify(withSruInversions));

			const config = await CfsConfigValidator.fromFile(filePath);

			expect(config.check().valid).to.be.true;
			expect(config.data.Sru?.SignalInversions).to.deep.equal({
				SIGNAL_A_I: true
			});
		});
	});

	describe("schema diagnostics", () => {
		/**
		 * Load a document that is expected to fail schema validation and
		 * return the diagnostics carried by the thrown error.
		 * @param contents - The document contents to write and load.
		 * @returns The schema diagnostics from the thrown error.
		 */
		async function diagnosticsFor(
			contents: string
		): Promise<CheckDiagnostic[]> {
			const filePath = writeConfig(contents);

			try {
				await CfsConfigValidator.fromFile(filePath);
				expect.fail("expected fromFile to throw");
			} catch (error) {
				expect(error).to.be.instanceOf(CfsConfigError);

				return (error as CfsConfigError).diagnostics;
			}

			return [];
		}

		it("reports critical schema diagnostics for an invalid document", async () => {
			const diagnostics = await diagnosticsFor("{}");

			expect(diagnostics).to.not.be.empty;
			for (const diagnostic of diagnostics) {
				expect(diagnostic.severity).to.equal("critical");
				expect(diagnostic.ruleId).to.equal("schema");
			}
		});

		it("omits the offending value for a missing required property", async () => {
			// Ajv's verbose `data` for a `required` error is the whole
			// containing object; the property is missing, so no value should
			// be surfaced (otherwise `--verbose` would print the entire config).
			// Declare a valid SchemaVersion so resolution passes and Ajv
			// reaches the missing-required-property checks.
			const diagnostics = await diagnosticsFor(
				JSON.stringify({ SchemaVersion: "2.1.0" })
			);

			const requiredDiagnostics = diagnostics.filter(
				(diagnostic: CheckDiagnostic) =>
					diagnostic.message.includes("must have required property")
			);

			expect(requiredDiagnostics, "expected required diagnostics").to
				.not.be.empty;
			for (const diagnostic of requiredDiagnostics) {
				expect(diagnostic.value).to.be.undefined;
			}
		});

		it("reports a schema diagnostic when SchemaVersion is missing", async () => {
			const diagnostics = await diagnosticsFor("{}");

			expect(
				diagnostics.some((diagnostic: CheckDiagnostic) =>
					diagnostic.message.includes("SchemaVersion")
				)
			).to.be.true;
		});

		it("reports a schema diagnostic for an unknown SchemaVersion", async () => {
			const diagnostics = await diagnosticsFor(
				JSON.stringify({ SchemaVersion: "0.0.0" })
			);

			expect(
				diagnostics.some((diagnostic: CheckDiagnostic) =>
					diagnostic.message.includes("known schema version")
				)
			).to.be.true;
		});

		it("surfaces the offending and allowed values for an enum violation", async () => {
			const invalid = validConfig();
			(invalid.Projects as Record<string, unknown>[])[0].Partitions =
				[
					{
						Name: "part",
						StartAddress: "0x0",
						Size: 0,
						IsOwner: true,
						Access: "R/X/Z",
						Config: {}
					}
				];

			const diagnostics = await diagnosticsFor(
				JSON.stringify(invalid)
			);

			const enumDiagnostic = diagnostics.find(
				(diagnostic: CheckDiagnostic) =>
					diagnostic.instancePath ===
					"/Projects/0/Partitions/0/Access"
			);

			expect(enumDiagnostic, "expected an Access enum diagnostic").to
				.not.be.undefined;
			expect(enumDiagnostic?.severity).to.equal("critical");
			expect(enumDiagnostic?.value).to.equal("R/X/Z");
			expect(enumDiagnostic?.allowedValues).to.deep.equal([
				"",
				"R",
				"R/W",
				"R/X",
				"R/W/X"
			]);
		});

		it("names the unexpected property for an additionalProperties violation", async () => {
			const invalid = validConfig();
			(invalid.Projects as Record<string, unknown>[])[0].Partitions =
				[
					{
						Name: "part",
						StartAddress: "0x0",
						Size: 0,
						IsOwner: true,
						Access: "R",
						Config: {},
						Bogus: true
					}
				];

			const diagnostics = await diagnosticsFor(
				JSON.stringify(invalid)
			);

			const additionalPropertyDiagnostic = diagnostics.find(
				(diagnostic: CheckDiagnostic) =>
					diagnostic.message.includes("unexpected property: 'Bogus'")
			);

			expect(
				additionalPropertyDiagnostic,
				"expected an additionalProperties diagnostic"
			).to.not.be.undefined;
			// The offending value is the unexpected property's value, not the
			// parent object that Ajv reports in `data`.
			expect(additionalPropertyDiagnostic?.value).to.equal(true);
		});

		it("rejects a primitive value for an object-typed Config map", async () => {
			// `ConfigOptions` is `type: "object"`, so a primitive `Config`
			// (here a number) must fail validation. Without the object type,
			// `additionalProperties` would be ignored and this would pass.
			const invalid = validConfig();
			(invalid.Projects as Record<string, unknown>[])[0].Partitions =
				[
					{
						Name: "part",
						StartAddress: "0x0",
						Size: 0,
						IsOwner: true,
						Access: "R",
						Config: 42
					}
				];

			const diagnostics = await diagnosticsFor(
				JSON.stringify(invalid)
			);

			const configDiagnostic = diagnostics.find(
				(diagnostic: CheckDiagnostic) =>
					diagnostic.instancePath ===
					"/Projects/0/Partitions/0/Config"
			);

			expect(configDiagnostic, "expected a Config type diagnostic").to
				.not.be.undefined;
			expect(configDiagnostic?.severity).to.equal("critical");
			expect(configDiagnostic?.message).to.include("object");
		});

		it("rejects a non-boolean value for Sru.SignalInversions", async () => {
			const invalid = {
				...validConfig(),
				SchemaVersion: "2.1.0",
				Sru: {
					Connections: { SIGNAL_A_I: "SIGNAL_B_O" },
					UserDescriptions: {},
					SignalInversions: { SIGNAL_A_I: "yes" }
				}
			};

			const diagnostics = await diagnosticsFor(
				JSON.stringify(invalid)
			);

			const inversionDiagnostic = diagnostics.find(
				(diagnostic: CheckDiagnostic) =>
					diagnostic.instancePath ===
					"/Sru/SignalInversions/SIGNAL_A_I"
			);

			expect(
				inversionDiagnostic,
				"expected a SignalInversions type diagnostic"
			).to.not.be.undefined;
			expect(inversionDiagnostic?.severity).to.equal("critical");
			expect(inversionDiagnostic?.message).to.include("boolean");
		});
	});
});

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
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	SerialSourceConfig,
	createDataSource
} from "../../src/profiler/data-source-factory.js";
import { SerialDataSource } from "../../src/profiler/serial-data-source.js";
import { getWorkspaceSerialSettings } from "../../src/profiler/serial-port-settings.js";

describe("serial-port-settings", function () {
	let workspace: string;

	/**
	 * Write a `.cfsconfig` into the temporary workspace.
	 * @param content - File content; objects are serialized as JSON.
	 */
	function writeCfsConfig(content: unknown): void {
		mkdirSync(path.join(workspace, ".cfs"), { recursive: true });
		writeFileSync(path.join(workspace, ".cfs", ".cfsworkspace"), "");
		writeFileSync(
			path.join(workspace, ".cfs", "workspace.cfsconfig"),
			typeof content === "string" ? content : JSON.stringify(content)
		);
	}

	/**
	 * Build a `.cfsconfig` with a single project and the given UART config.
	 * @param uartConfig - The peripheral `Config` of the UART.
	 */
	function configWithUart(
		uartConfig: Record<string, unknown>
	): unknown {
		return {
			Projects: [
				{
					PlatformConfig: { ProjectName: "m4" },
					Peripherals: [
						{ Name: "GPIO0", Config: { MODE: "IN" } },
						{ Name: "UART0", Config: uartConfig }
					]
				}
			]
		};
	}

	beforeEach(function () {
		workspace = mkdtempSync(path.join(tmpdir(), "cfs-serial-"));
	});

	afterEach(function () {
		rmSync(workspace, { recursive: true, force: true });
	});

	describe("getWorkspaceSerialSettings", function () {
		it("reads the UART settings of the project", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: "9600",
					CHAR_SIZE: "7",
					PARITY: "EVEN",
					STOP_BITS: "1.5/2"
				})
			);

			expect(
				getWorkspaceSerialSettings(workspace, "m4")
			).to.deep.equal({
				baudRate: 9600,
				dataBits: 7,
				parity: "even",
				stopBits: 2
			});
		});

		it("maps ONE_STOP_BIT to 1", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: "921600",
					CHAR_SIZE: "8",
					PARITY: "NONE",
					STOP_BITS: "ONE_STOP_BIT"
				})
			);

			expect(
				getWorkspaceSerialSettings(workspace, "m4")
			).to.deep.equal({
				baudRate: 921600,
				dataBits: 8,
				parity: "none",
				stopBits: 1
			});
		});

		it("map MULTI_STOP_BITS to 1.5 when CHAR_SIZE is 5", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: "921600",
					CHAR_SIZE: "5",
					PARITY: "NONE",
					STOP_BITS: "MULTI_STOP_BITS"
				})
			);

			expect(
				getWorkspaceSerialSettings(workspace, "m4")
			).to.deep.equal({
				baudRate: 921600,
				dataBits: 5,
				parity: "none",
				stopBits: 1.5
			});
		});

		it("falls back to no parity for unknown parity values", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: 115200,
					CHAR_SIZE: 8,
					PARITY: "MARK",
					STOP_BITS: 1
				})
			);

			expect(
				getWorkspaceSerialSettings(workspace, "m4")?.parity
			).to.equal("none");
		});

		it("returns undefined for an unknown project", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: 9600,
					CHAR_SIZE: 8,
					PARITY: "NONE",
					STOP_BITS: 1
				})
			);

			expect(getWorkspaceSerialSettings(workspace, "other")).to.be
				.undefined;
		});

		it("returns undefined when the workspace has no .cfsconfig", function () {
			mkdirSync(path.join(workspace, ".cfs"));
			writeFileSync(
				path.join(workspace, ".cfs", ".cfsworkspace"),
				""
			);

			expect(getWorkspaceSerialSettings(workspace, "m4")).to.be
				.undefined;
		});

		it("skips project-level .cfs folders when locating the workspace", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: 9600,
					CHAR_SIZE: 8,
					PARITY: "NONE",
					STOP_BITS: 1
				})
			);
			const project = path.join(workspace, "proj");
			mkdirSync(path.join(project, ".cfs"), { recursive: true });
			writeFileSync(
				path.join(project, ".cfs", ".cfsdependencies"),
				"{}"
			);

			expect(getWorkspaceSerialSettings(project, "m4")).to.not.be
				.undefined;
		});

		it("throws for invalid serial settings", function () {
			writeCfsConfig(
				configWithUart({
					BAUD: 9600,
					CHAR_SIZE: 9,
					PARITY: "NONE",
					STOP_BITS: 1
				})
			);

			expect(() =>
				getWorkspaceSerialSettings(workspace, "m4")
			).to.throw("Invalid serial port config");
		});

		it("throws for invalid JSON", function () {
			writeCfsConfig("{ not json");

			expect(() =>
				getWorkspaceSerialSettings(workspace, "m4")
			).to.throw("contains valid JSON");
		});

		it("throws outside of a workspace", function () {
			expect(() =>
				getWorkspaceSerialSettings(workspace, "m4")
			).to.throw("Please ensure this is a valid workspace folder");
		});
	});

	describe("createDataSource", function () {
		it("passes the serial line options to the port", function () {
			const source = createDataSource(
				new SerialSourceConfig("/dev/ttyFake0", 9600, {
					dataBits: 7,
					parity: "even",
					stopBits: 2
				})
			);

			expect(source).to.be.instanceOf(SerialDataSource);
			const { settings } = (
				source as unknown as {
					serialPort: { settings: Record<string, unknown> };
				}
			).serialPort;
			expect(settings).to.include({
				path: "/dev/ttyFake0",
				baudRate: 9600,
				dataBits: 7,
				parity: "even",
				stopBits: 2
			});
		});
	});
});

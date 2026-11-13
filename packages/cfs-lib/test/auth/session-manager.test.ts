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
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SessionManager } from "../../src/auth/session-manager.js";

describe("SessionManager local session emails", () => {
	let tempDir: string;
	let sessionFile: string;
	let manager: SessionManager;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "cfs-local-session-")
		);
		sessionFile = path.join(tempDir, "session");
		manager = new SessionManager({
			authUrl: new URL("https://example.invalid/auth"),
			ccmUrl: new URL("https://example.invalid/api"),
			authCallbacks: [new URL("http://localhost:1234")],
			clientId: "cli",
			scopes: ["scope"],
			sessionFile
		});
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("returns no emails without creating a missing session file", async () => {
		expect(await manager.getLocalSessionEmails()).to.deep.equal([]);
		expect(await fs.readdir(tempDir)).to.deep.equal([]);
	});

	it("reads only matching sessions without refreshing or rewriting tokens", async () => {
		const session = {
			userId: "local-id",
			userEmail: "employee@analog.com",
			scopes: ["scope"],
			refreshToken: "test-only-refresh-token",
			clientId: "cli"
		};
		const content = JSON.stringify([
			session,
			{ ...session, clientId: "other" },
			{ ...session, scopes: ["other"] },
			{ userEmail: "invalid@analog.com" }
		]);
		await fs.writeFile(sessionFile, content);
		expect(await manager.getLocalSessionEmails()).to.deep.equal([
			"employee@analog.com"
		]);
		expect(await fs.readFile(sessionFile, "utf8")).to.equal(content);
	});

	it("ignores empty scopes when matching stored sessions", async () => {
		const scopedManager = new SessionManager({
			authUrl: new URL("https://example.invalid/auth"),
			ccmUrl: new URL("https://example.invalid/api"),
			authCallbacks: [new URL("http://localhost:1234")],
			clientId: "cli",
			scopes: ["scope", ""],
			sessionFile
		});
		await fs.writeFile(
			sessionFile,
			JSON.stringify([
				{
					userId: "local-id",
					userEmail: "employee@analog.com",
					scopes: ["scope"],
					refreshToken: "test-only-refresh-token",
					clientId: "cli"
				}
			])
		);

		expect(await scopedManager.getLocalSessionEmails()).to.deep.equal(
			["employee@analog.com"]
		);
	});

	it("rejects corrupt storage without deleting it", async () => {
		await fs.writeFile(sessionFile, "invalid json");
		let error: unknown;
		try {
			await manager.getLocalSessionEmails();
		} catch (caught) {
			error = caught;
		}
		expect(error).to.be.instanceOf(Error);
		expect(await fs.readFile(sessionFile, "utf8")).to.equal(
			"invalid json"
		);
	});
});

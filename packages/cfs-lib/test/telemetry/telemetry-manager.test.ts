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

import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import { spy, stub, SinonStub } from "sinon";
import {
	TelemetryManager,
	UserType
} from "../../src/telemetry/telemetry-manager.js";
import { setTelemetryLogger } from "../../src/telemetry/telemetry-logger.js";

const APP_ID_ENV = "CFS_TELEMETRY_APP_ID";
const URL_ENV = "CFS_TELEMETRY_URL";

const setEnv = (key: string, value: string | undefined): void => {
	process.env[key] = value;
};

const createLoggerSpy = () => ({
	trace: spy(),
	debug: spy(),
	info: spy(),
	warn: spy(),
	error: spy()
});

const createManager = (hasUserOptedIn = true): TelemetryManager =>
	new TelemetryManager(
		hasUserOptedIn,
		"1.0.0",
		"1.99.0",
		"user-123",
		UserType.INTERNAL,
		"session-abc"
	);

describe("TelemetryManager", () => {
	const originalAppId = process.env[APP_ID_ENV];
	const originalUrl = process.env[URL_ENV];

	let fetchStub: SinonStub;

	beforeEach(() => {
		fetchStub = stub(globalThis, "fetch").resolves({} as Response);
		// Default to telemetry being enabled and sendable.
		setEnv(APP_ID_ENV, "test-app-id");
		setEnv(URL_ENV, "https://telemetry.example.com");
	});

	afterEach(() => {
		fetchStub.restore();
		setTelemetryLogger(undefined);
		setEnv(APP_ID_ENV, originalAppId);
		setEnv(URL_ENV, originalUrl);
	});

	describe("logAction", () => {
		it("logs the action and metadata keys when telemetry is enabled", async () => {
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logAction("openFile", {
				fileName: "secret.c",
				size: 42
			});

			expect(logger.info.calledOnce).to.be.true;
			const message = logger.info.firstCall.args[0] as string;
			expect(message).to.include("openFile");
			expect(message).to.include("fileName");
			expect(message).to.include("size");
		});

		it("does not log metadata values, only keys", async () => {
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logAction("openFile", {
				fileName: "secret.c",
				size: 42
			});

			const message = logger.info.firstCall.args[0] as string;
			expect(message).to.not.include("secret.c");
			expect(message).to.not.include("42");
		});

		it("does not log when the telemetry app id is not set", async () => {
			setEnv(APP_ID_ENV, "");
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logAction("openFile", {});

			expect(logger.info.called).to.be.false;
			expect(
				logger.warn.calledWith(
					"[Telemetry] Telemetry App ID is not set."
				)
			).to.be.true;
			expect(fetchStub.called).to.be.false;
		});

		it("does not log when telemetry is disabled", async () => {
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager(false);

			await manager.logAction("openFile", {});

			expect(logger.info.called).to.be.false;
			expect(fetchStub.called).to.be.false;
		});

		it("sends the request when telemetry is enabled", async () => {
			const manager = createManager();

			await manager.logAction("openFile", {});

			expect(fetchStub.calledOnce).to.be.true;
		});

		it("still sends the request when no logger is registered", async () => {
			setTelemetryLogger(undefined);
			const manager = createManager();

			await manager.logAction("openFile", {});

			expect(fetchStub.calledOnce).to.be.true;
		});
	});

	describe("logActions", () => {
		it("logs one entry per action with its keys", async () => {
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logActions([
				{ action: "a1", metadata: { k1: "v1" } },
				{ action: "a2", metadata: { k2: "v2" } }
			]);

			expect(logger.info.callCount).to.equal(2);

			const first = logger.info.firstCall.args[0] as string;
			expect(first).to.include("a1");
			expect(first).to.include("k1");
			expect(first).to.not.include("v1");

			const second = logger.info.secondCall.args[0] as string;
			expect(second).to.include("a2");
			expect(second).to.include("k2");
			expect(second).to.not.include("v2");
		});

		it("does not send for an empty actions array", async () => {
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logActions([]);

			expect(logger.info.called).to.be.false;
			expect(fetchStub.called).to.be.false;
		});

		it("does not log when the telemetry app id is not set", async () => {
			setEnv(APP_ID_ENV, "");
			const logger = createLoggerSpy();
			setTelemetryLogger(logger);
			const manager = createManager();

			await manager.logActions([{ action: "a1", metadata: {} }]);

			expect(logger.info.called).to.be.false;
			expect(
				logger.warn.calledWith(
					"[Telemetry] Telemetry App ID is not set."
				)
			).to.be.true;
			expect(fetchStub.called).to.be.false;
		});

		it("still sends the request when no logger is registered", async () => {
			setTelemetryLogger(undefined);
			const manager = createManager();

			await manager.logActions([{ action: "a1", metadata: {} }]);

			expect(fetchStub.calledOnce).to.be.true;
		});
	});
});

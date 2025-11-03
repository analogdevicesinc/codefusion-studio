/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import path from "path";

import { fileURLToPath } from "url";

import dotenv from "dotenv";
import { SingleTelemetryMessage } from "../types/single-telemetry-message.js";
import { MultipleTelemetryMessages } from "../types/multiple-telemetry-messages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
	path: path.resolve(__dirname, "../../../../.env")
});

export class TelemetryManager {
	private hasUserOptedIn: boolean;
	private cfsVersion: string;
	private vscodeVersion: string;
	private userId: string;
	private sessionId: string;
	private telemetryUrl = process.env.CFS_TELEMETRY_URL;
	private telemetryAppId = process.env.CFS_TELEMETRY_APP_ID ?? "";

	constructor(
		hasUserOptedIn: boolean,
		cfsVersion: string,
		vscodeVersion: string,
		userId: string,
		sessionId: string
	) {
		this.hasUserOptedIn = hasUserOptedIn;
		this.cfsVersion = cfsVersion;
		this.vscodeVersion = vscodeVersion;
		this.userId = userId;
		this.sessionId = sessionId;
	}

	getTelemetryAppId = (): string => {
		return this.telemetryAppId;
	};

	logAction = async (action: string, metadata: object) => {
		if (this.telemetryAppId) {
			const request = this.buildSingleRequestBody(action, metadata);
			return this.sendRequest(request);
		}
	};

	logActions = async (
		actions: { action: string; metadata: object }[]
	) => {
		if (this.telemetryAppId) {
			const request = this.buildMultipleRequestsBody(actions);
			return this.sendRequest(request);
		}
	};

	setHasUserOptedIn = (hasUserOptedIn: boolean): void => {
		this.hasUserOptedIn = hasUserOptedIn;
	};

	private sendRequest = async (
		requestBody: SingleTelemetryMessage | MultipleTelemetryMessages
	): Promise<Response | undefined> => {
		if (this.hasUserOptedIn && this.telemetryUrl) {
			return fetch(this.telemetryUrl, {
				body: JSON.stringify(requestBody),
				method: "POST",
				headers: { "Content-Type": "application/json" }
			}).catch((error: unknown) => {
				console.error("Telemetry request failed:", error);
				return undefined;
			});
		}
		return Promise.resolve(undefined);
	};

	private buildSingleRequestBody(
		action: string,
		metadata: object
	): SingleTelemetryMessage {
		return {
			appId: this.telemetryAppId,
			message: {
				event: {
					action,
					timestamp: Date.now(),
					metadata: this.createMetadataObj(metadata)
				}
			}
		};
	}

	private buildMultipleRequestsBody = (
		actions: { action: string; metadata: object }[]
	): MultipleTelemetryMessages => {
		return {
			appId: this.telemetryAppId,
			messages: actions.map(({ action, metadata }) => {
				return {
					event: {
						action,
						timestamp: Date.now(),
						metadata: this.createMetadataObj(metadata)
					}
				};
			})
		};
	};

	private createMetadataObj(metadata: object) {
		return {
			...metadata,
			cfsVersion: this.cfsVersion,
			vscodeVersion: this.vscodeVersion,
			userId: this.userId,
			sessionId: this.sessionId
		};
	}
}

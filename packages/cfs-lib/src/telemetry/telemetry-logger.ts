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
import { Logger } from "../types/logger.js";

let registeredLogger: Logger | undefined;

/**
 * Registers the logger used to output telemetry actions.
 * @param logger - The logger implementation to use, or undefined to disable.
 */
export const setTelemetryLogger = (
	logger: Logger | undefined
): void => {
	registeredLogger = logger;
};

/**
 * Returns the currently registered logger, if any.
 * @returns The registered logger, or undefined when none is set.
 */
export const getTelemetryLogger = (): Logger | undefined =>
	registeredLogger;

/**
 * Formats a telemetry log message with the action and metadata keys.
 * Formatted message is in the form: "[Telemetry] <action> - Data: <metadata keys>"
 * @param action - The action being logged.
 * @param metadata - The metadata associated with the action.
 * @returns The formatted telemetry log message.
 */
export const formatTelemetryLog = (
	action: string,
	metadata: Record<string, unknown>
): string => {
	const metadataKeys = Object.keys(metadata);
	return `[Telemetry] ${action} - Data: ${JSON.stringify(metadataKeys)}`;
};

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

import type { CfsConfig } from "cfs-types";
import { readFileSync } from "node:fs";
import { findWorkspaceConfigFile } from "../utils/workspace-utils.js";

type SerialPlatformConfig = {
	ProjectName?: string;
};

export const VALID_DATA_BITS = [5, 6, 7, 8] as const;
export const VALID_STOP_BITS = [1, 1.5, 2] as const;
export const VALID_PARITY = ["even", "none", "odd"] as const;

export type DataBits = (typeof VALID_DATA_BITS)[number];
export type StopBits = (typeof VALID_STOP_BITS)[number];
export type Parity = (typeof VALID_PARITY)[number];

/**
 * Checks whether a value is a supported number of data bits.
 * @param value - The value to check.
 */
export function isDataBits(value: number): value is DataBits {
	return (VALID_DATA_BITS as readonly number[]).includes(value);
}

/**
 * Checks whether a value is a supported number of stop bits.
 * @param value - The value to check.
 */
export function isStopBits(value: number): value is StopBits {
	return (VALID_STOP_BITS as readonly number[]).includes(value);
}

/**
 * Checks whether a value is a supported parity.
 * @param value - The value to check.
 */
export function isParity(value: string): value is Parity {
	return (VALID_PARITY as readonly string[]).includes(value);
}

/**
 * Line settings of a serial port.
 */
export interface SerialPortSettings {
	baudRate: number;
	dataBits: DataBits;
	parity: Parity;
	stopBits: StopBits;
}

/**
 * Optional line settings of a serial port, i.e. everything but the baud
 * rate. Unset values use the `serialport` defaults (8 data bits, no
 * parity, 1 stop bit).
 */
export type SerialLineOptions = Partial<
	Omit<SerialPortSettings, "baudRate">
>;

function parseStopBits(stopBits: unknown, dataBits: number): number {
	if (typeof stopBits === "string") {
		switch (stopBits) {
			case "ONE_STOP_BIT":
			case "1":
				return 1;
			case "MULTI_STOP_BITS":
			case "1.5/2":
				return dataBits === 5 ? 1.5 : 2;
		}
	}

	return Number(stopBits);
}

/**
 * Settings used when neither the user nor the workspace provides any
 * (115200 baud, 8N1).
 */
export const DEFAULT_SERIAL_PORT_SETTINGS: Readonly<SerialPortSettings> =
	{
		baudRate: 115_200,
		dataBits: 8,
		parity: "none",
		stopBits: 1
	};

/**
 * Reads the serial port settings of a project from the workspace
 * `.cfsconfig` file. The settings are taken from the first peripheral of
 * the project whose config contains `BAUD`, `CHAR_SIZE`, `PARITY` and
 * `STOP_BITS`.
 * @param workspacePath - Path of the workspace (or a folder inside it).
 * @param project - Project name, matched against
 * `PlatformConfig.ProjectName`.
 * @returns The serial settings, or `undefined` when the workspace has no
 * config file, the project is not found or it has no serial settings.
 * @throws Error when no workspace is found, the config file cannot be
 * parsed or it contains invalid serial settings.
 */
export function getWorkspaceSerialSettings(
	workspacePath: string,
	project: string
): SerialPortSettings | undefined {
	const file = findWorkspaceConfigFile(workspacePath);
	if (!file) {
		return undefined;
	}

	let content: CfsConfig<SerialPlatformConfig>;
	try {
		content = JSON.parse(
			readFileSync(file, "utf8")
		) as CfsConfig<SerialPlatformConfig>;
	} catch (error) {
		throw new Error(
			`Error loading serial port settings from ${file}. Please ensure the file exists and contains valid JSON.\nError details: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	const projectConfig = content.Projects?.find(
		(p) => p.PlatformConfig?.ProjectName === project
	);

	const serialConfig = Object.values(
		projectConfig?.Peripherals ?? {}
	).find((p) => {
		const c = p.Config as Record<string, unknown> | undefined;
		return (
			c &&
			"BAUD" in c &&
			"CHAR_SIZE" in c &&
			"PARITY" in c &&
			"STOP_BITS" in c
		);
	})?.Config as Record<string, unknown> | undefined;

	if (!serialConfig) {
		return undefined;
	}

	const parity = String(serialConfig.PARITY).toLowerCase();
	const dataBits = Number(serialConfig.CHAR_SIZE);
	const stopBits = parseStopBits(serialConfig.STOP_BITS, dataBits);
	const baudRate = Number(serialConfig.BAUD);

	if (isDataBits(dataBits) && isStopBits(stopBits) && baudRate > 0) {
		return {
			baudRate,
			dataBits,
			parity: isParity(parity) ? parity : "none",
			stopBits
		};
	}

	throw new Error(
		`Invalid serial port config found in workspace file ${file}. Please ensure the config contains valid values.`
	);
}

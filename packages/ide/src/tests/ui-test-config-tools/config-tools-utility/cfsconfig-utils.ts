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

import { expect } from "chai";
import * as fs from "node:fs";
import * as path from "node:path";

export const SIGNAL_VALUE_MAP: Record<string, string[]> = {
  // UI → JSON
  OUT: ["LED", "OUT"], // MODE: LED dropdown → OUT
  VDDIO: ["Use VDDIO", "VDDIO"], // POWER SUPPLY: Use VDDIO → VDDIO
  HIGH: ["Active High", "HIGH"], // POLARITY:  Active High → HIGH
  GREEN_LED: ["green_led"], // Identifiers match directly
  DS_0: ["Drive Strength 0", "0"], // DS: "Drive Strength 0" → "0"
  LED_2: ["led2"], // Alias matches directly
};

/**
 * Builds the relative path to a test fixture JSON under
 * src/tests/ui-test-config-tools/fixtures.
 *
 * @param fileName - File or subpath under the `fixtures` folder (e.g. "my-config.json").
 * @returns The joined path string.
 */
export function getConfigPathForFile(fileName: string): string {
  const configPath = path.join(
    "src",
    "tests",
    "ui-test-config-tools",
    "fixtures",
    fileName,
  );
  console.log("Config path:", configPath);

  return configPath;
}

/**
 * Reads and parses a JSON file from disk.
 *
 * @param filePath - Absolute or relative path to the JSON file.
 * @returns Parsed JSON value.
 * @throws {Error} If the file does not exist.
 * @throws {SyntaxError} If the file content is not valid JSON.
 */
export function parseJSONFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found at: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const peripheralData = JSON.parse(fileContent);

  return peripheralData;
}

/**
 * Extracts the `Config` object for a given peripheral + signal from the data model
 * and returns it as a Map of key → value.
 *
 * Expects a structure like:
 * { Projects: [{ Peripherals: [{ Name, Signals: [{ Name, Config: {...} }]}]}] }
 *
 * @param data - Parsed JSON root object.
 * @param peripheral - Peripheral name to match (e.g., "GPIO0").
 * @param signal - Signal name to match (e.g., "P0.11").
 * @returns Map of config keys to values (empty if peripheral/signal not found).
 */
export function getSignalConfigMap(
  data: any,
  peripheral: string,
  signal: string,
): Map<string, string> {
  const sig = (data?.Projects ?? [])
    .flatMap((p: any) => p.Peripherals ?? [])
    .find((per: any) => per.Name === peripheral)
    ?.Signals?.find((s: any) => s.Name === signal);

  return new Map(Object.entries(sig?.Config ?? {}));
}

/**
 * Asserts that UI values match the expected config values for a signal.
 * Uses `SIGNAL_VALUE_MAP` to translate JSON values into one or more acceptable UI strings.
 *
 * @param config - Expected configuration as key → JSON value.
 * @param ui - Actual UI values as key → displayed string (whitespace trimmed before compare).
 * @throws {AssertionError} If any key's UI value is not one of the accepted values.
 */
export function expectSignalConfigMatchesUI(
  config: Map<string, string>,
  ui: Record<string, string>,
) {
  for (const [key, jsonVal] of config.entries()) {
    const actual = (ui[key] ?? "").trim();
    const expected = SIGNAL_VALUE_MAP[jsonVal] ?? [jsonVal];
    expect(
      expected,
      `Mismatch for ${key}: JSON=${jsonVal}, got UI=${actual}; accepted=${expected.join(
        " | ",
      )}`,
    ).to.include(actual);
  }
}

/**
 * Lists all peripheral names across all projects in the parsed data.
 *
 * @param peripheralData - Parsed JSON root object.
 * @returns Array of peripheral names (can be empty).
 */
export function getPeripheralNames(peripheralData: any): string[] {
  const peripheralNames: string[] = (peripheralData.Projects ?? []).flatMap(
    (p: { Peripherals: any }) =>
      (p.Peripherals ?? []).map((per: { Name: any }) => per.Name),
  );
  console.log("Peripheral names: ", peripheralNames);
  return peripheralNames;
}

export function getPartitionsByCoreId(data: any, coreId: string): any[] {
  const target = (coreId ?? "").toLowerCase();

  const partitions: any[] = (data?.Projects ?? [])
    .filter((p: any) => (p?.CoreId ?? "").toLowerCase() === target)
    .flatMap((p: any) => p?.Partitions ?? []);

  console.log("Number of partitions: ", partitions.length);
  return partitions;
}

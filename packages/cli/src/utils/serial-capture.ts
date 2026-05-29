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

import type {CfsConfig} from 'cfs-types';

import {findWorkspaceConfigFile} from 'cfs-lib';
import fs from 'node:fs';
import {SerialPort} from 'serialport';

import {
  type SerialPortConfig,
  type ValidSerialPortConfig,
  isDataBits,
  isParity,
  isStopBits
} from '../types/serial-port-config.js';

function isValidSerialPortConfig(
  obj: Record<string, unknown>
): obj is ValidSerialPortConfig {
  return (
    typeof obj.dataBits === 'number' &&
    isDataBits(obj.dataBits) &&
    typeof obj.stopBits === 'number' &&
    isStopBits(obj.stopBits) &&
    typeof obj.parity === 'string' &&
    isParity(obj.parity) &&
    typeof obj.baudRate === 'number' &&
    obj.baudRate > 0
  );
}

/**
 * List all available serial ports.
 * @returns Promise resolving to an array of port paths.
 */
export async function listAvailablePorts(): Promise<string[]> {
  const ports = await SerialPort.list();
  return ports.map((port) => port.path);
}

async function getWorkspaceSerialConfig(
  workspacePath: string,
  project: string
): Promise<ValidSerialPortConfig | undefined> {
  // open the file <workspacePath>/.cfs/*-.cfsconfig and read the serial port info from it

  const file = findWorkspaceConfigFile(workspacePath);
  if (!file) {
    return undefined;
  }

  try {
    const content = JSON.parse(
      fs.readFileSync(file, 'utf8')
    ) as CfsConfig;

    const projects = content.Projects;

    const projectConfig = projects?.find(
      (p) => p.PlatformConfig.ProjectName === project
    );

    const peripherals = projectConfig?.Peripherals;

    // find the peripheral that contains a "Config" with serial port settings
    const serialPortConfig = Object.values(peripherals ?? {}).find(
      (p) => {
        const c = p.Config as Record<string, unknown> | undefined;
        return (
          c &&
          'BAUD' in c &&
          'CHAR_SIZE' in c &&
          'PARITY' in c &&
          'STOP_BITS' in c
        );
      }
    )?.Config as Record<string, unknown> | undefined;

    if (serialPortConfig) {
      const parity = String(serialPortConfig.PARITY).toLowerCase();
      const charSize = Number(serialPortConfig.CHAR_SIZE);
      const stopBits = Number(serialPortConfig.STOP_BITS);
      const baudRate = Number(serialPortConfig.BAUD);

      const raw = {
        parity: isParity(parity) ? parity : 'none',
        dataBits: charSize,
        stopBits,
        baudRate
      };

      if (isValidSerialPortConfig(raw)) {
        return raw;
      }

      throw new Error(
        `Invalid serial port config found in workspace file ${file}. Please ensure the config contains valid values.`
      );
    }
  } catch (error) {
    throw new Error(
      `Error loading serial port settings from ${file}. Please ensure the file exists and contains valid JSON.\nError details: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return undefined;
}

/**
 * Open a serial port. Look for:
 * - User-provided configuration parameters (if any).
 * - If not provided, attempt to load from workspace configuration file (if it exists).
 * - Otherwise, use default values for any missing parameters.
 * @param portName - The name/path of the serial port to open.
 * @param project - The name of the project that will be executed.
 * @param workspacePath - The path of the workspace.
 * @param userConfig - Optional user-provided serial port configuration parameters.
 * @returns Promise resolving to the opened SerialPort instance.
 */
export async function openSerialPort(
  portName: string,
  project?: string,
  workspacePath?: string,
  userConfig?: SerialPortConfig
): Promise<SerialPort> {
  let {
    baudRate = 115_200,
    dataBits = 8 as const,
    parity = 'none',
    stopBits = 1 as const
  } = userConfig || {};

  // If the user hasn't provided config parameters, attempt to load them from the workspace configuration
  if (!userConfig && workspacePath && project) {
    const projectConfig = await getWorkspaceSerialConfig(
      workspacePath,
      project
    );
    if (projectConfig) {
      baudRate = projectConfig.baudRate;
      dataBits = projectConfig.dataBits;
      parity = projectConfig.parity;
      stopBits = projectConfig.stopBits;
    }
  }

  const portInstance = new SerialPort({
    path: portName,
    baudRate,
    dataBits,
    parity,
    stopBits,
    autoOpen: false
  });

  await new Promise<void>((resolve, reject) => {
    portInstance.open((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return portInstance;
}

/**
 * Capture serial port output line-by-line.
 * @param workspacePath - The path of the workspace.
 * @param portName - The name/path of the serial port.
 * @param onData - Callback invoked with each line of data received.
 * @param onError - Callback invoked if an error occurs.
 * @param userConfig - Optional user-provided serial port configuration parameters.
 * @returns Promise resolving to an object with the port and a stop function.
 */
export async function captureSerialOutput({
  portName,
  onData,
  onError,
  workspacePath,
  project,
  userConfig
}: {
  portName: string;
  onData: (line: Buffer) => void;
  onError: (error: Error) => void;
  workspacePath: string;
  project: string;
  userConfig?: SerialPortConfig;
}): Promise<{port: SerialPort; stop: () => Promise<void>}> {
  const port = await openSerialPort(
    portName,
    project,
    workspacePath,
    userConfig
  );

  port.on('data', (data: Buffer) => {
    onData(data);
  });

  port.on('error', (err: Error) => {
    onError(err);
  });

  // Return control object with stop method
  const stop = async (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (port.isOpen) {
        port.close((err) => {
          if (err) {
            onError(err);
          }

          resolve();
        });
      } else {
        resolve();
      }
    });

  return {port, stop};
}

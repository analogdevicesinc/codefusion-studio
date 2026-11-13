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

import {
  DEFAULT_SERIAL_PORT_SETTINGS,
  type IProfilerDataSource,
  type SerialPortSettings,
  SerialSourceConfig,
  createDataSource,
  getWorkspaceSerialSettings
} from 'cfs-lib';
import {SerialPort} from 'serialport';

/**
 * List all available serial ports.
 * @returns Promise resolving to an array of port paths.
 */
export async function listAvailablePorts(): Promise<string[]> {
  const ports = await SerialPort.list();
  return ports.map((port) => port.path);
}

/**
 * Build the data source config for a serial port. Settings are taken from:
 * - User-provided configuration parameters (if any).
 * - If not provided, the project settings in the workspace configuration
 *   file (if it exists).
 * - Otherwise, default values (115200 baud, 8N1).
 * @param portName - The name/path of the serial port.
 * @param options - Where to look for serial settings.
 * @param options.project - The name of the project.
 * @param options.workspacePath - The path of the workspace.
 * @param options.userConfig - Optional user-provided serial settings.
 * @returns The serial source config.
 * @throws Error when the workspace configuration cannot be read or
 * contains invalid serial settings.
 */
export function resolveSerialSourceConfig(
  portName: string,
  options: {
    project?: string;
    workspacePath?: string;
    userConfig?: Partial<SerialPortSettings>;
  } = {}
): SerialSourceConfig {
  const {project, workspacePath, userConfig} = options;

  const workspaceSettings =
    !userConfig && workspacePath && project
      ? getWorkspaceSerialSettings(workspacePath, project)
      : undefined;

  // Skip undefined values so they don't override the defaults.
  const overrides = Object.fromEntries(
    Object.entries(userConfig ?? workspaceSettings ?? {}).filter(
      ([, value]) => value !== undefined
    )
  ) as Partial<SerialPortSettings>;

  const {baudRate, ...lineOptions} = {
    ...DEFAULT_SERIAL_PORT_SETTINGS,
    ...overrides
  };

  return new SerialSourceConfig(portName, baudRate, lineOptions);
}

/**
 * Open a serial port as a profiler data source. See
 * {@link resolveSerialSourceConfig} for how the serial settings are
 * determined.
 * @param portName - The name/path of the serial port to open.
 * @param project - The name of the project that will be executed.
 * @param workspacePath - The path of the workspace.
 * @param userConfig - Optional user-provided serial settings.
 * @returns Promise resolving to the opened data source.
 */
export async function openSerialPort(
  portName: string,
  project?: string,
  workspacePath?: string,
  userConfig?: Partial<SerialPortSettings>
): Promise<IProfilerDataSource> {
  const source = createDataSource(
    resolveSerialSourceConfig(portName, {
      project,
      workspacePath,
      userConfig
    })
  );

  try {
    await source.open();
  } catch (error) {
    await source.dispose();
    throw error;
  }

  return source;
}

/**
 * Capture serial port output.
 * @param workspacePath - The path of the workspace.
 * @param portName - The name/path of the serial port.
 * @param onData - Callback invoked with each chunk of data received.
 * @param onError - Callback invoked if an error occurs.
 * @param userConfig - Optional user-provided serial settings.
 * @returns Promise resolving to an object with the data source and a stop
 * function.
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
  userConfig?: Partial<SerialPortSettings>;
}): Promise<{
  source: IProfilerDataSource;
  stop: () => Promise<void>;
}> {
  const source = await openSerialPort(
    portName,
    project,
    workspacePath,
    userConfig
  );

  source.onData(onData);
  source.onError(onError);

  // Closing the port reports close errors through onError.
  const stop = async (): Promise<void> => source.dispose();

  return {source, stop};
}

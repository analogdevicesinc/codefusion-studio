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

import type { IProfilerDataSource } from "./data-source";
import { SerialDataSource } from "./serial-data-source";
import { UsbDataSource } from "./usb-data-source";

/**
 * Configuration for a serial port data source.
 */
export class SerialSourceConfig {
  private declare readonly __serialSourceConfigBrand: void;

  /**
   * @param portPath Serial port path (e.g., '/dev/ttyUSB0' or 'COM3')
   * @param baudRate Baud rate for the serial connection
   */
  constructor(
    public readonly portPath: string,
    public readonly baudRate: number,
  ) {}
}

/**
 * Configuration for a USB data source.
 */
export class UsbSourceConfig {
  private declare readonly __usbSourceConfigBrand: void;
}

export type DataSourceConfig = SerialSourceConfig | UsbSourceConfig;

/**
 * Creates a data source instance based on the provided configuration.
 * @param config - Configuration specifying the data source type and parameters
 * @returns A new data source instance
 */
export function createDataSource(
  config: DataSourceConfig,
): IProfilerDataSource {
  if (config instanceof SerialSourceConfig) {
    return new SerialDataSource(config.portPath, config.baudRate);
  } else if (config instanceof UsbSourceConfig) {
    return new UsbDataSource();
  }

  throw new Error(`Unknown data source type: ${JSON.stringify(config)}`);
}

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

import * as vscode from "vscode";

/**
 * Interface for data sources that can be used by the profiler.
 * Implementations provide a unified way to receive data from
 * different hardware interfaces (serial, USB, etc.).
 */
export interface IProfilerDataSource extends vscode.Disposable {
  /**
   * Opens the data source connection.
   * @throws Error if the connection cannot be established
   */
  open(): Promise<void>;

  /**
   * Closes the data source connection.
   */
  close(): Promise<void>;

  /**
   * Writes data to the source (if supported).
   * @param data - Data to write
   * @returns Promise resolving to the number of bytes written
   */
  write(data: Buffer | string): Promise<number>;

  /**
   * Returns whether the data source is currently open.
   */
  readonly isOpen: boolean;

  /**
   * Event that fires when data is received from the source.
   */
  readonly onData: vscode.Event<Buffer>;

  /**
   * Event that fires when an error occurs.
   */
  readonly onError: vscode.Event<Error>;
}

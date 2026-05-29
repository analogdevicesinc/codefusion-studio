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
import type { SerialPort } from "serialport";
import type { IProfilerDataSource } from "./data-source";
import { requireSerialPort } from "../serial-port-module-loader";

/**
 * Data source implementation for serial port connections.
 */
export class SerialDataSource implements IProfilerDataSource {
  private readonly serialPort: SerialPort;

  private readonly _onData = new vscode.EventEmitter<Buffer>();
  readonly onData = this._onData.event;

  private readonly _onError = new vscode.EventEmitter<Error>();
  readonly onError = this._onError.event;

  constructor(
    private readonly portPath: string,
    private readonly baudRate: number,
  ) {
    const { SerialPort } = requireSerialPort();
    this.serialPort = new SerialPort({
      path: this.portPath,
      baudRate: this.baudRate,
      autoOpen: false,
    });

    this.serialPort.on("data", (data: Buffer) => {
      this._onData.fire(data);
    });

    this.serialPort.on("error", (error: Error) => {
      this._onError.fire(error);
    });
  }

  get isOpen(): boolean {
    return this.serialPort.isOpen;
  }

  async open(): Promise<void> {
    if (this.isOpen) {
      throw new Error("Serial port is already open");
    }

    await new Promise<void>((resolve, reject) => {
      this.serialPort.open((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.isOpen) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.serialPort.close((error) => {
        if (error) {
          this._onError.fire(error);
        }
        resolve();
      });
    });
  }

  async write(data: Buffer | string): Promise<number> {
    if (!this.isOpen) {
      throw new Error("Serial port is not open");
    }

    const buffer = typeof data === "string" ? Buffer.from(data) : data;

    return new Promise((resolve, reject) => {
      this.serialPort.write(buffer, (error) => {
        if (error) {
          reject(error);
        } else {
          this.serialPort.drain((drainError) => {
            if (drainError) {
              reject(drainError);
            } else {
              resolve(buffer.length);
            }
          });
        }
      });
    });
  }

  dispose(): void {
    void this.close();
    this._onData.dispose();
    this._onError.dispose();
  }
}

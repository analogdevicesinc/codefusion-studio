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
import type { IProfilerDataSource } from "./data-source";

/**
 * Data source implementation for USB connections.
 *
 * Note: This is a placeholder implementation. Full USB support requires
 * integration with a USB library such as 'usb' or 'node-usb'.
 */
export class UsbDataSource implements IProfilerDataSource {
  private readonly _onData = new vscode.EventEmitter<Buffer>();
  readonly onData = this._onData.event;

  private readonly _onError = new vscode.EventEmitter<Error>();
  readonly onError = this._onError.event;

  private _isOpen = false;

  constructor() {}

  get isOpen(): boolean {
    return this._isOpen;
  }

  async open(): Promise<void> {
    // TODO: Implement USB connection using a USB library
    // Example libraries: 'usb', 'node-usb', 'webusb'
    //
    // Implementation would:
    // 1. Find device by vendorId and productId
    // 2. If serialNumber specified, filter by serial number
    // 3. Open the device
    // 4. Claim the interface
    // 5. Set up bulk/interrupt transfer on the endpoint
    // 6. Emit data events when data is received
    throw new Error("USB data source not yet implemented.");
  }

  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    // TODO: Implement USB disconnection
    // 1. Cancel any pending transfers
    // 2. Release the interface
    // 3. Close the device

    this._isOpen = false;
  }

  async write(_data: Buffer | string): Promise<number> {
    // TODO: Implement USB write
    // 1. Convert string to buffer if needed
    // 2. Perform bulk/interrupt out transfer on the endpoint
    throw new Error("USB write not yet implemented");
  }

  dispose(): void {
    void this.close();
    this._onData.dispose();
    this._onError.dispose();
  }
}

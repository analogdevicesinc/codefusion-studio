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
import {Command, Flags} from '@oclif/core';
import {SerialPort} from 'serialport';

export default class List extends Command {
  static description = 'List available serial ports.';

  static flags = {
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Display detailed information about each serial port.',
      required: false,
      default: false
    })
  };

  public async run(): Promise<void> {
    const {flags} = await this.parse(List);
    const ports = await SerialPort.list();

    if (ports.length === 0) {
      this.log('No serial ports found.');
      return;
    }

    this.log('Available serial ports:');
    for (const port of ports) {
      this.log(`${port.path}`);
      if (flags.verbose) {
        this.log(`  Manufacturer: ${port.manufacturer}`);
        this.log(`  Serial Number: ${port.serialNumber}`);
        this.log(`  PnP ID: ${port.pnpId}`);
        this.log(`  Location ID: ${port.locationId}`);
        this.log(`  Vendor ID: ${port.vendorId}`);
        this.log(`  Product ID: ${port.productId}`);
      }
    }
  }
}

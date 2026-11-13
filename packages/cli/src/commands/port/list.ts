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
import {BaseCommand} from '../../utils/base-command.js';
import {SerialPort} from 'serialport';

export const portListDeps: {
  listPorts: typeof SerialPort.list;
} = {
  listPorts: SerialPort.list
};

export default class List extends BaseCommand<typeof List> {
  static description = 'List available serial ports.';
  static useResponseEnvelope = true;

  public async run(): Promise<{
    ports: Awaited<ReturnType<typeof portListDeps.listPorts>>;
  }> {
    const {flags} = this;
    const ports = await portListDeps.listPorts();

    if (ports.length === 0) {
      this.log('No serial ports found.');
      return {ports: []};
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

    return {ports};
  }
}

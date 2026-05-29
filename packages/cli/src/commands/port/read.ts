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
import {ReadlineParser} from '@serialport/parser-readline';

import {openSerialPort} from '../../utils/serial-capture.js';

export default class Read extends Command {
  static description = 'Read data from a connected board.';

  static flags = {
    port: Flags.string({
      char: 'p',
      summary: 'The serial port to read from (e.g., COM3)',
      required: true
    })
  };

  static hidden = true; // Hide this command from the help output for now.

  public async run(): Promise<void> {
    const {flags} = await this.parse(Read);

    // Open the specified serial port. Issue an error if it fails (e.g., port not found or permission denied).
    const port = await openSerialPort(flags.port)
      .then((openedPort) => openedPort)
      .catch((error) => {
        this.error(
          `Failed to open port ${flags.port}: ${error.message}`
        );
      });

    // Parse incoming data line by line
    const parser = port.pipe(new ReadlineParser({delimiter: '\r\n'}));

    parser.on('data', (data: string) => {
      this.log(data);
    });

    port.on('error', (err: Error) => {
      this.error(`Error: ${err.message}`);
    });

    port.on('close', () => {
      this.log('\nPort closed.', {
        type: 'status',
        message: 'Port closed.'
      });
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.log('\n\nClosing port...', {
        type: 'status',
        message: 'Closing port...'
      });
      port.close();
    });
  }
}

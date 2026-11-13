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
import {Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {ReadlineParser} from '@serialport/parser-readline';
import path from 'node:path';

import {openSerialPort} from '../../utils/serial-capture.js';

export const portReadDeps: {
  openSerialPort: typeof openSerialPort;
} = {
  openSerialPort
};

export default class Read extends BaseCommand<typeof Read> {
  static description = 'Read data from a connected board.';

  static override examples = [
    '<%= config.bin %> <%= command.id %> --port /dev/ttyUSB0',
    '<%= config.bin %> <%= command.id %> --port COM3 --workspace my-workspace --project m4'
  ];

  static flags = {
    port: Flags.string({
      char: 'p',
      summary: 'The serial port to read from (e.g., COM3)',
      required: true
    }),
    workspace: Flags.string({
      char: 'w',
      summary:
        'The workspace path, used to read serial settings. Defaults to the current directory',
      required: false,
      default: process.cwd()
    }),
    project: Flags.string({
      summary:
        'The project id within the workspace, used to read serial settings',
      required: false
    })
  };

  static hidden = true; // Hide this command from the help output for now.

  public async run(): Promise<void> {
    const {flags} = this;
    const workspacePath = path.resolve(flags.workspace);

    // Open the specified serial port. Issue an error if it fails (e.g., port not found or permission denied).
    const port = await portReadDeps
      .openSerialPort(flags.port, flags.project, workspacePath)
      .catch((error) => {
        this.error(
          `Failed to open port ${flags.port}: ${error.message}`
        );
      });

    // Parse incoming data line by line
    const parser = new ReadlineParser({delimiter: '\r\n'});
    port.onData((data) => parser.write(data));

    parser.on('data', (data: string) => {
      this.log(data);
    });

    port.onError((err: Error) => {
      this.error(`Error: ${err.message}`);
    });

    let closed = false;
    const closePort = async () => {
      if (closed) {
        return;
      }

      closed = true;
      process.removeListener('SIGINT', onSigint);
      await port.dispose();
      this.log('\nPort closed.', {
        type: 'status',
        message: 'Port closed.'
      });
    };

    // Handle Ctrl+C gracefully
    const onSigint = () => {
      this.log('\n\nClosing port...', {
        type: 'status',
        message: 'Closing port...'
      });
      void closePort();
    };

    process.on('SIGINT', onSigint);
    port.onDisconnect(() => void closePort());
  }
}

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
import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import {EventEmitter} from 'node:events';
import path from 'node:path';
import sinon from 'sinon';

import type {IProfilerDataSource} from 'cfs-lib';

import Read, {
  portReadDeps
} from '../../../dist/commands/port/read.js';

/**
 * Minimal stand-in for an opened serial data source.
 */
class FakePort {
  isOpen = true;
  private readonly emitter = new EventEmitter();

  onData(listener: (data: Buffer) => void): void {
    this.emitter.on('data', listener);
  }

  onError(listener: (error: Error) => void): void {
    this.emitter.on('error', listener);
  }

  onDisconnect(listener: () => void): void {
    this.emitter.on('disconnect', listener);
  }

  async dispose(): Promise<void> {
    this.isOpen = false;
  }

  /** Simulate incoming data. */
  receive(text: string): void {
    this.emitter.emit('data', Buffer.from(text));
  }

  /** Simulate the device going away; the command closes the port. */
  disconnect(): void {
    this.emitter.emit('disconnect');
  }
}

/**
 * Test suite for port:read command.
 *
 * The serial port is replaced by a fake.
 */
describe('port:read', () => {
  const originalDeps = {...portReadDeps};

  let port: FakePort;
  let openArgs: unknown[];

  beforeEach(() => {
    port = new FakePort();
    openArgs = [];
    portReadDeps.openSerialPort = async (...args) => {
      openArgs = args;
      return port as unknown as IProfilerDataSource;
    };
  });

  afterEach(() => {
    sinon.restore();
    Object.assign(portReadDeps, originalDeps);
  });

  it('opens the port with the workspace serial settings', async () => {
    const {error} = await runCommand(
      [
        'port:read',
        '-p',
        '/dev/ttyUSB0',
        '--workspace',
        '/ws',
        '--project',
        'm4'
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(openArgs).to.deep.equal([
      '/dev/ttyUSB0',
      'm4',
      path.resolve('/ws')
    ]);
    port.disconnect();
  });

  it('prints received data line by line', async () => {
    const logged: unknown[] = [];
    sinon.stub(Read.prototype, 'log').callsFake((message) => {
      logged.push(message);
    });

    const {error} = await runCommand(
      ['port:read', '-p', '/dev/ttyUSB0'],
      {root: '..'}
    );
    port.receive('booting\r\nhello ');
    port.receive('world\r\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(error).to.be.undefined;
    expect(logged).to.deep.equal(['booting', 'hello world']);
    port.disconnect();
  });

  it('closes the port when the device disconnects', async () => {
    await runCommand(['port:read', '-p', '/dev/ttyUSB0'], {
      root: '..'
    });
    port.disconnect();
    await new Promise((resolve) => setImmediate(resolve));

    expect(port.isOpen).to.be.false;
  });
});

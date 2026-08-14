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

import {portListDeps} from '../../../src/commands/port/list.js';

/**
 * Test suite for port:list command.
 *
 * Tests cover:
 * - No ports found: verify appropriate message
 * - Ports found without -v or --verbose: verify paths are listed, verbose details absent
 * - Ports found with -v and --verbose: verify both flags produce identical verbose output
 */

describe('port:list', () => {
  const mockPorts = [
    {
      path: '/dev/ttyUSB0',
      manufacturer: 'Big Corp 1',
      serialNumber: '12345678',
      pnpId: 'myID1',
      locationId: '0x1234',
      vendorId: '10c4',
      productId: 'ea60'
    },
    {
      path: '/dev/ttyUSB1',
      manufacturer: 'Big Corp 2',
      serialNumber: 'ABCDEF',
      pnpId: 'myID2',
      locationId: '0x5678',
      vendorId: '0403',
      productId: '6001'
    }
  ];

  const originalListPorts = portListDeps.listPorts;

  afterEach(() => {
    portListDeps.listPorts = originalListPorts;
  });

  describe('no ports found', () => {
    it('displays "No serial ports found" when no ports are available', async () => {
      portListDeps.listPorts = async () => [];
      const {stdout} = await runCommand(['port:list'], {root: '..'});
      expect(stdout).to.contain('No serial ports found');
      expect(stdout).not.to.contain('Available serial ports');
    });
  });

  describe('ports found', () => {
    it('lists port paths without verbose details', async () => {
      portListDeps.listPorts = async () => mockPorts;
      const {stdout} = await runCommand(['port:list'], {root: '..'});
      expect(stdout).to.contain('Available serial ports:');
      expect(stdout).to.contain('/dev/ttyUSB0');
      expect(stdout).to.contain('/dev/ttyUSB1');
      // Verbose details should not be present
      expect(stdout).not.to.contain('Manufacturer:');
      expect(stdout).not.to.contain('Serial Number:');
      expect(stdout).not.to.contain('Big Corp 1');
    });

    for (const flag of ['-v', '--verbose']) {
      it(`displays verbose details with ${flag} flag`, async () => {
        portListDeps.listPorts = async () => mockPorts;
        const {stdout} = await runCommand(['port:list', flag], {
          root: '..'
        });
        expect(stdout).to.contain('Available serial ports:');
        expect(stdout).to.contain('/dev/ttyUSB0');
        expect(stdout).to.contain('/dev/ttyUSB1');
        expect(stdout).to.contain('Manufacturer:');
        expect(stdout).to.contain('Big Corp 1');
        expect(stdout).to.contain('12345678');
        expect(stdout).to.contain('myID1');
        expect(stdout).to.contain('myID2');
        expect(stdout).to.contain('0x5678');
      });
    }
  });
});

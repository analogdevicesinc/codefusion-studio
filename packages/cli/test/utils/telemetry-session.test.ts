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

import {
  addTelemetryMetadata,
  clearTelemetrySession,
  getTelemetrySession,
  initTelemetrySession,
  preserveTelemetrySession
} from '../../src/utils/telemetry-session.js';

describe('telemetry session singleton', () => {
  afterEach(() => {
    clearTelemetrySession();
  });

  it('returns null when no session is initialized', () => {
    expect(getTelemetrySession()).to.equal(null);
  });

  it('returns the session after initialization', () => {
    const fakeManager = {} as never;
    initTelemetrySession(fakeManager, 12345);

    const session = getTelemetrySession();
    expect(session).to.not.equal(null);
    expect(session?.manager).to.equal(fakeManager);
    expect(session?.startTime).to.equal(12345);
    expect(session?.metadata).to.deep.equal({});
  });

  it('clears the session', () => {
    const fakeManager = {} as never;
    initTelemetrySession(fakeManager, 0);

    clearTelemetrySession();

    expect(getTelemetrySession()).to.equal(null);
  });

  it('adds metadata to the current session', () => {
    initTelemetrySession({} as never, 0);

    addTelemetryMetadata({templateId: 'hello'});
    addTelemetryMetadata({board: 'EvKit_V1'});

    const session = getTelemetrySession();
    expect(session?.metadata).to.deep.equal({
      templateId: 'hello',
      board: 'EvKit_V1'
    });
  });

  it('ignores addMetadata when no session exists', () => {
    addTelemetryMetadata({templateId: 'hello'});

    expect(getTelemetrySession()).to.equal(null);
  });

  describe('preserveTelemetrySession', () => {
    // Simulates the prerun hook of a nested command replacing the
    // session and the nested command adding its own metadata.
    function simulateNestedCommand() {
      initTelemetrySession({} as never, 99999);
      addTelemetryMetadata({soc: 'nested-soc', nestedOnly: true});
    }

    it('restores the outer session and its metadata', async () => {
      const outerManager = {} as never;
      initTelemetrySession(outerManager, 100);
      addTelemetryMetadata({soc: 'MAX32690', board: 'EvKit_V1'});
      const outer = getTelemetrySession();

      await preserveTelemetrySession(async () => {
        simulateNestedCommand();
      });

      const session = getTelemetrySession();
      expect(session).to.equal(outer);
      expect(session?.manager).to.equal(outerManager);
      expect(session?.startTime).to.equal(100);
      expect(session?.metadata).to.deep.equal({
        soc: 'MAX32690',
        board: 'EvKit_V1'
      });
    });

    it('keeps metadata added after the nested command', async () => {
      initTelemetrySession({} as never, 0);

      await preserveTelemetrySession(async () => {
        simulateNestedCommand();
      });
      addTelemetryMetadata({templateId: 'com.analog.test'});

      expect(getTelemetrySession()?.metadata).to.deep.equal({
        templateId: 'com.analog.test'
      });
    });

    it('restores the outer session when the callback throws', async () => {
      initTelemetrySession({} as never, 100);
      addTelemetryMetadata({soc: 'MAX32690'});

      let caught: unknown;
      try {
        await preserveTelemetrySession(async () => {
          simulateNestedCommand();
          throw new Error('nested failed');
        });
      } catch (error) {
        caught = error;
      }

      expect((caught as Error)?.message).to.equal('nested failed');
      expect(getTelemetrySession()?.startTime).to.equal(100);
      expect(getTelemetrySession()?.metadata).to.deep.equal({
        soc: 'MAX32690'
      });
    });

    it('returns the callback result', async () => {
      const result = await preserveTelemetrySession(async () => 42);

      expect(result).to.equal(42);
    });

    it('leaves no session when none was active', async () => {
      await preserveTelemetrySession(async () => {
        simulateNestedCommand();
      });

      expect(getTelemetrySession()).to.equal(null);
    });
  });
});

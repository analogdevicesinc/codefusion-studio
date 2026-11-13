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
import {UserType} from 'cfs-lib';
import Sinon from 'sinon';

import {
  determineTelemetryUserType,
  telemetryUserTypeDeps
} from '../../src/utils/telemetry-user-type.js';

describe('telemetry local user type', () => {
  let sandbox: Sinon.SinonSandbox;
  let emails: Sinon.SinonStub;
  let execute: Sinon.SinonStub;
  let warn: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    emails = sandbox
      .stub(telemetryUserTypeDeps, 'getLocalSessionEmails')
      .resolves([]);
    execute = sandbox
      .stub(telemetryUserTypeDeps, 'exec')
      .resolves({stdout: 'WORKGROUP', stderr: ''});
    sandbox.stub(telemetryUserTypeDeps, 'platform').returns('win32');
    warn = sandbox.stub();
  });

  afterEach(() => sandbox.restore());

  it('recognizes ADI email domains locally without executing device checks', async () => {
    emails.resolves(['someone@example.com', 'Employee@ANALOG.COM']);
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
    expect(execute.called).to.equal(false);
  });

  it('does not accept lookalike ADI email domains', async () => {
    emails.resolves(['someone@analog.com.example.com']);
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.EXTERNAL
    );
    expect(execute.calledOnce).to.equal(true);
  });

  it('checks an ADI-managed Windows domain even for an external account', async () => {
    emails.resolves(['someone@example.com']);
    execute.resolves({stdout: 'corp.ANALOG.com', stderr: ''});
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
    expect(execute.firstCall.args[0]).to.equal(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystem).Domain"'
    );
    expect(execute.firstCall.args[1]).to.deep.equal({
      windowsHide: true,
      timeout: 5000
    });
  });

  it('uses a locale-independent Windows domain query for unmanaged devices', async () => {
    execute.resolves({stdout: 'WORKGROUP', stderr: ''});
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.EXTERNAL
    );
    expect(execute.firstCall.args[0]).to.equal(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystem).Domain"'
    );
  });

  it('reads Linux host indicators locally', async () => {
    (telemetryUserTypeDeps.platform as Sinon.SinonStub).returns(
      'linux'
    );
    execute.resolves({
      stdout: '192.0.2.1 host.analog.com',
      stderr: ''
    });
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
    expect(execute.firstCall.args[0]).to.equal(
      'grep -i analog /etc/hosts'
    );
  });

  it('checks macOS enrollment locally without treating all MDM as ADI', async () => {
    (telemetryUserTypeDeps.platform as Sinon.SinonStub).returns(
      'darwin'
    );
    execute.resolves({stdout: 'MDM enrollment: Yes', stderr: ''});
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.EXTERNAL
    );
    expect(execute.firstCall.args[0]).to.equal(
      'profiles status -type enrollment'
    );
    expect(execute.calledOnce).to.equal(true);
    execute.resolves({stdout: 'analog enrollment', stderr: ''});
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
  });

  for (const output of [
    'analog.example.com',
    'analog.local',
    'notanalog.example.com'
  ]) {
    it(`matches the IDE substring heuristic for ${output}`, async () => {
      execute.resolves({stdout: output, stderr: ''});
      expect(await determineTelemetryUserType(warn)).to.equal(
        UserType.INTERNAL
      );
    });
  }

  it('matches the IDE heuristic for Linux host comments', async () => {
    (telemetryUserTypeDeps.platform as Sinon.SinonStub).returns(
      'linux'
    );
    execute.resolves({
      stdout: '127.0.0.1 localhost # analog reference',
      stderr: ''
    });
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
  });

  it('treats Linux grep no-match exit as external', async () => {
    (telemetryUserTypeDeps.platform as Sinon.SinonStub).returns(
      'linux'
    );
    execute.rejects(Object.assign(new Error('no match'), {code: 1}));
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.EXTERNAL
    );
  });

  it('warns without revealing session details and continues device checks', async () => {
    emails.rejects(new Error('private email and path'));
    execute.resolves({stdout: 'analog', stderr: ''});
    expect(await determineTelemetryUserType(warn)).to.equal(
      UserType.INTERNAL
    );
    expect(warn.calledOnce).to.equal(true);
    expect(warn.firstCall.args[0]).not.to.contain('private');
  });

  it('does not classify as external when session lookup fails and device check finds no indicator', async () => {
    emails.rejects(new Error('private email and path'));
    execute.resolves({stdout: 'WORKGROUP', stderr: ''});
    let error: unknown;
    try {
      await determineTelemetryUserType(warn);
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.equal(
      'Unable to determine the telemetry user type from local checks. Telemetry was not initialized.'
    );
    expect((error as Error).message).not.to.contain('private');
    expect(warn.calledOnce).to.equal(true);
  });

  it('does not classify as external when session lookup fails and Linux has no match', async () => {
    emails.rejects(new Error('private email and path'));
    (telemetryUserTypeDeps.platform as Sinon.SinonStub).returns(
      'linux'
    );
    execute.rejects(Object.assign(new Error('no match'), {code: 1}));
    let error: unknown;
    try {
      await determineTelemetryUserType(warn);
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.contain(
      'Telemetry was not initialized'
    );
  });

  it('rejects failed device checks without returning an external classification', async () => {
    execute.rejects(new Error('private device details'));
    let error: unknown;
    try {
      await determineTelemetryUserType(warn);
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.contain(
      'Telemetry was not initialized'
    );
    expect((error as Error).message).not.to.contain('private');
  });
});

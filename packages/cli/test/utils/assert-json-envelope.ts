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
import {compileJsonSchemaValidator} from 'cfs-lib';

import envelopeSchema from '../schemas/cli-json-envelope.schema.json' with {type: 'json'};

const envelopeValidator = compileJsonSchemaValidator(envelopeSchema);

/**
 * Shape of a successful CLI response envelope.
 */
export interface CliSuccessEnvelope<TData = unknown> {
  ok: true;
  command: string;
  data: TData;
  warnings: {message: string}[];
}

/**
 * Shape of a failed CLI response envelope.
 */
export interface CliErrorEnvelope {
  ok: false;
  command: string;
  errors: {code: string; message: string}[];
}

export type CliEnvelope<TData = unknown> =
  | CliSuccessEnvelope<TData>
  | CliErrorEnvelope;

/**
 * Parse a command's raw stdout and assert it is exactly one valid JSON
 * document matching the shared CLI response envelope
 * (`{ok, command, data, warnings, errors}`). Use this instead of hand-rolled
 * shape assertions in every enveloped command's tests.
 */
export function assertValidEnvelope<TData = unknown>(
  rawStdout: string
): CliEnvelope<TData> {
  // Throws loudly if stdout isn't valid JSON at all.
  const parsed: unknown = JSON.parse(rawStdout);

  if (!envelopeValidator.validate(parsed)) {
    throw new Error(
      `Envelope failed schema validation: ${envelopeValidator.errorsText()}`
    );
  }

  // TData is not schema-checked; callers are responsible for asserting the
  // returned shape actually matches TData.
  return parsed as CliEnvelope<TData>;
}

/**
 * Parse a command's raw stdout, assert it is a valid success envelope for
 * `expectedCommand`, and return its `data` payload. Use this instead of
 * hand-rolling `ok`/`command` assertions in every command's success tests.
 */
export function assertSuccessEnvelopeData<TData = unknown>(
  rawStdout: string,
  expectedCommand: string
): TData {
  const parsed = assertValidEnvelope<TData>(rawStdout);
  expect(
    parsed.ok,
    `expected a success envelope (ok: true): ${rawStdout}`
  ).to.be.true;
  expect(parsed.command).to.equal(expectedCommand);
  return (parsed as CliSuccessEnvelope<TData>).data;
}

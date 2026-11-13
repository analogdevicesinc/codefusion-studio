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

export const TELEMETRY_DISCLOSURE =
  'CodeFusion Studio CLI collects diagnostic and usage data, including tool ' +
  'version, operating system, command categories, performance metrics, and ' +
  'error codes, to improve usability and performance. A randomly generated ' +
  'usage identifier is stored locally to link your sessions. No source code, ' +
  'file paths, credentials, or personal details are collected. To distinguish ' +
  'ADI-internal from external use, CFS checks locally whether you are signed ' +
  'in to myAnalog with an ADI account or using an ADI-managed computer; only ' +
  'the result is shared. To learn more, ' +
  'view our Privacy Policy at https://www.analog.com/en/who-we-are/' +
  'legal-and-risk-oversight/data-privacy/privacy-policy.html.';

export const TELEMETRY_CONSENT_MESSAGE =
  TELEMETRY_DISCLOSURE +
  '\n\n' +
  'You can change this setting at any time by running: cfs telemetry disable' +
  '\n\n' +
  'Press Y to consent to data sharing, or press N to decline.';

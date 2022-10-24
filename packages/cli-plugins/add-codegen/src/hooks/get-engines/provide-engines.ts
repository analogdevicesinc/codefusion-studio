/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {Hook} from '@oclif/core';

/**
 * Hook that returns the code generation engine(s) that this plugin provides
 * @returns {Promise<object[]>} A list of export engines
 */
const hook: Hook<'get-engines'> = async function () {
  return [{
    name: 'example-code-generation-engine',
    label: 'Example Code Generation',
    description: 'This is an example of a code generation engine implementation.',
    version: '1.0.0',
    socs: [],
    features: ['Pin Config'],
  }] as object[];
};

export default hook;

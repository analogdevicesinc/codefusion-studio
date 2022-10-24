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

import type {Engine} from '../../lib/engines.js';

/**
 * Hook that returns the export engines that the main CLI provides
 * @returns {Promise<Engine[]>} A list of export engines
 */
const hook: Hook<'get-engines'> = async function () {
  return [
    /* Hide baremetal code generator. */
    // {
    //   name: 'baremetal',
    //   label: 'Bare Metal',
    //   description: 'Bare metal code generation engine.',
    //   version: '1.0.0',
    //   socs: [],
    //   features: ['Pin Config']
    // },
    {
      name: 'msdk',
      label: 'MSDK',
      description: 'MSDK code generation engine.',
      version: '1.0.0',
      socs: ['MAX32690', 'MAX78002'],
      features: ['Pin Config', 'ClockConfig']
    },
    {
      name: 'zephyr',
      label: 'Zephyr',
      description: 'Zephyr code generation engine.',
      version: '1.0.0',
      socs: ['MAX32690'],
      features: ['Pin Config', 'Clock Config']
    }
  ] as Engine[];
};

export default hook;

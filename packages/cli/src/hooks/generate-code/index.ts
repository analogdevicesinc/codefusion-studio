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

import type {Configdata} from '../../types/configdata.js';
import type {Soc} from '../../types/soc.js';

import {exportMsdk} from '../../lib/msdk.js';
import {exportZephyr} from '../../lib/zephyr.js';

/**
 * Hook that returns generated code
 * @param {Record} options - Hook options
 * @returns {Promise<object>} Generated code files
 */
const hook: Hook<'generate-code'> = async function (options) {
  if (!['msdk', 'zephyr'].includes(options.engine as string)) {
    return;
  }

  const configdata = options.configdata as Configdata;
  const soc = options.soc as Soc;

  /* Hide baremetal code generator. */
  // if (options.engine === 'baremetal') {
  //   return exportBaremetal(configdata, soc);
  // }

  if (options.engine === 'msdk') {
    return exportMsdk(configdata, soc);
  }

  if (options.engine === 'zephyr') {
    return exportZephyr(configdata, soc);
  }
};

export default hook;

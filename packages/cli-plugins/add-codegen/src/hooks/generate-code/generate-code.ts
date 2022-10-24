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
 * Hook that returns the generated code files that this plugin provides
 * @param {Record} options - Hook options
 * @param {Config} options.config - oclif config
 * @param {string} options.config.root - the root directory of this plugin
 * @returns {object|undefined} A map of generated code lines, indexed by file name
 */
const hook: Hook<'generate-code'> = async function (options) {
  if (options.engine !== 'example-code-generation-engine') {
    return; // code generation request is not for us
  }

  const configdata = options.configdata as {Soc: string};
  const soc = options.soc as {Name: string};

  const cFileName = `${soc.Name}_init.c`;
  const hFileName = `${soc.Name}_init.h`;

  const cCodeLines = [
    `#include "${hFileName}"`,
    '',
    'void init_soc() {',
    `  // your code here for setting up ${configdata.Soc}`,
    '}',
  ];

  const hCodeLines = [
    'void init_soc();',
  ];

  return {
    [cFileName]: cCodeLines,
    [hFileName]: hCodeLines,
  };
}

export default hook;

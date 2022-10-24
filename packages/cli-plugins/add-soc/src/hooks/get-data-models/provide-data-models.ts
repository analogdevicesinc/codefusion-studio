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
import path from 'node:path';

/**
 * Hook that returns the SoC data models that this plugin provides
 * @param {Record} options - Hook options
 * @param {Config} options.config - oclif config
 * @param {string} options.config.root - the root directory of this plugin
 * @returns {object} A map of data models
 */
const hook: Hook<'get-data-models'> = async function (options) {
  const socsDir = path.resolve(options.config.root, 'dist/socs');

  return {
    soc1234: path.resolve(socsDir, 'soc1234.json'),
    soc5678: path.resolve(socsDir, 'soc5678.json'),
  };
}

export default hook;

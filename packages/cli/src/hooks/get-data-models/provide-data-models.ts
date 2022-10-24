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
import {promises as fs} from 'node:fs';
import path from 'node:path';

import type {SocDataModels} from '../../lib/socs.js';

// directory containing SoC jsons
function getSocsDir(rootDir: string) {
  return path.resolve(rootDir, 'dist/socs');
}

/**
 * Hook that returns the SoC data models that this plugin provides
 * @param {Record} options - Hook options
 * @returns {SocDataModels} A map of data models
 */
const hook: Hook<'get-data-models'> = async function (options) {
  const socsDir = getSocsDir(options.config.root);
  const files = await fs.readdir(socsDir);

  if (files.length === 0) {
    throw new Error(`No SoC files found in "${socsDir}". Please reinstall this utility.`);
  }

  const socs: SocDataModels = Object.fromEntries(files.map(file => ([
    path.parse(file).name,
    path.resolve(socsDir, file)
  ])));

  return socs;
}

export default hook;

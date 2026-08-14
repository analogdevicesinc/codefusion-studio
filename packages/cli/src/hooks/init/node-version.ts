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

import {Hook} from '@oclif/core';
import fs from 'node:fs';
import path from 'node:path';
import {satisfies as semverSatisfies} from 'semver';

function getSupportedNodeRange(
  configRoot: string
): string | undefined {
  try {
    const packageJsonPath = path.resolve(configRoot, 'package.json');
    const packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonText) as {
      engines?: {node?: string};
    };

    return typeof packageJson.engines?.node === 'string'
      ? packageJson.engines.node
      : undefined;
  } catch {}
}

const hook: Hook<'init'> = async function (options) {
  const nodeVersionRange = getSupportedNodeRange(
    options.config.root
  )?.trim();
  if (!nodeVersionRange) {
    return;
  }

  if (
    semverSatisfies(process.versions.node, nodeVersionRange) === false
  ) {
    options.context.warn(
      `This utility requires Node ${nodeVersionRange} (current: v${process.versions.node}).`
    );
  }
};

export default hook;

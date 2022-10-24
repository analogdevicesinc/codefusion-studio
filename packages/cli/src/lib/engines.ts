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
import {Config} from '@oclif/core';

export type Engine = {
  name: string;
  label: string;
  description: string;
  version: string;
  socs: string[];
  features: string[];
};

export type Engines = Record<string, Engine>;

export async function getEngines(config: Config) {
  const engines: Engines = {};
  const result = await config.runHook('get-engines', {});
  for (const success of result.successes) {
    for (const engine of success.result as Engine[]) {
      const {name} = engine;

      if (engines[name]) {
        console.warn(`Engine "${name}" already defined, overwritting previous definition.`);
      }

      engines[name] = engine;
    }
  }

  return Object.values(engines);
}

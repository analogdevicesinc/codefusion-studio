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
import {Args, Command, Flags} from '@oclif/core'

import { getEngines } from '../../lib/engines.js';

export default class EnginesInfo extends Command {
  static args = {
    name: Args.string({
      required: true,
      description: 'Name of the engine.'
    }),
  }

  static description = 'Display detailed information about a code generation engine.'

  static flags = {
    format: Flags.string({
      char: 'f',
      default: 'text',
      summary: 'Set the data encoding format.',
      options: ['text', 'json'],
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(EnginesInfo);

    const engines = await getEngines(this.config);
    const engine = engines?.find(e => e.name === args.name);

    if(engine){
      if (flags.format === 'json') {
        this.log(JSON.stringify(engine, null, 2));
      } else {
        this.log(engine.name);
        this.log(`Label: ${engine.label}`);
        this.log(`Description: ${engine.description}`);
        this.log(`Version: ${engine.version}`);
        this.log(`Supported SoCs: ${engine.socs.join(', ') || 'All'}`);
        this.log(`Supported features: ${engine.features.join(', ') || 'All'}`);
        this.log('');
      }
    } else {
      this.error(`Please provide a valid engine name, ${args.name} not found.`);
    }
  }
}

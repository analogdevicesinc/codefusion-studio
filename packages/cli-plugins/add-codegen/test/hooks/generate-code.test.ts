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
import {expect, test} from '@oclif/test';

describe('hooks', () => {
  const config = {root: process.cwd()}; 
  const engine = 'example-code-generation-engine';
  const configdata = {Soc: 'SOC'};
  const soc = {Name: 'SOC'};

  test
		.loadConfig(config)
		.stdout()
		.hook('generate-code', {engine: 'msdk', configdata, soc}, config)
		.do((output) => {
			// @ts-expect-error: hook output.returned is of type unknown
			const {result} = output.returned.successes[0]
			expect(result).to.be.undefined
		})
		.it('should ignore generate-code for other engine')

  test
    .loadConfig(config)
    .stdout()
    .hook('generate-code', {engine, configdata, soc}, config)
    .do((output) => {
      // @ts-expect-error: hook output.returned is of type unknown
      const {result} = output.returned.successes[0];
      expect(result).to.not.be.undefined;
      expect(result).to.have.keys('SOC_init.c', 'SOC_init.h');
      expect(result['SOC_init.c']).to.have.length.gt(0);
      expect(result['SOC_init.h']).to.have.length.gt(0);
    })
    .it('should respond to generate-code with 2 generated files');
  });

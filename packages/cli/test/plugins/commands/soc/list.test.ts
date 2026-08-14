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
import {expect} from 'chai';
import {runCommand} from '@oclif/test';
// @TODO: skiping until cli plugins are removed as they will be deprecated now.
describe.skip('socs list (with add-soc plugin)', () => {
  it('returns an example custom SoC', async () => {
    const {stdout} = await runCommand(['socs:list'], {
      root: '..'
    });
    expect(stdout).to.contain('test_soc_b-tqfn');
    expect(stdout).to.contain('soc1234');
  });
});

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
import {expect, test} from '@oclif/test'

describe('socs list (with add-soc plugin)', () => {
	test
		.stdout()
		.command(['socs:list'], {
			root: '..',
		})
		.it('returns an example custom SoC', (ctx) => {
			expect(ctx.stdout).to.contain('max32690-tqfn')
			expect(ctx.stdout).to.contain('soc1234')
		});
})

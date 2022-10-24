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

describe('soc export', () => {
	test
		.stdout()
		.command(['socs:export', '--name', 'max32690-tqfn'], {
			root: '..',
		})
		.it('runs socs export --name max32690-tqfn', (ctx) => {
			expect(ctx.stdout).to.contain('"Name": "MAX32690",')
		})
})

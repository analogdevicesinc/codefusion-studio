/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {expect} from 'chai'
import {runHook} from '@oclif/test'
import {Hook} from '@oclif/core'

describe('hooks', () => {
	const config = {root: process.cwd()}
	const engine = 'example-code-generation-engine'

	it('should respond to get-engines hook', async () => {
		const {result} = await runHook<Hook.Result<string>>('get-engines', {argv: []}, config)
		const hookResult = result?.successes[0]?.result
		expect(hookResult).to.have.length(1)
		expect(hookResult![0]).to.have.property('name', engine)
	})
})

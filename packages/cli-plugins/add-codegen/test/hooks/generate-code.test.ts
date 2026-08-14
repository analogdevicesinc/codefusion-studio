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
import type {Hook} from '@oclif/core'

describe('hooks', () => {
	const config = {root: process.cwd()}
	const engine = 'example-code-generation-engine'
	const configdata = {Soc: 'SOC'}
	const soc = {Name: 'SOC'}

	it('should ignore generate-code for other engine', async () => {
		const {result} = await runHook<Hook.Result<string>>('generate-code', {engine: 'msdk', configdata, soc}, config)
		const hookResult = result?.successes[0]?.result
		expect(hookResult).to.be.undefined
	})

	it('should respond to generate-code with 2 generated files', async () => {
		const {result} = await runHook<Hook.Result<string>>('generate-code', {engine, configdata, soc}, config)
		const hookResult = result?.successes[0]?.result
		expect(hookResult).to.not.be.undefined
		expect(hookResult).to.have.keys('SOC_init.c', 'SOC_init.h')
		const hookResultRecord = (hookResult ?? {}) as Record<string, string>
		expect(hookResultRecord['SOC_init.c']).to.have.length.gt(0)
		expect(hookResultRecord['SOC_init.h']).to.have.length.gt(0)
	})
})

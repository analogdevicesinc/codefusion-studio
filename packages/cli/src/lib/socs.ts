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
import {Config} from '@oclif/core'
import {SampleParser as JSONparser} from 'cfs-lib'
import {promises as fs} from 'node:fs'

import type {Soc} from '../types/soc.js'

// type for holding a map of SoC data model files
// key is soc name (lowercase), value is data model file
export type SocDataModels = Record<string, string>

/**
 * Collects and returns data model files from all registered plugins
 * @param {Config} config - oclif config
 * @returns Promise<SocDataModels>
 */
async function getAllDataModels(config: Config) {
	const dataModels: SocDataModels = {}
	const result = await config.runHook('get-data-models', {})
	for (const success of result.successes) {
		for (const [socName, socFile] of Object.entries(success.result as SocDataModels)) {
			dataModels[socName] = socFile
		}
	}

	return dataModels
}

/**
 * Returns a list of available SoC names
 * @param {Config} config - oclif config
 * @returns {Promise<string[]>} List of SoC names
 */
export async function getSocNames(config: Config) {
	const socs = await getAllDataModels(config)
	const socNames = Object.keys(socs)
	if (socNames.length === 0) {
		throw new Error(`No SoC data models found. Please reinstall this utility.`)
	}

	return socNames
}

/**
 * Returns the data model for a particular SoC
 * @param {Config} config - oclif config
 * @param {string} name - Name of SoC (case insensitive)
 * @returns {Promise<Soc>} A promise that resolves to SoC data
 */
export async function getSoc(config: Config, name: string) {
	const socs = await getAllDataModels(config)

	const fileName = socs[name]

	if (!fileName) {
		throw new Error(`SoC data model file not found for "${name}"`)
	}

	const json = await fs.readFile(fileName, 'utf8').catch((error) => {
		throw new Error(`SoC data model can not be read from ${fileName}\n${error.message}`)
	})

	try {
		// @TODO: Remove once another utility is imported from cfs-lib to assure we can install things from this library successfully
		const parser = new JSONparser()

		return parser.parse(json) as Soc
	} catch (error) {
		throw new Error(`SoC json can not be parsed from ${fileName}\n${(error as Error).message}`)
	}
}

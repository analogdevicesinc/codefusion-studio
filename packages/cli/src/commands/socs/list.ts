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
import { Command, Config, Flags } from '@oclif/core'

import { getSoc, getSocNames } from '../../lib/socs.js'
import { Soc } from '../../types/soc.js'

export default class List extends Command {
	static description = 'List available SoCs.'

	static flags = {
		format: Flags.string({
			char: 'f',
			default: 'text',
			summary: 'Set the data encoding format.',
			options: ['text', 'json'],
		}),
		verbose: Flags.boolean({
			char: 'v',
			summary: 'Include additional SoC details.',
		}),
	}

	fetchDetailedSocs = async (socs: string[], config: Config) => {
		const socPromises = socs.map(async (socName) =>
			getSoc(config, socName).then((soc) => ({
				[socName]: {
					Copyright: soc.Copyright,
					Version: soc.Version,
					Timestamp: soc.Timestamp,
					Name: soc.Name,
					Description: soc.Description,
					Schema: soc.Schema,
				},
			})),
		)

		const socDetailsArray = await Promise.all(socPromises)
		const detailedSocs: Record<string, Partial<Soc>> = Object.assign({}, ...socDetailsArray)

		return detailedSocs
	}

	async run() {
		const { flags } = await this.parse(List)
		const socNames = await getSocNames(this.config).catch((error: Error) => this.error(error.message))

		if (flags.verbose) {
			const socs = await this.fetchDetailedSocs(socNames, this.config)

			if (flags.format === 'json') {
				this.log(JSON.stringify(socs, null, 2))
			} else {
				for (const [socName, socDetail] of Object.entries(socs)) {
					this.log(socName)
					this.log(`Copyright: ${socDetail.Copyright}`)
					this.log(`Version: ${socDetail.Version}`)
					this.log(`Timestamp: ${socDetail.Timestamp}`)
					this.log(`Name: ${socDetail.Name}`)
					this.log(`Description: ${socDetail.Description}`)
					this.log(`Schema: ${socDetail.Schema}`)
					this.log('')
				}
			}
		} else {
			this.log(flags.format === 'json' ? JSON.stringify(socNames, null, 2) : socNames.join('\n'))
		}
	}
}

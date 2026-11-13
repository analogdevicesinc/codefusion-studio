/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import type {ControlCfg} from '@common/types/soc';
import {CONTROL_SCOPES} from '../constants/scopes';
import {validatePluginOptions} from './plugin-options-validation';

const scopeToken = (token: string) =>
	`${String.fromCharCode(36)}{${token}}`;
const dfgPhandlesScope = [
	scopeToken('ProjectId'),
	scopeToken('String: zephyr phandles'),
	'+'
].join(' ');

const scopedAliasControl: ControlCfg = {
	Id: 'ALIAS',
	Description: 'Alias',
	Type: 'text',
	Scope: dfgPhandlesScope,
	PluginOption: true
};

describe('plugin options validation', () => {
	it('includes configured bounds in numeric range errors', () => {
		const errors = validatePluginOptions({STREAM_PRIORITY: 4}, [
			{
				Id: 'STREAM_PRIORITY',
				Description: 'Stream Priority',
				Type: 'integer',
				MinimumValue: 0,
				MaximumValue: 3,
				PluginOption: true
			}
		]);

		expect(errors).to.deep.equal({
			STREAM_PRIORITY: 'Value exceeds the range 0 to 3'
		});
	});

	it('does not report a scope conflict for the current persisted config path', () => {
		const errors = validatePluginOptions(
			{ALIAS: 'fish'},
			[scopedAliasControl],
			{
				scopes: {
					'DFG-proj zephyr phandles': {
						fish: [
							{
								groupId: 'ASS',
								controlId: 'ALIAS',
								value: 'fish',
								controlScope: CONTROL_SCOPES.DFG,
								projectId: 'DFG-proj',
								coreId: 'CMxx',
								scope: dfgPhandlesScope,
								scopeKey: 'DFG-proj zephyr phandles',
								itemId: 'ASS[0]',
								configPath:
									'DFG.Streams.1.Endpoints.ASS.0.Config.ALIAS'
							}
						]
					}
				},
				controlScope: CONTROL_SCOPES.DFG,
				projectId: 'DFG-proj',
				itemId: 'ASS[0]',
				getConfigPath: controlId =>
					`DFG.Streams.1.Endpoints.ASS.0.Config.${controlId}`,
				formatConflictMessage: ({value, conflictingItems}) =>
					`Value "${value}" is already used by ${conflictingItems}.`
			}
		);

		expect(errors).to.deep.equal({});
	});

	it('reports scope conflicts for matching values from other config paths', () => {
		const errors = validatePluginOptions(
			{ALIAS: 'fish'},
			[scopedAliasControl],
			{
				scopes: {
					'DFG-proj zephyr phandles': {
						fish: [
							{
								groupId: 'BSS',
								controlId: 'ALIAS',
								value: 'fish',
								controlScope: CONTROL_SCOPES.DFG,
								projectId: 'DFG-proj',
								coreId: 'CMxx',
								scope: dfgPhandlesScope,
								scopeKey: 'DFG-proj zephyr phandles',
								itemId: 'BSS[0]',
								configPath:
									'DFG.Streams.1.Endpoints.BSS.0.Config.ALIAS'
							}
						]
					}
				},
				controlScope: CONTROL_SCOPES.DFG,
				projectId: 'DFG-proj',
				itemId: 'ASS[0]',
				getConfigPath: controlId =>
					`DFG.Streams.1.Endpoints.ASS.0.Config.${controlId}`,
				formatConflictMessage: ({value, conflictingItems}) =>
					`Value "${value}" is already used by ${conflictingItems}.`
			}
		);

		expect(errors).to.deep.equal({
			ALIAS: 'Value "fish" is already used by BSS[0].'
		});
	});
});

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

import {CONTROL_SCOPES} from '../constants/scopes';
import type {ScopeConflict} from '../state/slices/scopes/scopes.reducer';
import {getDfgScopeConflictItemIds} from './use-dfg-scope-conflicts';

const baseConflictEntry = {
	groupId: 'ASS',
	controlId: 'ALIAS',
	value: 'fish',
	controlScope: CONTROL_SCOPES.DFG,
	projectId: 'DFG-proj',
	coreId: 'CMxx',
	scope: 'DFG-proj zephyr phandles',
	scopeKey: 'DFG-proj zephyr phandles',
	itemId: 'ASS[0]',
	configPath: 'DFG.Streams.1.Endpoints.ASS.0.Config.ALIAS'
};

describe('DFG scope conflict helpers', () => {
	it('does not mark duplicated entries from the same config path as conflicts', () => {
		const itemIds = getDfgScopeConflictItemIds([
			{
				scopeKey: 'DFG-proj zephyr phandles',
				value: 'fish',
				entries: [baseConflictEntry, baseConflictEntry]
			}
		]);

		expect([...itemIds]).to.deep.equal([]);
	});

	it('does not mark the same DFG config path emitted for multiple projects as a conflict', () => {
		const itemIds = getDfgScopeConflictItemIds([
			{
				scopeKey: 'zephyr phandles',
				value: 'fish',
				entries: [
					baseConflictEntry,
					{
						...baseConflictEntry,
						projectId: 'DSS-HiFi5s'
					}
				]
			}
		]);

		expect([...itemIds]).to.deep.equal([]);
	});

	it('marks entries from different config paths as conflicts', () => {
		const itemIds = getDfgScopeConflictItemIds([
			{
				scopeKey: 'DFG-proj zephyr phandles',
				value: 'fish',
				entries: [
					baseConflictEntry,
					{
						...baseConflictEntry,
						groupId: 'BSS',
						itemId: 'BSS[0]',
						configPath: 'DFG.Streams.1.Endpoints.BSS.0.Config.ALIAS'
					}
				]
			}
		] satisfies ScopeConflict[]);

		expect([...itemIds]).to.deep.equal(['ASS[0]', 'BSS[0]']);
	});
});

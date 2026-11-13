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

import type {
	ScopeValueUsage,
	ScopesDictionary
} from '../state/slices/scopes/scopes.reducer';

export function createScopeDictionaryFromUsages(
	usages: ScopeValueUsage[]
): ScopesDictionary {
	return usages.reduce<ScopesDictionary>((acc, usage) => {
		acc[usage.scopeKey] ??= {};
		acc[usage.scopeKey][usage.value] ??= [];
		acc[usage.scopeKey][usage.value].push(usage);

		return acc;
	}, {});
}

export function createScopeConflictDictionary({
	scopeKey,
	value,
	controlScope,
	controlId,
	projectId,
	coreId,
	groupId,
	itemIds,
	scope = scopeKey
}: Readonly<{
	scopeKey: string;
	value: string;
	controlScope: string;
	controlId: string;
	projectId: string;
	coreId: string;
	groupId: string;
	itemIds: string[];
	scope?: string;
}>): ScopesDictionary {
	return {
		[scopeKey]: {
			[value]: itemIds.map<ScopeValueUsage>(itemId => ({
				groupId,
				controlId,
				value,
				controlScope,
				projectId,
				coreId,
				scope,
				scopeKey,
				itemId
			}))
		}
	};
}

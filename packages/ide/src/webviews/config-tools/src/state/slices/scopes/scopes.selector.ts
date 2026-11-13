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
import {createSelector} from '@reduxjs/toolkit';
import {useAppSelector} from '../../store';
import {type RootState} from '../../store';
import {type ScopeConflict} from './scopes.reducer';

export const selectScopes = (state: RootState) =>
	state.scopesReducer.scopes;

export function useScopes() {
	return useAppSelector(selectScopes);
}

export const selectScopeConflicts = createSelector(
	[selectScopes],
	scopes => {
		const conflicts: ScopeConflict[] = [];

		for (const [scopeKey, values] of Object.entries(scopes)) {
			for (const [value, entries] of Object.entries(values)) {
				if (entries.length > 1) {
					conflicts.push({
						scopeKey,
						value,
						entries
					});
				}
			}
		}

		return conflicts;
	}
);

export const selectScopeConflictsByControlScope = createSelector(
	[
		selectScopeConflicts,
		(_state: RootState, controlScope: string) => controlScope
	],
	(conflicts, controlScope) =>
		conflicts.filter(conflict =>
			conflict.entries.some(
				entry => entry.controlScope === controlScope
			)
		)
);

export const selectHasScopeConflictsByControlScope = createSelector(
	[selectScopeConflictsByControlScope],
	conflicts => conflicts.length > 0
);

export const selectHasScopeConflictForItem = createSelector(
	[
		(
			state: RootState,
			params: {
				controlScope: string;
				itemId: string;
				projectIds?: string[];
			}
		) =>
			selectScopeConflictsByControlScope(state, params.controlScope),
		(
			_state: RootState,
			params: {
				controlScope: string;
				itemId: string;
				projectIds?: string[];
			}
		) => params
	],
	(conflicts, params) => {
		const hasProjectFilter = Array.isArray(params.projectIds);

		if (hasProjectFilter && params.projectIds?.length === 0) {
			return false;
		}

		const projectIds = new Set(params.projectIds ?? []);

		return conflicts.some(conflict =>
			conflict.entries.some(entry => {
				const matchesItem = entry.itemId === params.itemId;
				const matchesProject =
					!hasProjectFilter || projectIds.has(entry.projectId);

				return matchesItem && matchesProject;
			})
		);
	}
);

export function useScopeConflictsByControlScope(
	controlScope: string
) {
	return useAppSelector(state =>
		selectScopeConflictsByControlScope(state, controlScope)
	);
}

export function useHasScopeConflictsByControlScope(
	controlScope: string
) {
	return useAppSelector(state =>
		selectHasScopeConflictsByControlScope(state, controlScope)
	);
}

export function useHasScopeConflictForItem(params: {
	controlScope: string;
	itemId: string;
	projectIds?: string[];
}) {
	return useAppSelector(state =>
		selectHasScopeConflictForItem(state, params)
	);
}

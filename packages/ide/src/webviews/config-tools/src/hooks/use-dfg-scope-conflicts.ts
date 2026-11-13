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
import {useMemo} from 'react';
import {CONTROL_SCOPES} from '../constants/scopes';
import {useScopeConflictsByControlScope} from '../state/slices/scopes/scopes.selector';
import type {DFGStreamUI} from '../state/slices/gaskets/gasket.reducer';
import type {ScopeConflict} from '../state/slices/scopes/scopes.reducer';

function isString(value: string | undefined): value is string {
	return value !== undefined;
}

function getEndpointItemId({
	Gasket,
	Index
}: Readonly<{Gasket?: string; Index?: number}>): string | undefined {
	if (!Gasket || Index === undefined) return undefined;

	return `${Gasket}[${Index}]`;
}

export function streamHasDfgScopeConflict(
	stream: DFGStreamUI,
	scopeConflictItemIds: ReadonlySet<string>
): boolean {
	const endpointItemIds = [
		getEndpointItemId(stream.Source),
		...stream.Destinations.map(getEndpointItemId)
	].filter(isString);

	return endpointItemIds.some(itemId =>
		scopeConflictItemIds.has(itemId)
	);
}

export function gasketHasDfgScopeConflict(
	gasketName: string,
	scopeConflictItemIds: ReadonlySet<string>
): boolean {
	return scopeConflictItemIds.has(gasketName);
}

function getScopeEntryIdentity({
	configPath,
	itemId,
	groupId,
	controlId,
	projectId
}: ScopeConflict['entries'][number]): string {
	if (configPath) {
		return [controlId, configPath].join(':');
	}

	return [projectId, controlId, `${groupId}:${itemId ?? ''}`].join(
		':'
	);
}

export function getDfgScopeConflictItemIds(
	conflicts: ScopeConflict[]
): ReadonlySet<string> {
	return new Set(
		conflicts.flatMap(conflict => {
			const uniqueEntryIds = new Set(
				conflict.entries.map(getScopeEntryIdentity)
			);

			if (uniqueEntryIds.size < 2) {
				return [];
			}

			return conflict.entries
				.map(entry => entry.itemId)
				.filter(isString);
		})
	);
}

export function useDfgScopeConflictItemIds(): ReadonlySet<string> {
	const conflicts = useScopeConflictsByControlScope(
		CONTROL_SCOPES.DFG
	);

	return useMemo(
		() => getDfgScopeConflictItemIds(conflicts),
		[conflicts]
	);
}

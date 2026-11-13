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

/**
 * Composes a plain-text option label for pickers (`SearchableSelect`/
 * `SearchableMultiSelect`) and other alias-aware display lists:
 * `"RawName (Alias)"` when an alias exists, else just the raw name. The raw
 * name always leads. Kept as a single string (rather than JSX) so those
 * components' built-in search still matches on the alias text.
 */
export function formatAliasedOptionLabel(
	name: string,
	alias?: string
): string {
	return alias ? `${name} (${alias})` : name;
}

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
 * A single row in a search results list. `sourceIndex` points back into the
 * screen's own unformatted match array, so selection handlers can resolve the
 * domain object without the shared panel knowing anything about it.
 */
export type FormattedSearchResultItem = {
	sourceIndex: number;
	key: string;
	displayName: string;
	subDisplayName?: string;
};

/**
 * One captioned group of results within a scope's list. `caption` is
 * omitted when there is nothing to distinguish the section from the rest
 * of the list (e.g. only one kind of match is present).
 */
export type FormattedSearchSection = {
	caption?: string;
	items: FormattedSearchResultItem[];
};

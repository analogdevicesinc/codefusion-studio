/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import type {DFGStream} from 'cfs-plugins-api';
import {useAppSelector} from '../../../state/store';

export function matchesStartOfWord(
	text: string,
	query: string
): boolean {
	if (!text || !query) return false;

	const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`\\b${escapedQuery}`, 'i');

	return regex.test(text);
}
/**
 * Custom hook to filter streams based on search query
 * @param streams - Array of streams to filter
 * @returns Filtered streams based on search query
 */
export function useFilteredStreams(
	streams: DFGStream[]
): DFGStream[] {
	const searchQuery: string = useAppSelector(
		state => state.gasketsReducer.searchQuery ?? ''
	);

	return useMemo(
		() =>
			streams.filter(
				stream =>
					searchQuery.length === 0 ||
					(searchQuery.length > 1 &&
						(matchesStartOfWord(stream.Description, searchQuery) ||
							matchesStartOfWord(stream.Group, searchQuery) ||
							matchesStartOfWord(stream.Source.Gasket, searchQuery) ||
							stream.Destinations.some(dest =>
								matchesStartOfWord(dest.Gasket, searchQuery)
							)))
			),
		[streams, searchQuery]
	);
}

/**
 * Custom hook to filter streams based on sources, destinations, groups, and search query
 * @param streams - Array of streams to filter
 * @returns Filtered streams based on all filter criteria
 */
export function useFilteredStreamsBySourcesAndDest(
	streams: DFGStream[]
): DFGStream[] {
	const filteredSources = useAppSelector(
		state => state.gasketsReducer.filteredSources ?? []
	);
	const filteredDestinations = useAppSelector(
		state => state.gasketsReducer.filteredDestinations ?? []
	);
	const filteredGroups = useAppSelector(
		state => state.gasketsReducer.filteredGroups ?? []
	);
	const searchQuery: string = useAppSelector(
		state => state.gasketsReducer.searchQuery ?? ''
	);

	return useMemo(
		() =>
			streams.filter(
				stream =>
					(filteredSources.length === 0 ||
						filteredSources.includes(stream.Source.Gasket)) &&
					(filteredDestinations.length === 0 ||
						stream.Destinations.some(dest =>
							filteredDestinations.includes(dest.Gasket)
						)) &&
					(filteredGroups.length === 0 ||
						filteredGroups.includes(stream.Group) ||
						(filteredGroups.includes('nogroup') &&
							stream.Group === '')) &&
					(searchQuery.length === 0 ||
						(searchQuery.length > 1 &&
							(matchesStartOfWord(stream.Description, searchQuery) ||
								matchesStartOfWord(stream.Group, searchQuery) ||
								matchesStartOfWord(
									stream.Source.Gasket,
									searchQuery
								) ||
								stream.Destinations.some(dest =>
									matchesStartOfWord(dest.Gasket, searchQuery)
								))))
			),
		[
			streams,
			filteredSources,
			filteredDestinations,
			filteredGroups,
			searchQuery
		]
	);
}

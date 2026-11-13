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

import {EV_LIST_WIDTH_PROPERTY} from '../constants/timeline';

import type {
	CfsEventEntry,
	CfsEventSourceIndexEntry,
	CfsEventsDocument,
	EventSourceTreeNode,
	SevEventSource,
	TimelineRow,
	TimestampList
} from '../../common/types/events';

export function sortAllTimestamps(
	eventSources: SevEventSource[]
): TimestampList {
	const flat: TimestampList = [];

	for (const event of eventSources) {
		for (const timestamp of event.timestamps) {
			flat.push({
				id: timestamp.id,
				alias: event.alias,
				evSourceName: event.name,
				value: timestamp.value,
				rawTicks: timestamp.rawTicks,
				description: timestamp.description
			});
		}
	}

	return flat.sort((a, b) => a.value - b.value);
}

export const mapEventSources = (
	document: CfsEventsDocument
): SevEventSource[] => {
	const eventSources = document.eventSources ?? {};

	// Using 1 as a default frequency because we do need frequency
	// in order to convert ticks to seconds. Ideally we would not need
	// this if we kept all the webview using ticks rather than seconds,
	// but this is a compromise from legacy code since initially we only supported
	// relative seconds units. This will likely be refactored at some point in the future
	// and this default value removed.
	// It is also possible that you are reading this after 2030 and the code is still there,
	// apologies for that, it is hard to give priority to something that's already working.
	const freq = document.tickFrequency || 1;

	const convertToSeconds = (ticks: number) => ticks / freq;

	return Object.keys(eventSources).map(
		(evSourceId: string, index: number) => ({
			id: `${evSourceId}-${index}`,
			name: evSourceId,
			alias: evSourceId,
			checked: Boolean(eventSources[evSourceId]),
			timestamps: eventSources[evSourceId].events.map(
				(event: CfsEventEntry, tIndex: number) => ({
					id: tIndex,
					evSourceName: evSourceId,
					value: convertToSeconds(event.ts),
					rawTicks: event.ts,
					description: event?.msg ?? ''
				})
			)
		})
	);
};

/**
 * Converts the event source index into the tree structure used by the UI.
 * Preserves the configured group hierarchy, omits unknown or duplicate event
 * sources, and appends any event sources not referenced by the index.
 */
export const normalizeEventSourceIndex = (
	eventSourceIndex: CfsEventSourceIndexEntry[] | undefined,
	eventSources: SevEventSource[]
): EventSourceTreeNode[] | undefined => {
	if (eventSourceIndex === undefined) return undefined;

	const eventSourceByName = new Map(
		eventSources.map(eventSource => [eventSource.name, eventSource])
	);
	const addedSourceNames = new Set<string>();

	/**
	 *
	 * @param entries The list of event source index entries to normalize.
	 * @param parentPath The path of indices leading to the current entries.
	 * @returns The normalized event source tree nodes.
	 */
	const normalizeEntries = (
		entries: CfsEventSourceIndexEntry[],
		parentPath: number[]
	): EventSourceTreeNode[] =>
		entries.flatMap((entry, index): EventSourceTreeNode[] => {
			const entryPath = [...parentPath, index];

			if (typeof entry === 'string') {
				const eventSource = eventSourceByName.get(entry);

				if (!eventSource || addedSourceNames.has(entry)) return [];

				addedSourceNames.add(entry);

				return [
					{
						type: 'leaf',
						id: eventSource.id,
						sourceName: eventSource.name
					}
				];
			}

			const children = normalizeEntries(entry.events, entryPath);
			const descendantSourceNames = children.flatMap(child =>
				child.type === 'leaf'
					? [child.sourceName]
					: child.descendantSourceNames
			);

			return [
				{
					type: 'group',
					id: `event-source-group:${entryPath.join('.')}`,
					name: entry.name,
					children,
					descendantSourceNames
				}
			];
		});

	const normalizedLayout = normalizeEntries(eventSourceIndex, []);

	for (const eventSource of eventSources) {
		if (addedSourceNames.has(eventSource.name)) continue;

		normalizedLayout.push({
			type: 'leaf',
			id: eventSource.id,
			sourceName: eventSource.name
		});
	}

	return normalizedLayout;
};

/**
 * Converts the UI event source tree into the eventSourceIndex structure used by `.cfsevents` files
 */
export const serializeEventSourceIndex = (
	eventSourceTree: EventSourceTreeNode[]
): CfsEventSourceIndexEntry[] =>
	eventSourceTree.map(node => {
		if (node.type === 'leaf') {
			return node.sourceName;
		}

		return {
			name: node.name,
			events: serializeEventSourceIndex(node.children)
		};
	});

/**
 * Returns whether a visible timeline row currently owns an ECharts instance.
 */
export const isTimelineChartRow = (row: TimelineRow): boolean =>
	row.type === 'leaf' || !row.isExpanded;

// The purpose of this is to persist the width to be consumed in different components
// for example, in the footer to apply padding-left equal to the list width, and in the diagram to calculate the remaining width for the charts
export const setListWidthProperty = (
	host: HTMLElement,
	width: number
) => {
	if (!host) return;

	host.style.setProperty(EV_LIST_WIDTH_PROPERTY, `${width}px`);
};

/**
 * Maps each event source node to the row that anchors it in the current view.
 * Nodes hidden by a collapsed group are mapped to that group's ID; visible nodes are mapped to themselves.
 *
 * @param eventSourceTree Event source tree to inspect.
 * @param expandedGroupIds IDs of expanded groups.
 * @returns A read-only map from every node ID to its visible anchor row ID.
 */
export const getVisibleAnchorRowIds = (
	eventSourceTree: EventSourceTreeNode[],
	expandedGroupIds: Record<string, true>
): ReadonlyMap<string, string> => {
	const visibleAnchorRowIds = new Map<string, string>();

	const mapNodes = (
		nodes: EventSourceTreeNode[],
		hiddenByGroupId?: string
	) => {
		for (const node of nodes) {
			visibleAnchorRowIds.set(node.id, hiddenByGroupId ?? node.id);

			if (node.type === 'leaf') continue;

			const childHiddenByGroupId =
				hiddenByGroupId ??
				(expandedGroupIds[node.id] ? undefined : node.id);

			mapNodes(node.children, childHiddenByGroupId);
		}
	};

	mapNodes(eventSourceTree);

	return visibleAnchorRowIds;
};

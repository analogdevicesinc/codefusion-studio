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
	FormattedSearchResultItem,
	FormattedSearchSection
} from '../../../../../components/search-results-panel/types';
import type {
	SruDescriptionMatch,
	SruGroupScopeMatch,
	SruSignalMatch
} from '../../../../../utils/sru-search';

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

const sortByDisplayName = <T extends {displayName: string}>(
	items: readonly T[]
): T[] =>
	[...items].sort((a, b) =>
		collator.compare(a.displayName, b.displayName)
	);

/**
 * Builds the final captioned sections from a fixed, ordered list of
 * buckets, omitting empty buckets. A caption is only kept when 2 or more
 * buckets are non-empty — with nothing else to distinguish it from, a lone
 * kind renders exactly as an uncaptioned list would.
 */
function sectionsFromBuckets(
	buckets: ReadonlyArray<{
		caption: string;
		items: FormattedSearchResultItem[];
	}>
): FormattedSearchSection[] {
	const showCaptions =
		buckets.filter(bucket => bucket.items.length > 0).length > 1;

	return buckets
		.filter(bucket => bucket.items.length > 0)
		.map(bucket => ({
			caption: showCaptions ? bucket.caption : undefined,
			items: bucket.items
		}));
}

/**
 * Splits group-scope matches into the individual peripheral/pin-buffer
 * matches (`kind: 'signalGroup'`) and the navigation-group matches
 * (`kind: 'navigationGroup'`), each independently sorted. The two kinds are
 * no longer mutually exclusive: a matching navigation group and its
 * matching children are both surfaced, with individual matches listed
 * first since users are more likely to search for peripheral names than
 * group names.
 *
 * Individual matches display the signal group's full `name` rather than its
 * side-panel `label`: the pin-buffer `label` is peripheral-relative and
 * repeats across peripherals (e.g. both `DAI0` and `DAI1` have a `PB01`),
 * whereas the `name` carries the owning peripheral as a prefix
 * (`DAI0_PB01`) and so stands on its own outside the navigation tree.
 */
function splitGroupScopeResults(
	results: SruGroupScopeMatch[],
	options: {
		individualKeySuffix: string;
		itemsCaption: string;
		groupsCaption: string;
	}
): FormattedSearchSection[] {
	const individualItems: FormattedSearchResultItem[] = [];
	const groupItems: FormattedSearchResultItem[] = [];

	results.forEach((match, index) => {
		if (match.kind === 'navigationGroup') {
			groupItems.push({
				sourceIndex: index,
				key: `${match.sectionKind}-${match.group}-group`,
				displayName: match.group
			});
		} else {
			individualItems.push({
				sourceIndex: index,
				key: `${match.signalGroup.key}-${options.individualKeySuffix}`,
				displayName: match.signalGroup.name
			});
		}
	});

	return sectionsFromBuckets([
		{
			caption: options.itemsCaption,
			items: sortByDisplayName(individualItems)
		},
		{
			caption: options.groupsCaption,
			items: sortByDisplayName(groupItems)
		}
	]);
}

export function formatPinBufferResults(
	results: SruGroupScopeMatch[],
	captions: {pinBuffers: string; groups: string}
): FormattedSearchSection[] {
	return splitGroupScopeResults(results, {
		individualKeySuffix: 'pin-buffer',
		itemsCaption: captions.pinBuffers,
		groupsCaption: captions.groups
	});
}

export function formatPeripheralResults(
	results: SruGroupScopeMatch[],
	captions: {peripherals: string; groups: string}
): FormattedSearchSection[] {
	return splitGroupScopeResults(results, {
		individualKeySuffix: 'peripheral',
		itemsCaption: captions.peripherals,
		groupsCaption: captions.groups
	});
}

export function formatSignalResults(
	results: SruSignalMatch[]
): FormattedSearchSection[] {
	const nameOccurrences = new Map<string, number>();

	for (const match of results) {
		nameOccurrences.set(
			match.signal.Name,
			(nameOccurrences.get(match.signal.Name) ?? 0) + 1
		);
	}

	const items = sortByDisplayName(
		results.map((match, index) => {
			const collides =
				(nameOccurrences.get(match.signal.Name) ?? 0) > 1;

			return {
				sourceIndex: index,
				key: `${match.signalGroup.key}-${match.signal.Name}-signal`,
				displayName: collides
					? `${match.signalGroup.peripheralName} / ${match.signal.Name}`
					: match.signal.Name,
				subDisplayName: match.signalAlias
			};
		})
	);

	return items.length > 0 ? [{items}] : [];
}

/**
 * Formats Descriptions-scope results into three independently sorted,
 * conditionally captioned sections, in a fixed connection/signal/peripheral
 * order: connection matches show the user-authored comment with its
 * "output → input" pair as context; signal matches show the SoC model's
 * per-signal description with the signal's short name as context;
 * peripheral matches show the shared peripheral description with the
 * signal group as context.
 */
export function formatDescriptionResults(
	results: SruDescriptionMatch[],
	captions: {connection: string; signal: string; peripheral: string}
): FormattedSearchSection[] {
	const connectionItems: FormattedSearchResultItem[] = [];
	const signalItems: FormattedSearchResultItem[] = [];
	const peripheralItems: FormattedSearchResultItem[] = [];

	results.forEach((match, index) => {
		if (match.kind === 'connection') {
			connectionItems.push({
				sourceIndex: index,
				key: `${match.signalGroup.key}-${match.input.Name}-connection-description`,
				displayName: match.description,
				subDisplayName: `${match.output} → ${match.input.Name}`
			});
		} else if (match.kind === 'signal') {
			signalItems.push({
				sourceIndex: index,
				key: `${match.signalGroup.key}-${match.signal.Name}-signal-description`,
				displayName: match.signal.Description,
				subDisplayName: match.signal.Name
			});
		} else {
			peripheralItems.push({
				sourceIndex: index,
				key: `${match.signalGroup.key}-peripheral-description`,
				displayName: match.signalGroup.description,
				subDisplayName: match.signalGroup.name
			});
		}
	});

	return sectionsFromBuckets([
		{
			caption: captions.connection,
			items: sortByDisplayName(connectionItems)
		},
		{caption: captions.signal, items: sortByDisplayName(signalItems)},
		{
			caption: captions.peripheral,
			items: sortByDisplayName(peripheralItems)
		}
	]);
}

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

import {useEffect, useState} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
import type {RequestType} from 'vscode-messenger-common';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import {getPackageDependenciesBatchRequest} from '@constants/messages/package-manager-messages';
import {buildPackageReference} from '../../state/slices/packages/packages.reducer';

const getDependenciesBatchReq =
	getPackageDependenciesBatchRequest as RequestType<
		{references: CfsPackageReference[]},
		Record<string, CfsPackageReference[]>
	>;

/**
 * A selected package together with its resolved dependency closure (direct
 * and transitive), as returned by the package manager's `dependencies()`.
 */
export type DependencyGroup = {
	readonly reference: CfsPackageReference;
	readonly dependencies: CfsPackageReference[];
	/** True while this package's dependencies are still being resolved. */
	readonly loading: boolean;
};

type GroupState = {
	dependencies: CfsPackageReference[];
	loading: boolean;
};

/**
 * Builds the globally-unique identity for a single dependency card. The parent
 * reference disambiguates the same dependency shared across two packages; the
 * index disambiguates a dependency that legitimately appears twice under one
 * parent (index is safe here because the dependency list is fetched once and
 * never reordered).
 */
export function buildDependencyCardKey(
	parent: CfsPackageReference,
	dependency: CfsPackageReference,
	index: number
): string {
	return `${buildPackageReference(
		parent.name,
		parent.version
	)}::${buildPackageReference(
		dependency.name,
		dependency.version
	)}-${index}`;
}

/**
 * Builds the group map for `references`, taking each package's closure from
 * `resolve`. Shared by the loading, resolved, and failed paths so the three
 * always agree on the key format and on covering every requested package.
 */
function buildGroups(
	references: CfsPackageReference[],
	loading: boolean,
	resolve: (reference: CfsPackageReference) => CfsPackageReference[]
): Record<string, GroupState> {
	const groups: Record<string, GroupState> = {};

	references.forEach(reference => {
		groups[buildPackageReference(reference.name, reference.version)] =
			{
				dependencies: resolve(reference),
				loading
			};
	});

	return groups;
}

/**
 * Resolves the dependency closure (direct and transitive) of every selected
 * package in a single batched request, so the whole set costs one backend
 * invocation rather than one per package. Every group therefore clears at the
 * same moment rather than progressively — the tradeoff for the batch being far
 * faster overall. Lifting this to the review header (instead of fetching inside
 * each group) lets the header own the full set of dependency cards and
 * therefore drive the bulk expand/collapse actions.
 *
 * Pass a referentially stable array, else the fetch refires every render.
 */
export function useDependencyGroups(
	references: CfsPackageReference[]
): DependencyGroup[] {
	const messenger = useMessenger();
	const [groupsByRef, setGroupsByRef] = useState<
		Record<string, GroupState>
	>({});

	useEffect(() => {
		let cancelled = false;

		// Mark every requested package as loading up front so groups added by a
		// selection change immediately show their spinner.
		setGroupsByRef(buildGroups(references, true, () => []));

		// One request for every package: the backend resolves them as roots of a
		// single dependency graph, so this costs one backend invocation instead
		// of one per package. Every group therefore clears together rather than
		// one at a time.
		if (references.length > 0) {
			messenger
				.sendRequest(
					getDependenciesBatchReq,
					{type: 'extension'},
					{references}
				)
				.then(result => {
					if (cancelled) {
						return;
					}

					setGroupsByRef(
						buildGroups(references, false, reference =>
							// Filter out the package itself if present.
							(
								result[
									buildPackageReference(
										reference.name,
										reference.version
									)
								] ?? []
							).filter(
								dep =>
									!(
										dep.name === reference.name &&
										dep.version === reference.version
									)
							)
						)
					);
				})
				.catch(() => {
					if (cancelled) {
						return;
					}

					// The batch resolves as a unit, so a failure leaves no group
					// resolved. Clear every spinner rather than leaving the review
					// step stuck.
					setGroupsByRef(buildGroups(references, false, () => []));
				});
		}

		return () => {
			cancelled = true;
		};
	}, [messenger, references]);

	return references.map(reference => {
		const state =
			groupsByRef[
				buildPackageReference(reference.name, reference.version)
			];

		return {
			reference,
			dependencies: state?.dependencies ?? [],
			loading: state?.loading ?? true
		};
	});
}

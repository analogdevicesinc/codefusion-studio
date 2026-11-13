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

import {useEffect, useMemo} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
import {useAppDispatch} from '../../state/store';
import {
	buildPackageReference,
	buildSelectionKey,
	fetchDependencyResolution
} from '../../state/slices/packages/packages.reducer';
import {useDependencyResolution} from '../../state/slices/packages/packages.selector';

/**
 * A selected package together with its resolved dependency closure (direct
 * and transitive).
 */
export type DependencyGroup = {
	readonly reference: CfsPackageReference;
	readonly dependencies: CfsPackageReference[];
	/** True while this package's dependencies are still being resolved. */
	readonly loading: boolean;
};

export type DependencyGroups = {
	readonly groups: DependencyGroup[];
	/**
	 * The selected packages that pull in the disputed dependency, which are
	 * the ones the user can change. Empty unless the failure was a version
	 * conflict.
	 */
	readonly culprits: CfsPackageReference[];
	/**
	 * The dependency the selection disagrees about. Every card for it is in
	 * conflict wherever it appears; packages merely requiring it are not.
	 */
	readonly conflictingPackage: string | undefined;
	/**
	 * Message from the failed resolution, or undefined when it succeeded. Set
	 * means the groups are empty because nothing resolved, not because the
	 * packages have no dependencies.
	 */
	readonly failure?: string;
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
 * Groups the shared dependency resolution by selected package, for the review
 * page's per-package cards. The resolution lives in the store because the
 * licence page needs the same answer; dispatching twice is free.
 *
 * Pass a referentially stable array, else the dispatch refires every render.
 */
export function useDependencyGroups(
	references: CfsPackageReference[]
): DependencyGroups {
	const dispatch = useAppDispatch();
	const resolution = useDependencyResolution();
	const key = useMemo(
		() => buildSelectionKey(references),
		[references]
	);

	useEffect(() => {
		void dispatch(fetchDependencyResolution(references));
	}, [dispatch, references]);

	// A resolution belonging to a different selection is not ours yet. Treating
	// that as loading avoids flashing an empty list on the render before the
	// fetch is dispatched, and again whenever the selection changes.
	const isCurrent = resolution.key === key;
	const loading = !isCurrent || resolution.loading;

	const groups = useMemo(
		() =>
			references.map(reference => ({
				reference,
				// Drop the package itself, which the backend may echo back as
				// part of its own closure.
				dependencies: (
					resolution.byRef[
						buildPackageReference(reference.name, reference.version)
					] ?? []
				).filter(
					dependency =>
						!(
							dependency.name === reference.name &&
							dependency.version === reference.version
						)
				),
				loading
			})),
		[references, resolution, loading]
	);

	const conflictingPackage = isCurrent
		? resolution.conflict?.packageName
		: undefined;

	// Conan reports which requirements clashed, but not which of the user's
	// selections led to them: a transitive requirement is attributed to the
	// graph root, not to the package that declared it. The per-package closures
	// the sequential fallback already fetched answer it directly, so the
	// selection is matched here rather than inferred from the conflict.
	const culprits = useMemo(() => {
		if (conflictingPackage === undefined) {
			return [];
		}

		const selected = groups
			.filter(
				group =>
					group.reference.name === conflictingPackage ||
					group.dependencies.some(
						dependency => dependency.name === conflictingPackage
					)
			)
			.map(group => group.reference);

		// The closures are missing when the sequential fallback failed too.
		// Conan's own view of the conflict is all that is left to show.
		return selected.length > 0
			? selected
			: (resolution.conflict?.conflictingRequirements ?? []);
	}, [groups, conflictingPackage, resolution]);

	return {
		groups,
		culprits: isCurrent ? culprits : [],
		conflictingPackage,
		failure: isCurrent ? resolution.failure : undefined
	};
}

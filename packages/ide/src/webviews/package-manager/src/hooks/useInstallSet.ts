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

import {useEffect, useMemo, useState} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
import type {RequestType} from 'vscode-messenger-common';
import {useMessenger} from '../../../common/contexts/MessengerContext';
import {getPackageDependenciesBatchRequest} from '@constants/messages/package-manager-messages';
import {buildPackageReference} from '../state/slices/packages/packages.reducer';

// Type-assert to resolve ESLint inference issues with newly-added exports.
const getDependenciesBatchReq =
	getPackageDependenciesBatchRequest as RequestType<
		{references: CfsPackageReference[]},
		Record<string, CfsPackageReference[]>
	>;

export type InstallSet = {
	/** The requested packages plus every transitive dependency that will be installed alongside them, deduped. */
	packages: CfsPackageReference[];
	loading: boolean;
	/**
	 * True when dependency resolution failed for one or more requested
	 * packages. The install set is then incomplete — callers must block
	 * installation rather than risk silently accepting licenses for
	 * dependencies the user never got to review.
	 */
	error: boolean;
};

/**
 * Resolves the full set of packages that will actually be installed (and whose
 * license will therefore be accepted) for a given set of explicitly requested
 * packages. The backend install call auto-resolves and installs dependencies
 * alongside the requested packages, so this must be included in the set
 * presented for license review to avoid silently accepting licenses the user
 * never saw.
 *
 * Pass a referentially stable array, else the dependency fetch refires every render.
 */
export function useInstallSet(
	requestedPackages: CfsPackageReference[]
): InstallSet {
	const messenger = useMessenger();

	const [dependenciesByRef, setDependenciesByRef] = useState<
		Record<string, CfsPackageReference[]>
	>({});
	const [loading, setLoading] = useState(
		requestedPackages.length > 0
	);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;

		setLoading(requestedPackages.length > 0);
		setError(false);

		// One request for every package: the backend resolves them as roots of a
		// single dependency graph, so this costs one backend invocation instead
		// of one per package. It also resolves as a unit — any failure fails the
		// whole batch rather than being silently treated as "no dependencies",
		// which is what the install set requires.
		if (requestedPackages.length === 0) {
			setDependenciesByRef({});
		} else {
			messenger
				.sendRequest(
					getDependenciesBatchReq,
					{type: 'extension'},
					{references: requestedPackages}
				)
				.then(result => {
					if (cancelled) return;

					// Already keyed by `name/version` of each requested package.
					setDependenciesByRef(result);
				})
				.catch(() => {
					if (cancelled) return;

					// The install set can no longer be trusted, so drop any
					// previously-resolved dependencies rather than under-report.
					setDependenciesByRef({});
					setError(true);
				})
				.finally(() => {
					if (!cancelled) {
						setLoading(false);
					}
				});
		}

		return () => {
			cancelled = true;
		};
	}, [messenger, requestedPackages]);

	const packages = useMemo(() => {
		const seen = new Set<string>();
		const result: CfsPackageReference[] = [];

		const add = (pkg: CfsPackageReference) => {
			const ref = buildPackageReference(pkg.name, pkg.version);

			if (!seen.has(ref)) {
				seen.add(ref);
				result.push(pkg);
			}
		};

		requestedPackages.forEach(add);
		Object.values(dependenciesByRef).forEach(deps => {
			deps.forEach(add);
		});

		return result;
	}, [requestedPackages, dependenciesByRef]);

	return {packages, loading, error};
}

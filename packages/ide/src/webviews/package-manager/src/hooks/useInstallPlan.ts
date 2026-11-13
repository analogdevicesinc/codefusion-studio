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
import type {
	CfsInstallPlan,
	CfsPackageReference
} from 'cfs-package-manager';
import type {RequestType} from 'vscode-messenger-common';
import {useMessenger} from '../../../common/contexts/MessengerContext';
import {getInstallPlanRequest} from '@constants/messages/package-manager-messages';

// Type-assert to resolve ESLint inference issues with newly-added exports.
const getInstallPlanReq = getInstallPlanRequest as RequestType<
	{input: CfsPackageReference[]},
	CfsInstallPlan
>;

export type InstallPlanResult = {
	/** The install plan containing packages to install and license requirements. */
	plan: CfsInstallPlan | null;
	loading: boolean;
	/**
	 * True when fetching the install plan failed. The plan is then incomplete
	 * — callers must block installation rather than risk proceeding without
	 * complete license information.
	 */
	error: boolean;
};

/**
 * Fetches the installation plan for a given set of explicitly requested
 * packages. The plan includes which packages require license acceptance
 * (those with licenses not already cached/accepted), matching CLI behavior.
 *
 * Pass a referentially stable array, else the fetch refires every render.
 */
export function useInstallPlan(
	requestedPackages: CfsPackageReference[]
): InstallPlanResult {
	const messenger = useMessenger();

	const [plan, setPlan] = useState<CfsInstallPlan | null>(null);
	const [loading, setLoading] = useState(
		requestedPackages.length > 0
	);
	const [error, setError] = useState(false);
	const [lastFetchedPackages, setLastFetchedPackages] =
		useState<string>('');

	useEffect(() => {
		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		// Create a stable key for the requested packages to prevent unnecessary refetches
		const packagesKey = requestedPackages
			.map(pkg => `${pkg.name}@${pkg.version}`)
			.sort()
			.join(',');

		// Skip fetch if we already have a plan for these exact packages
		if (packagesKey === lastFetchedPackages && plan && !error) {
			return;
		}

		setLoading(requestedPackages.length > 0);
		setError(false);

		if (requestedPackages.length === 0) {
			setPlan(null);
			setLastFetchedPackages('');
		} else {
			// Clear any stale plan when starting a new fetch
			setPlan(null);

			// Set a 2-minute timeout for the request
			timeoutId = setTimeout(() => {
				if (!cancelled) {
					// Mark the request as timed out
					cancelled = true;
					setPlan(null);
					setError(true);
					setLoading(false);
				}
			}, 120000); // 2 minutes

			messenger
				.sendRequest(
					getInstallPlanReq,
					{type: 'extension'},
					{input: requestedPackages}
				)
				.then(result => {
					if (cancelled) return; // Ignore late responses after timeout
					if (timeoutId) clearTimeout(timeoutId);
					setPlan(result);
					setLastFetchedPackages(packagesKey);
				})
				.catch(() => {
					if (cancelled) return; // Ignore late errors after timeout
					if (timeoutId) clearTimeout(timeoutId);

					// The install plan cannot be trusted, so clear it rather
					// than show incomplete license information.
					setPlan(null);
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
			if (timeoutId) clearTimeout(timeoutId);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messenger, requestedPackages]);

	return {plan, loading, error};
}

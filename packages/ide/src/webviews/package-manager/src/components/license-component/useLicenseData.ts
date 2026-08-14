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
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	fetchLicenseDataRequest,
	type FetchLicenseDataResponse
} from '@constants/messages/package-manager-messages';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import {buildPackageReference} from '../../state/slices/packages/packages.reducer';

/** The license-data view contract shared by both hooks below. */
export type LicenseDataState = {
	licenseData?: FetchLicenseDataResponse;
	error?: string;
	loading: boolean;
};

/**
 * Lazily fetches one package's license (id + text) from the extension,
 * re-fetching whenever the reference changes. Used by the license preview page.
 */
export function useLicenseData(
	packageName: string,
	packageVersion: string
): LicenseDataState {
	const l10n = useLocaleContext()?.license;
	const messenger = useMessenger();

	const [licenseData, setLicenseData] =
		useState<FetchLicenseDataResponse>();
	const [error, setError] = useState<string>();
	const [loading, setLoading] = useState(true);

	// Extract as a constant to avoid having it in the dependency array.
	const fetchErrorMessage = String(
		l10n?.fetchError ?? 'Failed to load license data.'
	);

	useEffect(() => {
		let cancelled = false;

		setLoading(true);
		setError(undefined);
		setLicenseData(undefined);

		if (!packageName || !packageVersion) {
			setError(fetchErrorMessage);
			setLoading(false);

			return;
		}

		async function fetchData() {
			try {
				const response = await messenger.sendRequest(
					fetchLicenseDataRequest,
					{type: 'extension'},
					{name: packageName, version: packageVersion}
				);

				if (!cancelled) {
					setLicenseData(response);
				}
			} catch {
				if (!cancelled) {
					setError(fetchErrorMessage);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void fetchData();

		return () => {
			cancelled = true;
		};
	}, [messenger, packageName, packageVersion, fetchErrorMessage]);

	return {licenseData, error, loading};
}

/**
 * Prefetches all packages' licenses up front into a map, exposing a `getLicense`
 * accessor (same shape as {@link useLicenseData}). Used by the license accept step.
 *
 * Pass a referentially stable array, else the prefetch refires each render.
 */
export function useLicenseMap(packages: CfsPackageReference[]): {
	getLicense: (
		packageName: string,
		packageVersion: string
	) => LicenseDataState;
} {
	const l10n = useLocaleContext()?.license;
	const messenger = useMessenger();

	const [entries, setEntries] = useState<
		Record<string, LicenseDataState>
	>({});

	// Extract as a constant to avoid having it in the dependency array.
	const fetchErrorMessage = String(
		l10n?.fetchError ?? 'Failed to load license data.'
	);

	useEffect(() => {
		let cancelled = false;

		// Initialize with loading.
		setEntries(
			Object.fromEntries(
				packages.map(pkg => [
					buildPackageReference(pkg.name, pkg.version),
					{loading: true}
				])
			)
		);

		packages.forEach(pkg => {
			const ref = buildPackageReference(pkg.name, pkg.version);

			messenger
				.sendRequest(
					fetchLicenseDataRequest,
					{type: 'extension'},
					{name: pkg.name, version: pkg.version}
				)
				.then(response => {
					if (!cancelled) {
						setEntries(prev => ({
							...prev,
							[ref]: {licenseData: response, loading: false}
						}));
					}
				})
				.catch(() => {
					if (!cancelled) {
						setEntries(prev => ({
							...prev,
							[ref]: {error: fetchErrorMessage, loading: false}
						}));
					}
				});
		});

		return () => {
			cancelled = true;
		};
	}, [messenger, packages, fetchErrorMessage]);

	return {
		getLicense: (packageName, packageVersion) =>
			entries[buildPackageReference(packageName, packageVersion)] ?? {
				loading: true
			}
	};
}

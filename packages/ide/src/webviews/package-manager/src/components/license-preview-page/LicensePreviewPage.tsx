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

import styles from './license-preview-page.module.scss';
import LicenseComponent from '../license-component/LicenseComponent';
import {useLicenseData} from '../license-component/useLicenseData';
import {useLocaleContext} from '@common/contexts/LocaleContext';

export type LicensePreviewPageProps = {
	readonly packageName: string;
	readonly packageVersion: string;
	readonly licenseName: string;
};

export default function LicensePreviewPage({
	packageName,
	packageVersion,
	licenseName
}: LicensePreviewPageProps) {
	const l10n: {
		license: string;
		fetchError: string;
		reviewLicensesTitle: string;
		fallbackLicenseText: string;
	} = useLocaleContext()?.license;

	const {licenseData, error, loading} = useLicenseData(
		packageName,
		packageVersion
	);

	if (error) {
		return (
			<div className={styles.container}>
				<div className={styles.loadingContainer}>
					<span className={styles.errorText}>{error}</span>
				</div>
			</div>
		);
	}

	const target = `${packageName} ${packageVersion}`;
	const resolvedLicenseName = licenseData?.licenseId ?? licenseName;

	return (
		<div className={styles.container}>
			<div className={styles.main}>
				<div className={styles.mainContainer}>
					<LicenseComponent
						title={l10n?.reviewLicensesTitle ?? ''}
						name={resolvedLicenseName}
						target={target}
						isLoading={loading}
						licenseContent={
							licenseData?.licenseText ??
							l10n?.fallbackLicenseText?.replace(
								'{license}',
								resolvedLicenseName
							) ??
							`This package uses the ${resolvedLicenseName} license.`
						}
					/>
				</div>
			</div>
		</div>
	);
}

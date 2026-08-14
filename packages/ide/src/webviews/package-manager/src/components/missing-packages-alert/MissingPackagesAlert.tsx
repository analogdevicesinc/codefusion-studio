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

import {WarningIcon} from 'cfs-react-library';
import styles from './missing-packages-alert.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	useMissingRequiredPackages,
	usePackageListLoading,
	usePackagesError
} from '../../state/slices/packages/packages.selector';

/**
 * Alert listing required packages the user has no access to. Intended to be
 * placed inside the sticky header wrapper in MainPackageContainer.
 */
export default function MissingPackagesAlert() {
	const l10n = useLocaleContext()?.packageList;
	const missingRequiredPackages = useMissingRequiredPackages();
	const loading = usePackageListLoading();
	const error = usePackagesError();

	if (
		loading ||
		error !== undefined ||
		missingRequiredPackages.length === 0
	) {
		return null;
	}

	return (
		<div className={styles.warningContainer}>
			<WarningIcon />
			<span className={styles.warningText}>
				{l10n?.missingAccess}
				<br />
				<br />
				{missingRequiredPackages
					.map(pkg => `${pkg.name}/[${pkg.versions.join(', ')}]`)
					.join(', ')}
				<br />
			</span>
		</div>
	);
}

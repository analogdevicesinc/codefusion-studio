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

import {Button, EmptyState} from 'cfs-react-library';
import styles from '../../application-package-summary/application-package-summary.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {useAddApplicationPackage} from '../../../../hooks/use-application-package-actions';

function EmptyApplicationPackages() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.[
			'empty-content'
		];
	const handleAddPackage = useAddApplicationPackage();

	return (
		<div
			className={styles.noApplicationPackages}
			data-test='app-pack-summary:empty-application-packages'
		>
			<EmptyState title={l10n?.title} description={l10n?.description}>
				<div slot='footer'>
					<Button
						appearance='primary'
						dataTest='empty-app-pack:submit'
						onClick={handleAddPackage}
					>
						{l10n?.addButton}
					</Button>
				</div>
			</EmptyState>
		</div>
	);
}

export default EmptyApplicationPackages;

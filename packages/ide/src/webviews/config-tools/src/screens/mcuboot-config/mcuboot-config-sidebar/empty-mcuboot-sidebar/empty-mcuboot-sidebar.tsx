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

import {EmptyState} from 'cfs-react-library';
import styles from '../mcuboot-config-sidebar.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';

function EmptyMCUBootSidebar() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.[
			'empty-sidebar'
		];

	return (
		<div
			className={styles.emptySidebarContainer}
			data-test='mcuboot-config:empty-sidebar'
		>
			<EmptyState
				title={l10n?.title}
				description={l10n?.description}
				hasBorder={false}
			/>
		</div>
	);
}

export default EmptyMCUBootSidebar;

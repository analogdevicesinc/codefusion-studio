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

import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './package-manager-tabs.module.scss';

export type PackageManagerView = 'packages' | 'remotes';

type PackageManagerTabsProps = {
	readonly activeView: PackageManagerView;
	readonly onChange: (view: PackageManagerView) => void;
};

const VIEWS: PackageManagerView[] = ['packages', 'remotes'];

export default function PackageManagerTabs({
	activeView,
	onChange
}: PackageManagerTabsProps) {
	const l10n = useLocaleContext()?.header?.tabs;

	return (
		<div
			className={styles.tabs}
			data-test='package-manager:view-tabs'
		>
			{VIEWS.map(view => (
				<button
					key={view}
					type='button'
					aria-pressed={activeView === view}
					className={`${styles.tab} ${activeView === view ? styles.active : ''}`}
					data-test={`package-manager:view-tabs:${view}`}
					onClick={() => {
						onChange(view);
					}}
				>
					{l10n?.[view]}
				</button>
			))}
		</div>
	);
}

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

import Help from '@common/icons/Help';
import styles from './NavigationBar.module.scss';

export type NavigationTab<TKey extends string = string> = {
	readonly key: TKey;
	readonly label: string;
};

type NavigationBarProps<TKey extends string> = {
	readonly tabs: Array<NavigationTab<TKey>>;
	/**
	 * Key of the selected tab. Typing the keys as a union makes a mismatch a
	 * compile error; an unmatched key otherwise falls back to the first tab
	 */
	readonly activeTab: NoInfer<TKey>;
	readonly onSelectTab: (key: NoInfer<TKey>) => void;
	readonly tabsAriaLabel?: string;
	readonly helpAriaLabel?: string;
	/** Called when the Help button is clicked */
	readonly onHelpClick?: () => void;
	/** Base string for data-test attributes, useful for testing */
	readonly dataTest?: string;
	/** Id of the tabpanel these tabs control. Sets aria-controls on every tab */
	readonly tabPanelId?: string;
};

export default function NavigationBar<TKey extends string>({
	tabs,
	activeTab,
	onSelectTab,
	tabsAriaLabel = 'Section tabs',
	helpAriaLabel = 'Help',
	onHelpClick,
	dataTest = 'navigation-bar',
	tabPanelId
}: NavigationBarProps<TKey>) {
	const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
	// Fall back to the first tab when activeTab matches no key, so selection
	// and styling stay on the same tab. Selecting none instead would leave
	// the tablist in a state assistive technology treats as invalid.
	const selectedIndex = activeIndex === -1 ? 0 : activeIndex;

	return (
		<div className={styles.navigationBar} data-test={dataTest}>
			{/* Empty spacer mirroring the right-hand slot's width, so the tabs stay centred as in the Figma design */}
			<div className={styles.side} />
			<div className={styles.center}>
				<div
					className={styles.tabs}
					role='tablist'
					aria-label={tabsAriaLabel}
				>
					{tabs.map((tab, index) => (
						<button
							key={tab.key}
							type='button'
							role='tab'
							aria-selected={index === selectedIndex}
							aria-controls={tabPanelId}
							className={`${styles.tab} ${index === selectedIndex ? styles.active : ''}`}
							data-test={`${dataTest}:tab-${tab.key}`}
							onClick={() => {
								onSelectTab(tab.key);
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>
			<div className={`${styles.side} ${styles.right}`}>
				<button
					type='button'
					className={styles.helpButton}
					aria-label={helpAriaLabel}
					data-test={`${dataTest}:help`}
					onClick={onHelpClick}
				>
					<Help />
				</button>
			</div>
		</div>
	);
}

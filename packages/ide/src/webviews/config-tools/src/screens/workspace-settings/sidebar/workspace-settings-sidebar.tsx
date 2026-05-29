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

import {useCallback, useEffect, useState} from 'react';
import Accordion from '@common/components/accordion/Accordion';
import styles from './workspace-settings-sidebar.module.scss';
import {
	setActiveSettingsChild,
	setActiveSettingsPage
} from '../../../state/slices/app-context/appContext.reducer';
import {useActiveSettingsChild} from '../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../state/store';
import useFilteredSettingsSections from '../../../hooks/use-filtered-settings-sections';
import {markProgrammaticScroll} from '../../../hooks/use-settings-section-observer';

function WorkspaceSettingsSidebar() {
	const dispatch = useAppDispatch();
	const activeChild = useActiveSettingsChild();
	const {filteredSections} = useFilteredSettingsSections();
	const [expandedSection, setExpandedSection] = useState(
		filteredSections[0]?.key ?? ''
	);

	const toggleExpand = useCallback(
		(sectionKey: string) => {
			const newSection =
				expandedSection === sectionKey ? '' : sectionKey;

			setExpandedSection(newSection);
			dispatch(setActiveSettingsPage(newSection));
		},
		[dispatch, expandedSection]
	);

	const handleChildClick = useCallback(
		(childKey: string) => {
			// Immediately highlight the clicked child
			dispatch(setActiveSettingsChild(childKey));

			const element = document.getElementById(childKey);

			if (!element) return;

			// Suppress section sync during programmatic scroll
			// so the smooth scroll animation does not override the
			// active child selection while it is running.
			markProgrammaticScroll();

			// Locate the scrollable ancestor (the layout's main panel,
			// which has overflow set via --cfs-layout-mainpanel-overflow).
			// We query getComputedStyle here not to discover the style
			// but to find the DOM element, since we don't have a direct
			// ref to it from this component.
			let scrollParent: HTMLElement | undefined =
				element.parentElement ?? undefined;

			while (scrollParent) {
				const {overflowY} = getComputedStyle(scrollParent);

				if (
					(overflowY === 'auto' || overflowY === 'scroll') &&
					scrollParent.scrollHeight > scrollParent.clientHeight
				) {
					break;
				}

				scrollParent = scrollParent.parentElement ?? undefined;
			}

			if (scrollParent) {
				const offset =
					element.getBoundingClientRect().top -
					scrollParent.getBoundingClientRect().top;

				scrollParent.scrollTo({
					top: scrollParent.scrollTop + offset,
					behavior: 'smooth'
				});
			}
		},
		[dispatch]
	);

	// Initialize Redux state with the first section on mount
	// to avoid mismatch with local state
	useEffect(() => {
		const initialKey = filteredSections[0]?.key ?? '';
		dispatch(setActiveSettingsPage(initialKey));
	}, [dispatch, filteredSections]);

	return (
		<div className={styles.sidebarContainer}>
			<div className={styles.accordionWrapper}>
				{filteredSections.map(setting => (
					<Accordion
						key={setting.key}
						disableBorderOnHover
						id={setting.key}
						title={setting.title}
						isOpen={expandedSection === setting.key}
						highlight={expandedSection === setting.key}
						toggleExpand={toggleExpand}
						body={
							<div className={styles.navItemsWrapper}>
								{setting.children.map(child => (
									<div
										key={child.key}
										className={`${styles.navItemContainer} ${
											activeChild === child.key ? styles.active : ''
										}`}
									>
										<div
											role='button'
											tabIndex={0}
											className={styles.navItem}
											onClick={() => {
												handleChildClick(child.key);
											}}
											onKeyDown={e => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													handleChildClick(child.key);
												}
											}}
										>
											{child.label}
										</div>
									</div>
								))}
							</div>
						}
					/>
				))}
			</div>
		</div>
	);
}

export default WorkspaceSettingsSidebar;

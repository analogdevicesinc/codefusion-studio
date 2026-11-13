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

import {type ComponentType, useRef} from 'react';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {SIDEBAR_SECTIONS} from '../../../constants/workspace-settings';
import useSettingsSectionObserver from '../../../hooks/use-settings-section-observer';
import {isSettingsChildVisible} from '../settings-visibility';
import styles from './settings-section.module.scss';

type SettingsSectionProps = {
	/** SIDEBAR_SECTIONS key identifying which section to render. */
	readonly sectionKey: string;
	/** Maps each child key to the component that renders that child. */
	readonly childComponents: Record<string, ComponentType>;
};

/**
 * Generic renderer for a workspace settings section.
 *
 * Reads the section title and ordered children from SIDEBAR_SECTIONS,
 * omits children whose visibility rule is false, and wires the scroll
 * observer. Adding a new section only requires registering its child
 * components here; no bespoke filtering or observer wiring is needed.
 */
function SettingsSection({
	sectionKey,
	childComponents
}: SettingsSectionProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.settings;

	const section = SIDEBAR_SECTIONS.find(
		item => item.key === sectionKey
	);
	const title = l10n?.[sectionKey]?.title ?? section?.title;

	const visibleChildren = (section?.children ?? []).filter(child =>
		isSettingsChildVisible(child.key)
	);
	const visibleChildIds = visibleChildren.map(child => child.key);

	useSettingsSectionObserver(visibleChildIds, containerRef);

	return (
		<div ref={containerRef} className={styles.container}>
			<div className={styles.header}>
				<h1>{title}</h1>
			</div>
			<div className={styles.settingsContainer}>
				{visibleChildren.map(child => {
					const ChildComponent = childComponents[child.key];

					return ChildComponent ? (
						<ChildComponent key={child.key} />
					) : null;
				})}
			</div>
		</div>
	);
}

export default SettingsSection;

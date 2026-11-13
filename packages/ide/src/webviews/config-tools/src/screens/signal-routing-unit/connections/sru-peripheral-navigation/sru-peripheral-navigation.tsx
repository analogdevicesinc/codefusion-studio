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
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import type {SruNavigationSection} from '../../../../utils/sru-navigation';
import SruPeripheralGroup from './sru-peripheral-group';
import SruPeripheralItem from './sru-peripheral-item';
import styles from './sru-peripheral-navigation.module.scss';

type SruPeripheralNavigationProps = Readonly<{
	sections: SruNavigationSection[];
}>;

/**
 * Renders the SRU Connections side-panel list as pin-buffer and peripheral
 * sections. Within each section, entries with a `group` - either a real
 * peripheral-level Group (bucketing multiple peripherals) or a single
 * peripheral wrapped under its own name because it has SRU input/output
 * subgroups - render as an expandable SruPeripheralGroup over their signal
 * groups. Entries with no `group` (a peripheral with neither) render their
 * single signal group directly as a flat top-level item instead.
 */
export default function SruPeripheralNavigation({
	sections
}: SruPeripheralNavigationProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit;

	const sectionTitle = (kind: SruNavigationSection['kind']) =>
		l10n?.connections?.peripheralList?.sections?.[kind];

	return (
		<div data-test='sru-peripheral-navigation'>
			{sections.map(section => (
				<div key={section.kind}>
					<h5
						className={styles.sectionHeading}
						data-test={`sru-navigation-section:${section.kind}`}
					>
						{sectionTitle(section.kind)}
					</h5>
					{section.entries.map(entry =>
						entry.group ? (
							<SruPeripheralGroup
								key={`${section.kind}-group-${entry.group}`}
								sectionKind={section.kind}
								group={entry.group}
								signalGroups={entry.signalGroups}
							/>
						) : (
							entry.signalGroups.map(signalGroup => (
								<SruPeripheralItem
									key={signalGroup.key}
									signalGroup={signalGroup}
								/>
							))
						)
					)}
				</div>
			))}
		</div>
	);
}

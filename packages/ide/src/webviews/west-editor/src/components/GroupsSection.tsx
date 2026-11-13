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
import {localizeWithArgs} from '@common/utils/string';
import {useWestEditor} from '../contexts/WestEditorContext';
import {getGroupState, setGroupState} from '../utils/group-filter';
import GroupCard from './GroupCard';
import styles from './GroupsSection.module.scss';

/** Every group the manifest mentions, each with its `group-filter` state. */
export default function GroupsSection() {
	const l10n = useLocaleContext();
	const {manifest, groups, updateManifest} = useWestEditor();

	if (!manifest) return null;

	const filter = manifest['group-filter'];

	return (
		<section className={styles.section}>
			<h2
				className={styles.count}
				data-test='west-editor:groups-count'
			>
				{groups.length === 1
					? l10n?.groups.countOne
					: localizeWithArgs(l10n, 'groups.count', {
							count: groups.length
						})}
			</h2>
			{groups.length === 0 ? (
				<p className={styles.empty}>{l10n?.groups.empty}</p>
			) : (
				<div className={styles.list}>
					{groups.map((group, index) => (
						<GroupCard
							key={group}
							name={group}
							state={getGroupState(filter, group)}
							index={index}
							onChange={state => {
								updateManifest({
									...manifest,
									'group-filter': setGroupState(filter, group, state)
								});
							}}
						/>
					))}
				</div>
			)}
		</section>
	);
}

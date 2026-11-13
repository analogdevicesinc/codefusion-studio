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

import {Card, DropDown} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {GroupState} from '../utils/group-filter';
import styles from './GroupCard.module.scss';

const GROUP_STATES: GroupState[] = ['enabled', 'disabled', 'none'];

type GroupCardProps = Readonly<{
	/** Group name, as listed in `projects[].groups` or `group-filter`. */
	name: string;
	/** How `group-filter` currently treats the group. */
	state: GroupState;
	/** Position in the list, used for the test hooks. */
	index: number;
	onChange: (state: GroupState) => void;
}>;

/**
 * One project group and whether `group-filter` enables or disables it.
 *
 * Presentational - rewriting the filter is the caller's job.
 */
export default function GroupCard({
	name,
	state,
	index,
	onChange
}: GroupCardProps) {
	const l10n = useLocaleContext();

	return (
		<Card
			disableHoverEffects
			testId={`west-editor:group-card-${index}`}
		>
			<div className={styles.card}>
				<h3
					className={styles.name}
					data-test={`west-editor:group-name-${index}`}
				>
					{name}
				</h3>
				<DropDown
					controlId={`west-editor-group-${index}`}
					dataTest={`west-editor:group-state-${index}`}
					size='small'
					currentControlValue={state}
					options={GROUP_STATES.map(value => ({
						value,
						label: l10n?.groups.state[value]
					}))}
					onHandleDropdown={value => {
						onChange(value as GroupState);
					}}
				/>
			</div>
		</Card>
	);
}

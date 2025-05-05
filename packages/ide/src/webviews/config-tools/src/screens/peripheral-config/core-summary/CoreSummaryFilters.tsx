/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {Chip} from 'cfs-react-library';
import type {Core} from '@common/types/soc';
import type {SocCoreList} from '../../../utils/soc-cores';

import styles from './CoreSummaryFilters.module.scss';

const SHOW_ALL = undefined;

type TCoreSummaryFiltersProps = {
	readonly cores: SocCoreList;
	readonly activeCore: Core | undefined;
	readonly onFilterCores: (core: Core | undefined) => void;
};

export default function CoreSummaryFilters({
	cores,
	activeCore,
	onFilterCores
}: TCoreSummaryFiltersProps) {
	return (
		<div
			className={styles.coreFiltersContainer}
			data-test='core-summary-filters:container'
		>
			<Chip
				dataTest='core-summary-filters:core:All'
				label='All'
				isDisabled={false}
				isActive={activeCore?.Id === SHOW_ALL}
				onClick={() => {
					onFilterCores(undefined);
				}}
			/>
			{cores.map(core => (
				<Chip
					key={core.Id}
					dataTest={`core-summary-filters:core:${core.Id}`}
					id={core.Id}
					label={core.Name}
					isDisabled={false}
					isActive={activeCore?.Id === core.Id}
					onClick={() => {
						onFilterCores(
							activeCore?.Id === core.Id ? SHOW_ALL : core
						);
					}}
				/>
			))}
		</div>
	);
}

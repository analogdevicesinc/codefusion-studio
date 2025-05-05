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

// @TODO move file to common location

import {Chip} from 'cfs-react-library';
import styles from './FilterControls.module.scss';

export type FilterOption = {
	count?: number;
	isSelected?: boolean;
	isDisabled?: boolean;
};

export type FilterControlsProps = Readonly<{
	options: Record<string, FilterOption>;
	onSelect: (type: string) => void;
}>;

function FilterControls({options, onSelect}: FilterControlsProps) {
	return (
		<div className={styles.filterControlsContainer}>
			{Object.entries(options).map(([key, option]) => (
				<div
					key={`filterControl-${key}`}
					className={styles.filterChipContainer}
				>
					<Chip
						id={`filterControl-${key}`}
						label={key}
						dataTest={`filter-control:${key}`}
						isDisabled={option?.isDisabled ?? false}
						isActive={option?.isSelected ?? false}
						onClick={() => {
							onSelect(key);
						}}
					>
						{option?.count ?? null}
					</Chip>
				</div>
			))}
		</div>
	);
}

export default FilterControls;

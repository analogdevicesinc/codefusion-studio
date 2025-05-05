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
import {useState} from 'react';
import Tooltip from '../../../../components/Tooltip/Tooltip';
import {Button, DataGridCell, DataGridRow} from 'cfs-react-library';

import type {TSection} from '../../../../common/types/memory-layout';
import type {TLocaleContext} from '../../../../common/types/context';
import Info from '../../../../../../common/icons/Info';

import styles from './MemoryListItem.module.scss';

type TMemoryListItemProps = {
	readonly section: TSection;
	readonly title: string;
	readonly index: number;
	readonly i10n: TLocaleContext | undefined;
	readonly children: React.ReactNode;
};

export default function MemoryListItem({
	section,
	title,
	index,
	i10n,
	children
}: TMemoryListItemProps) {
	const [isHovered, setIsHovered] = useState<boolean>(false);

	return (
		<DataGridRow key={`${title}-${section.id}`}>
			<DataGridCell
				gridColumn={String(index + 1)}
				onMouseEnter={() => {
					setIsHovered(true);
				}}
				onMouseLeave={() => {
					setIsHovered(false);
				}}
			>
				<div className={styles['tooltip-container']}>
					<span>{title}</span>

					{isHovered && i10n?.[`${title}`] && (
						<Tooltip
							content={{
								title: i10n?.[`${title}`] || ''
							}}
							containerPosition='relative'
						>
							<Button
								appearance='icon'
								className={styles['icon-button']}
							>
								<Info />
							</Button>
						</Tooltip>
					)}
				</div>
			</DataGridCell>
			<DataGridCell
				gridColumn={String(index + 2)}
				className={styles['right-align']}
			>
				{children}
			</DataGridCell>
		</DataGridRow>
	);
}

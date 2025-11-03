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
import {Button, Divider} from 'cfs-react-library';

import Info from '@common/icons/Info';
import type {TArmAttributes} from '../../../../common/types/metadata';
import type {TLocaleContext} from '../../../../common/types/context';

import styles from './AttributesListItem.module.scss';

type TAttributesListItemProps = {
	readonly item: TArmAttributes | Record<string, any>;
	readonly i10n: TLocaleContext | undefined;
};

export default function AttributesListItem({
	item,
	i10n
}: TAttributesListItemProps) {
	const [hoveredItem, setHoveredItem] = useState<
		TArmAttributes | Record<string, any> | undefined
	>(undefined);

	const isItemHovered = (itemLabel: string) =>
		itemLabel === hoveredItem?.label && i10n?.[`${item.label}`];

	return (
		<>
			<li
				className={styles.item}
				data-test='metadata:list:item'
				onMouseEnter={() => {
					setHoveredItem(item);
				}}
				onMouseLeave={() => {
					setHoveredItem(undefined);
				}}
			>
				<div className={styles['item-detail']}>
					<span>{item.label}</span>
					{isItemHovered(item?.label as string) && (
						<Tooltip
							content={{
								title: i10n?.[`${item.label}`]?.title || '',
								description:
									i10n?.[`${item.label}`]?.description || ''
							}}
							containerPosition='relative'
						>
							<Button appearance='icon' className={styles.icon}>
								<Info />
							</Button>
						</Tooltip>
					)}
				</div>

				<div className={`${styles['item-detail']} ${styles.value}`}>
					{item.value}
				</div>
			</li>
			<Divider />
		</>
	);
}

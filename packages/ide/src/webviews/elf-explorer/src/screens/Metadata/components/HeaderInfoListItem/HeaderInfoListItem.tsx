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

import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';
import Info from '@common/icons/Info';

import type {THeaderInfo} from '../../../../common/types/metadata';
import type {TLocaleContext} from '../../../../common/types/context';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import Tooltip from '../../../../components/Tooltip/Tooltip';
import {getDisplayValue} from '../../../../utils/metadata-utils';

import styles from './HeaderInfoListItem.module.scss';

type THeaderInfoListItem = {
	readonly item: THeaderInfo;
};

export default function HeaderInfoListItem({
	item
}: THeaderInfoListItem) {
	const [hoveredItem, setHoveredItem] = useState<
		THeaderInfo | undefined
	>(undefined);

	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.metadata?.header?.tooltips?.list;

	const isItemHovered = (itemLabel: string) =>
		itemLabel === hoveredItem?.label && i10n?.[`${item.label}`];

	return (
		<li
			className={styles.item}
			onMouseEnter={() => {
				setHoveredItem(item);
			}}
			onMouseLeave={() => {
				setHoveredItem(undefined);
			}}
		>
			<div className={styles.label}>
				<span>{item.label}</span>

				{isItemHovered(item?.label) && (
					<Tooltip
						content={{
							title: i10n?.[`${item.label}`]?.title || '',
							description: i10n?.[`${item.label}`]?.description || ''
						}}
					>
						<VSCodeButton appearance='icon'>
							<Info />
						</VSCodeButton>
					</Tooltip>
				)}
			</div>
			<div className={styles.value}>{getDisplayValue(item)}</div>
		</li>
	);
}

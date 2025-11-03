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
import {Divider} from 'cfs-react-library';
import AttributesListItem from '../AttributesListItem/AttributesListItem';
import NoData from '../../../../components/NoData/NoData';
import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';
import type {TLocaleContext} from '../../../../common/types/context';
import type {TArmAttributes} from '../../../../common/types/metadata';

import styles from './AttributesList.module.scss';

type AttributesListProps = {
	readonly list: TArmAttributes[] | Array<Record<string, any>>;
	readonly noDataMessage?: string;
	readonly i10n: TLocaleContext | undefined;
};

export default function AttributesList({
	list,
	noDataMessage,
	i10n
}: AttributesListProps) {
	return (
		<div className={styles.container} data-test='metadata:list'>
			<HeaderWithTooltip title={i10n?.title} i10n={i10n} />

			{list.length ? (
				<ul className={styles.list}>
					<div>
						<Divider />
						<li className={styles.item}>
							<span className={styles.header}>File attribute</span>
							<span className={styles.header}>Value</span>
						</li>
						<Divider />
					</div>
					{list.map(
						(item: TArmAttributes | Record<string, any>) =>
							item.value && (
								<AttributesListItem
									key={item.label}
									item={item}
									i10n={i10n?.tooltips?.list}
								/>
							)
					)}
				</ul>
			) : (
				<NoData content={noDataMessage} />
			)}
		</div>
	);
}

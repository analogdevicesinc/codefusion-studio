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
import HeaderInfoListItem from '../HeaderInfoListItem/HeaderInfoListItem';
import {useLocaleContext} from '@common/contexts/LocaleContext';

import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';

import type {THeaderInfo} from '../../../../common/types/metadata';
import type {TLocaleContext} from '../../../../common/types/context';

import styles from './HeaderInfo.module.scss';

export default function HeaderInfo({
	data
}: {
	readonly data: THeaderInfo[];
}) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.metadata?.header;

	return (
		<div
			className={styles.container}
			data-test='header-info:container'
		>
			<HeaderWithTooltip title={i10n?.title} i10n={i10n} />
			<ul className={styles.list}>
				{data.map((item: THeaderInfo) => (
					<HeaderInfoListItem key={item.label} item={item} />
				))}
			</ul>
		</div>
	);
}

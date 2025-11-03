/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {Card} from 'cfs-react-library';
import styles from './block-partition-details.module.scss';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

type BlockPartitionProps = {
	readonly title: string;
	readonly size: string;
	readonly occupiedMemory: string;
};

export function BlockPartitionDetails({
	title,
	size,
	occupiedMemory
}: BlockPartitionProps): JSX.Element {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.blocks;

	return (
		<Card disableHoverEffects>
			<div className={styles.container}>
				<section>
					<div className={styles.title} title={title.toUpperCase()}>
						{title.toUpperCase()}
					</div>
					<div className={styles.size}>{size}</div>
				</section>
				<section>
					<div
						className={styles.occupiedMemory}
					>{`${occupiedMemory} ${i10n?.['occupied-memory']}`}</div>
				</section>
			</div>
		</Card>
	);
}

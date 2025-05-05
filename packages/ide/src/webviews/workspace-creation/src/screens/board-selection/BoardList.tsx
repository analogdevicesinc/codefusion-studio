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

import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import CTBGAIcon from '@common/icons/CTBGA';
import TQFNIcon from '@common/icons/TQFN';
import WLPIcon from '@common/icons/WLP';
import LFCSPIcon from '@common/icons/LFCSP';
import WLCSPIcon from '@common/icons/WLCSP';
import useBoardPackageSelection from '../../hooks/useBoardPackageSelection';

import type {
	TStandardBoard,
	TCustomBoard
} from '../../common/types/catalog';

import styles from './BoardList.module.scss';
import LinkIcon from '../../../../common/icons/Link';
import {Radio} from 'cfs-react-library';

const ICON_DICTIONARY: Record<string, React.ComponentType> = {
	CTBGAIcon,
	TQFNIcon,
	WLPIcon,
	LFCSPIcon,
	WLCSPIcon
};

export default function BoardList({
	list
}: Readonly<{list: TStandardBoard[] | TCustomBoard[]}>) {
	const {SEPARATOR, selectedBoardPackageId, onChangeHandler} =
		useBoardPackageSelection();

	return (
		<div className={styles.boardList}>
			{list.map(item => {
				let {packageLayout} = item;

				if (!ICON_DICTIONARY[`${packageLayout}Icon`]) {
					packageLayout = 'TQFN';
				}

				const PinIcon = ICON_DICTIONARY[`${packageLayout}Icon`];
				const itemId = `${item.boardId}${SEPARATOR}${item.packageId}`;

				return (
					<CfsSelectionCard
						key={itemId}
						testId={`boardSelection:card:${itemId}`}
						id={itemId}
						isChecked={selectedBoardPackageId === itemId}
						onChange={onChangeHandler}
					>
						<Radio
							slot='start'
							checked={selectedBoardPackageId === itemId}
						/>
						<div slot='title' className={styles.title}>
							{PinIcon && (
								<div className={styles.icon}>
									<PinIcon />
								</div>
							)}
							<div className={styles.content}>
								<h3 className={styles.name}>{item.name}</h3>
								<p className={styles.description}>
									{item.description}
								</p>
							</div>
						</div>

						{'url' in item && item?.url && (
							<div slot='end'>
								<a href={item.url}>
									<div className={styles.linkIcon}>
										<LinkIcon />
									</div>
								</a>
							</div>
						)}
					</CfsSelectionCard>
				);
			})}
		</div>
	);
}

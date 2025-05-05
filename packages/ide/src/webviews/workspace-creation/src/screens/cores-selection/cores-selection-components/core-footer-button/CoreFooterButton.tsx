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
import Config from '../../../../../../common/icons/Config';
import CfsTooltip from '../../../../../../common/components/cfs-tooltip/CfsTooltip';

import styles from './CoreFooterButton.module.scss';

export default function CoreFooterButton({
	coreId,
	isCoreEnabled,
	onBtnClick
}: Readonly<{
	coreId: string;
	isCoreEnabled: boolean;
	onBtnClick: () => void;
}>) {
	const [isBtnHovered, setIsBtnHovered] = useState<boolean>(false);

	const {
		top: iconTop = 0,
		left: iconLeft = 0,
		height: iconHeight = 0
	} = document
		.getElementById(`core-footer-button--${coreId}`)
		?.getBoundingClientRect() ?? {};

	const {
		top: containerTop = 0,
		bottom: containerBottom = 0,
		height: containerHeight = 0
	} = document.getElementById(`${coreId}`)?.getBoundingClientRect() ??
	{};

	const top: number | undefined =
		iconTop +
		iconHeight -
		containerTop +
		containerBottom -
		containerHeight +
		20;
	const left = iconLeft - 10;

	return (
		<>
			<span
				className={`${styles.icon} ${styles.hoverable} ${isCoreEnabled ? styles.interactable : styles.disabled}`}
				data-test={`coresSelection:card:configIcon:${coreId}`}
				id={`core-footer-button--${coreId}`}
				onClick={onBtnClick}
				onMouseEnter={() => {
					setIsBtnHovered(true);
				}}
				onMouseLeave={() => {
					setIsBtnHovered(false);
				}}
			>
				<Config width='14.6' height='12.6' />
			</span>

			{isBtnHovered && (
				<CfsTooltip
					id={`core-footer-button-tooltip--${coreId}`}
					header='Config Options'
					top={top}
					bottom={undefined}
					left={left}
					classNames={styles.tooltip}
				>
					{isCoreEnabled ? (
						<div>
							Wherever you see this icon, you can click it to edit
							configuration options.
						</div>
					) : (
						<div>Only selected cores can be configured.</div>
					)}
				</CfsTooltip>
			)}
		</>
	);
}

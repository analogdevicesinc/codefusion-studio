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

import {useState} from 'react';
import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import styles from './SymbolsTable.module.scss';

export default function NameCellTooltip({
	id,
	value,
	demangled
}: Readonly<{
	id: string;
	value: string;
	demangled: string | undefined;
}>) {
	const [isHovered, setIsHovered] = useState<boolean>(false);

	const {
		top: rowTop = 0,
		left: rowLeft = 0,
		height: rowHeight = 0
	} = document
		.getElementById(`symbol-name--${id}`)
		?.getBoundingClientRect() ?? {};

	const {top: containerTop = 0} =
		document
			.getElementById('symbols-table-container')
			?.getBoundingClientRect() ?? {};

	const top: number | undefined =
		rowTop - containerTop + rowHeight + 15;

	return (
		<div
			onMouseEnter={() => {
				setIsHovered(true);
			}}
			onMouseLeave={() => {
				setIsHovered(false);
			}}
		>
			<div id={`symbol-name--${id}`} className={styles.nameCellValue}>
				{value}
			</div>
			{isHovered && (
				<CfsTooltip id='symbol-name-tooltip' top={top} left={rowLeft}>
					<div className={styles.tooltipContent}>
						{demangled ?? value}
					</div>
				</CfsTooltip>
			)}
		</div>
	);
}

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
import React from 'react';
import {type THeaderInfo} from '../../../../common/types/metadata';
import type {TSection} from '../../../../common/types/memory-layout';
import Tooltip from '../../../../components/Tooltip/Tooltip';
import {TooltipInfo} from '../../../../utils/chart-utils';
import {convertArray} from '../../../../utils/stats-utils';
import styles from './MetadataOverview.module.scss';

type TMetadataOverviewProps = {
	readonly data: THeaderInfo[];
	readonly sections: TSection[];
};

export default function MetadataOverview({
	data,
	sections
}: TMetadataOverviewProps) {
	const dataToDisplay = [
		`ELF ${data
			.find(item => item.label === 'Class')
			?.value.toString()
			.replace('ELF', '')}-bit`,
		data
			.find(item => item.label === 'Data')
			?.value?.toString()
			?.includes('little')
			? 'LSB'
			: 'MSB',
		data
			.find(item => item.label === 'Type')
			?.value?.toString()
			?.match(/\((.*?)\)/)?.[1]
			.replace('file', ''),
		data.find(item => item.label === 'Machine')?.value,
		`${data.find(item => item.label === 'OS ABI')?.value} version ${
			data.find(item => item.label === 'ABI Version')?.value
		}`,
		`${
			Number(
				data.find(item => item.label === 'ABI Version')?.value
			) === 0
				? 'statically linked'
				: ''
		}`,
		`${
			sections.find(item => item.name === '.debug_info')
				? 'with debug_info'
				: 'with no debug_info'
		}`,
		`${
			(sections.find(item => item.name === '.debug_info') ??
			sections.find(item => Number(item.type) === 2))
				? 'not stripped'
				: 'stripped'
		}`
	];

	const filteredDataToDisplay = convertArray(
		dataToDisplay.filter(Boolean) as string[]
	);

	return (
		// prettier-ignore
		<div className={styles.container}>
			<div className={styles.overviewWrapper}>
				<h1 className={styles.title}>File overview</h1>
				{filteredDataToDisplay.map((item, index) => (
					<React.Fragment key={item}>
						<Tooltip
							content={{
								title: TooltipInfo[index].title,
								description: TooltipInfo[index].description
							}}
							containerPosition='relative'
						>
							<span className={styles.underlined}>{item}</span>
						</Tooltip>
						{index < filteredDataToDisplay.length - 1 && (
							<span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
						)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}

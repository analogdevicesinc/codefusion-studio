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
import {useEffect, useState} from 'react';
import {
	getMemoryUsage,
	getSavedOptionsForTableFormat
} from '../../common/api';

// Components
import ScreenLayout from '../../layouts/ScreenLayout/ScreenLayout';
import MemoryTable from './components/MemoryTable/MemoryTable';
import MemoryVisual from './components/MemoryVisual/MemoryVisual';
import MemoryList from './components/MemoryList/MemoryList';
import Loader from '../../components/Loader/Loader';
import MemoryBackButton from './components/BackButton/BackButton';
import NoData from '../../components/NoData/NoData';

import {formatSegments} from '../../utils/format';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {TLocaleContext} from '../../common/types/context';

import styles from './MemoryLayout.module.scss';

import type {
	TSegment,
	TSegmentResponse,
	TSection,
	TSavedTableOptions
} from '../../common/types/memory-layout';
import type {TSymbol} from '../../common/types/symbols';
import {
	handleLayerClick,
	handleClick,
	handleBackClick,
	handleBack,
	handleHover,
	handleMouseLeave
} from '../../utils/memory-handlers';

export default function MemoryLayout() {
	const [dataTree, setDataTree] = useState<TSegment[]>([]);
	const [layer, setLayer] = useState(1);
	const [parentLayer, setParentLayer] = useState<
		TSegment | TSection | undefined
	>(undefined);
	const [currentData, setCurrentData] = useState<
		TSegment[] | TSection[] | TSymbol[]
	>([]);
	const [hoveredItem, setHoveredItem] = useState<
		TSegment | TSection | TSymbol | undefined
	>(undefined);
	const [hoverSource, setHoverSource] = useState<
		'MemoryTable' | 'MemoryVisual' | undefined
	>(undefined);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.['memory layout'];
	const [savedOptions, setSavedOptions] = useState<
		TSavedTableOptions | undefined
	>(undefined);
	const [loading, setLoading] = useState<boolean>(false);

	useEffect(() => {
		setLoading(true);

		getMemoryUsage()
			.then((response: TSegmentResponse[]) => {
				setLoading(false);
				const formattedResponse = formatSegments(response);
				setDataTree(formattedResponse);
				setCurrentData(formattedResponse);
			})
			.catch((err: string) => {
				setLoading(false);
				throw new Error(err);
			});

		// This is to know in what format to display the "number" value in the table
		getSavedOptionsForTableFormat()
			.then(response => {
				setSavedOptions(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
	}, []);

	const layerClickHandlers = handleLayerClick(
		setCurrentData,
		setParentLayer,
		setLayer
	);
	const backClickHandlers = handleBackClick(
		setCurrentData,
		setParentLayer,
		setLayer,
		dataTree,
		currentData,
		parentLayer
	);

	return (
		<ScreenLayout>
			<MemoryBackButton
				layer={layer}
				data={parentLayer}
				onClick={targetLayer => {
					handleBack(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, no-negated-condition
						targetLayer !== undefined ? targetLayer : layer,
						backClickHandlers
					);
				}}
			/>
			<section className={styles.container}>
				<article className={styles.left}>
					{loading ? (
						<Loader />
					) : (
						// eslint-disable-next-line react/jsx-no-useless-fragment
						<>
							{layer < 3 ? (
								<MemoryVisual
									segments={currentData as TSegment[] | TSection[]}
									hoveredItem={hoveredItem}
									hoverSource={hoverSource}
									onClick={data => {
										handleClick(data, layer, layerClickHandlers);
									}}
									onHover={(data, source) => {
										handleHover(
											data,
											source,
											setHoveredItem,
											setHoverSource
										);
									}}
									onMouseLeave={() => {
										handleMouseLeave(setHoveredItem, setHoverSource);
									}}
								/>
							) : (
								<MemoryList
									data={[parentLayer as TSection]}
									i10n={i10n?.table?.flags || ''}
								/>
							)}
						</>
					)}
				</article>
				<article className={styles.right}>
					{currentData && currentData.length > 0 && savedOptions ? (
						<MemoryTable
							data={currentData}
							hoveredItem={hoveredItem}
							hoverSource={hoverSource}
							layer={layer}
							savedOptions={savedOptions}
							onClickHandler={data => {
								handleClick(data, layer, layerClickHandlers);
							}}
							onHover={(data, source) => {
								handleHover(
									data,
									source,
									setHoveredItem,
									setHoverSource
								);
							}}
							onMouseLeave={() => {
								handleMouseLeave(setHoveredItem, setHoverSource);
							}}
							onChangeTableFormat={(
								updatedOptions: TSavedTableOptions
							) => {
								setSavedOptions(updatedOptions);
							}}
						/>
					) : (
						<NoData content='No data to display.' />
					)}
				</article>
			</section>
		</ScreenLayout>
	);
}

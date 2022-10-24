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
import type {Dispatch, SetStateAction} from 'react';
import type {TSection, TSegment} from '../common/types/memory-layout';
import type {TSymbol} from '../common/types/symbols';

type LayerClickHandler = (
	data: TSegment | TSection | TSymbol
) => void;

const isSegment = (data: any): data is TSegment =>
	(data as TSegment).sections !== undefined;
const isSection = (data: any): data is TSection =>
	(data as TSection).symbols !== undefined;

export const handleLayerClick = (
	setCurrentData: Dispatch<SetStateAction<any[]>>,
	setParentLayer: Dispatch<
		SetStateAction<TSegment | TSection | undefined>
	>,
	setLayer: Dispatch<SetStateAction<number>>
): LayerClickHandler[] => [
	(data: TSegment | TSection | TSymbol) => {
		if (isSegment(data)) {
			const SortedData = data.sections.sort(
				(a, b) => a.size - b.size
			);
			setCurrentData(SortedData);
			setParentLayer(data);
			setLayer(2);
		}
	},
	(data: TSegment | TSection | TSymbol) => {
		if (isSection(data)) {
			const SortedData = data.symbols?.sort((a, b) => {
				const valueA = parseInt(a.value as string, 16);
				const valueB = parseInt(b.value as string, 16);

				return valueA - valueB;
			});
			setCurrentData(SortedData);
			setParentLayer(data);
			setLayer(3);
		}
	}
];

export const handleClick = (
	data: TSegment | TSection | TSymbol,
	layer: number,
	handleLayerClick: LayerClickHandler[]
) => {
	if (layer <= handleLayerClick.length) {
		handleLayerClick[layer - 1](data);
	}
};

export const handleBackClick = (
	setCurrentData: Dispatch<SetStateAction<any[]>>,
	setParentLayer: Dispatch<
		SetStateAction<TSegment | TSection | undefined>
	>,
	setLayer: Dispatch<SetStateAction<number>>,
	dataTree: TSegment[],
	currentData: any[],
	parentLayer: any
	// eslint-disable-next-line max-params
) => [
	() => {
		setCurrentData(dataTree);
		setParentLayer(undefined);
		setLayer(1);
	},
	() => {
		const parentLayerArray = [parentLayer];

		const parentSegment = dataTree.find(
			(segment: Record<string, any>) =>
				segment.sections?.some((section: Record<string, any>) =>
					section.symbols?.some(
						(symbol: Record<string, any>) =>
							symbol.routeId === currentData[0]?.routeId
					)
				)
		);

		if (parentSegment) {
			const parentSection = parentSegment.sections?.find(
				(section: Record<string, any>) =>
					section.symbols?.some(
						(symbol: Record<string, any>) =>
							symbol.routeId === currentData[0]?.routeId
					)
			);

			if (parentSection) {
				setCurrentData(
					parentSegment.sections as Array<Record<string, any>>
				);
				setParentLayer(parentSegment);
				setLayer(2);
			}
		}

		if (currentData.length === 0) {
			// Handle the case where currentData is empty
			const parentSegment = dataTree.find(
				(segment: Record<string, any>) =>
					segment.sections?.some(
						(section: Record<string, any>) =>
							section.routeId === parentLayerArray[0]?.routeId
					)
			);

			if (parentSegment) {
				setCurrentData(
					parentSegment.sections as Array<Record<string, any>>
				);
				setParentLayer(parentSegment);
				setLayer(2);
			}
		}
	}
];

export const handleBack = (
	layer: number,
	handleBackClick: Array<() => void>
) => {
	if (layer === 1) {
		handleBackClick[0](); // Always navigate to the root (layer 1)
	} else if (layer > 1) {
		handleBackClick[layer - 2]();
	}
};

export const handleHover = (
	data: TSegment | TSection | TSymbol | undefined,
	source: 'MemoryTable' | 'MemoryVisual',
	setHoveredItem: Dispatch<
		SetStateAction<TSegment | TSection | TSymbol | undefined>
	>,
	setHoverSource: Dispatch<
		SetStateAction<'MemoryTable' | 'MemoryVisual' | undefined>
	>
) => {
	setHoveredItem(data);
	setHoverSource(source);
};

export const handleMouseLeave = (
	setHoveredItem: Dispatch<
		SetStateAction<TSegment | TSection | TSymbol | undefined>
	>,
	setHoverSource: Dispatch<
		SetStateAction<'MemoryTable' | 'MemoryVisual' | undefined>
	>
) => {
	setHoveredItem(undefined);
	setHoverSource(undefined);
};

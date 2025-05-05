import type {TSection, TSegment} from './memory-layout';
import type {TSymbol} from './symbols';

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
export type TMemLayoutContext = {
	layer: 1 | 2 | 3;
	selectedItemName: string;
	dataTree: TSegment[];
	currentData: TSegment[] | TSection[] | TSymbol[] | undefined;
	parentLayer: TSegment | TSection | undefined;
};

export type TLocaleContext = Record<string, any>;

export type TAppContext = {
	query: string;
	memLayout: TMemLayoutContext;
	editQuery: (newQuery: string) => void;
	setMemoryLayout: (newValue: any) => void;
};

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
import {createContext, useContext, useMemo, useState} from 'react';

import type {TAppContext, TMemLayoutContext} from '../types/context';

const AppContext = createContext<TAppContext | undefined>(undefined);

export const useAppContext = () => {
	const context = useContext(AppContext);

	if (context === undefined) {
		throw new Error('The context must be used within a AppProvider');
	}

	return context;
};

type TAContext = {
	readonly children: React.ReactNode;
};

export function AppProvider({children}: TAContext) {
	const [query, setQuery] = useState<string>(
		'SELECT * FROM symbols WHERE size > 0'
	);
	const [memLayout, setMemLayout] = useState<TMemLayoutContext>({
		layer: 1,
		selectedItemName: 'All segments',
		dataTree: [],
		currentData: [],
		parentLayer: undefined
	});

	const setMemoryLayout = (memLayout: TMemLayoutContext) => {
		setMemLayout(memLayout);
	};

	const editQuery = (newQuery: string) => {
		setQuery(newQuery);
	};

	// Important to memoize the context because we don't want unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			query,
			memLayout,
			editQuery,
			setMemoryLayout
		}),
		[query, memLayout]
	);

	return (
		<AppContext.Provider value={contextValue}>
			{children}
		</AppContext.Provider>
	);
}

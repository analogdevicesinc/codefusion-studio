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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {NavigationItem} from '../../../common/types/navigation';
import {navigationItems} from '../../../common/constants/navigation';

type ElfContextState = {
	activeScreen: string;
};

export const elfContextInitialState: ElfContextState = {
	activeScreen: navigationItems.stats
};

const elfContextSlice = createSlice({
	name: 'elfContext',
	initialState: elfContextInitialState,
	reducers: {
		setActiveScreen(state, action: PayloadAction<NavigationItem>) {
			state.activeScreen = action.payload;
		}
	}
});

export const {setActiveScreen} = elfContextSlice.actions;

export const elfContextReducer = elfContextSlice.reducer;

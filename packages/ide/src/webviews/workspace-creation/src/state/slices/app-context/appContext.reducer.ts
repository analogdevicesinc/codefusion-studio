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

import {navigationItems} from '../../../common/constants/navigation';
import type {NavigationItem} from '../../../common/types/navigation';

type AppContextState = {
	activeScreen: NavigationItem;
};

export const appContextInitialState: AppContextState = {
	activeScreen: navigationItems.socSelection
};

const appContextSlice = createSlice({
	name: 'appContext',
	initialState: appContextInitialState,
	reducers: {
		setActiveScreen(state, action: PayloadAction<NavigationItem>) {
			state.activeScreen = action.payload;
		}
	}
});

export const {setActiveScreen} = appContextSlice.actions;

export const appContextReducer = appContextSlice.reducer;

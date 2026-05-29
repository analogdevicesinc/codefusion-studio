/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {
  createSlice,
  type PayloadAction
} from '@reduxjs/toolkit';
import {navigationItems} from '../../../common/constants/navigation';

import type {NavigationItem} from '../../../common/types/navigation';
import type {CfsEventState} from '../../../common/types/events';

type SevContextState = {
  activeScreen: NavigationItem;
  toolState?: CfsEventState;
  lastUpdate?: string;
};

export const sevContextInitialState: SevContextState = {
  activeScreen: navigationItems.timeline
};

const appContextSlice = createSlice({
  name: 'appContext',
  initialState: sevContextInitialState,
  reducers: {
    setActiveScreen(state, action: PayloadAction<NavigationItem>) {
      state.activeScreen = action.payload;
    },
    setToolState(
      state,
      action: PayloadAction<CfsEventState | undefined>
    ) {
      state.toolState = action.payload;
    },
    setLastUpdate(
      state,
      action: PayloadAction<string | undefined>
    ) {
      state.lastUpdate = action.payload;
    }
  }
});

export const {setActiveScreen, setToolState, setLastUpdate} =
  appContextSlice.actions;
export const appContextReducer = appContextSlice.reducer;

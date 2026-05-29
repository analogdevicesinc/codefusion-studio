/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {combineReducers, configureStore} from '@reduxjs/toolkit';
import type {Action, ThunkAction} from '@reduxjs/toolkit';

import {eventTreeReducer} from './slices/event-tree/event-tree.reducer';

import {
	type TypedUseSelectorHook,
	useDispatch,
	useSelector
} from 'react-redux';

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action
>;

const rootReducer = combineReducers({
	eventTreeReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export const store = configureStore({
	reducer: rootReducer
});

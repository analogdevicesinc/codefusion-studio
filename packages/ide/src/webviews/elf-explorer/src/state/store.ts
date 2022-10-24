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
import {combineReducers, configureStore} from '@reduxjs/toolkit';
import type {Action, ThunkAction} from '@reduxjs/toolkit';

import {elfContextReducer} from './slices/elf-context/elfContext.reducer';

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
	// New slices go here
	elfContextReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export const store = configureStore({
	reducer: rootReducer,
	middleware: getDefaultMiddleware => getDefaultMiddleware()
});

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
import {useAppSelector} from '../../store';

export const useActiveScreen = () =>
	useAppSelector(state => state.appContextReducer.activeScreen);

export const useActiveConfiguredSignal = () =>
	useAppSelector(
		state =>
			state.appContextReducer.configScreen.activeConfiguredSignalId
	);

export const useRegisters = () =>
	useAppSelector(
		state => state.appContextReducer.registersScreen.registers
	);

export const useRegisterDetails = (
	registerName: string | undefined
) =>
	useAppSelector(state =>
		state.appContextReducer.registersScreen.registers.find(
			register => register.name === registerName
		)
	);

export const useFilter = () =>
	useAppSelector(state => state.appContextReducer.filter);

export const useSearchString = (
	searchContext: 'register' | 'pinconfig'
) =>
	useAppSelector(
		state => state.appContextReducer.searchString[searchContext]
	);

/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import type {DFGStream} from 'cfs-plugins-api';

export function useStreams(): DFGStream[] {
	return useAppSelector(state => state.gasketsReducer.Streams || []);
}

export function useGasketOptions() {
	return useAppSelector(state => state.gasketsReducer.GasketOptions);
}

export function useEditingStream() {
	return useAppSelector(state => state.gasketsReducer.editingStream);
}

export function useEditingGasket() {
	return useAppSelector(state => state.gasketsReducer.editingGasket);
}

export function useSelectedGaskets() {
	return useAppSelector(
		state => state.gasketsReducer.selectedGaskets
	);
}

export function useSelectedStreams() {
	return useAppSelector(
		state => state.gasketsReducer.selectedStreams
	);
}

export function useHoveredStream() {
	return useAppSelector(state => state.gasketsReducer.hoveredStream);
}

export function useGasketUIProps() {
	return useAppSelector(
		state => state.gasketsReducer.GasketBufferSizes
	);
}

export function useGasketInputStreamMap() {
	return useAppSelector(
		state => state.gasketsReducer.GasketInputStreamMap
	);
}

export function useGasketOutputStreamMap() {
	return useAppSelector(
		state => state.gasketsReducer.GasketOutputStreamMap
	);
}

export function useDfgUI() {
	return useAppSelector(state => state.gasketsReducer.dfgUI);
}

export function useStreamErrors() {
	return useAppSelector(state => state.gasketsReducer.StreamErrors);
}

export function useGasketErrors() {
	return useAppSelector(state => state.gasketsReducer.GasketErrors);
}

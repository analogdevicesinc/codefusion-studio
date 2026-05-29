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

import type {
	DisplayFormat,
	Endianness
} from '../app-context/app-context.reducer';
import {useAppSelector} from '../../store';

export const useMemoryData = () =>
	useAppSelector(state => state.memoryReducer.memoryBytes.data);

export const useMemoryAddresses = (
	numColumns: number,
	byteGrouping: number
) =>
	useAppSelector(state => {
		const bytesPerRow = numColumns * byteGrouping;
		const addresses: string[] = [];

		if (state.memoryReducer.memoryBytes.address === undefined) {
			return addresses;
		}

		for (
			let i = 0;
			i < state.memoryReducer.memoryBytes.data.length;
			i += bytesPerRow
		) {
			const address = state.memoryReducer.memoryBytes.address + i;
			addresses.push(`0x${address.toString(16).padStart(8, '0')}`);
		}

		return addresses;
	});

export const useMemoryAscii = (numColumns: number) =>
	useAppSelector(state => {
		const asciiData: string[] = [];

		for (
			let i = 0;
			i < state.memoryReducer.memoryBytes.data.length;
			i += numColumns
		) {
			const rowAscii = state.memoryReducer.memoryBytes.data
				.slice(i, i + numColumns)
				.map(byte =>
					byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
				)
				.join('');
			asciiData.push(rowAscii);
		}

		return asciiData;
	});

const DECIMAL_DIGITS: Record<number, number> = {1: 3, 2: 5, 4: 10};

export const useMemoryValues = (
	numColumns: number,
	byteGrouping: number,
	endianness: Endianness,
	displayFormat: DisplayFormat
) =>
	useAppSelector(state => {
		const bytesPerRow = numColumns * byteGrouping;
		const decPadWidth = DECIMAL_DIGITS[byteGrouping] ?? 3;
		const rowData: string[][] = [];

		for (
			let i = 0;
			i < state.memoryReducer.memoryBytes.data.length;
			i += bytesPerRow
		) {
			const rowBytes = state.memoryReducer.memoryBytes.data.slice(
				i,
				i + bytesPerRow
			);
			const grouped: string[] = [];

			for (let g = 0; g < rowBytes.length; g += byteGrouping) {
				const group = rowBytes.slice(g, g + byteGrouping);

				if (endianness === 'little') {
					group.reverse();
				}

				if (group.length > 0) {
					if (displayFormat === 'hex') {
						grouped.push(
							group
								.map(byte => byte.toString(16).padStart(2, '0'))
								.join('')
						);
					} else {
						const value = group.reduce(
							(acc, byte) => acc * 256 + byte,
							0
						);
						grouped.push(
							value.toString(10).padStart(decPadWidth, '0')
						);
					}
				}
			}

			rowData.push(grouped);
		}

		return rowData;
	});

export const useDebugSessions = () =>
	useAppSelector(state => state.memoryReducer.sessions);

export const useHaltedSessions = () =>
	useAppSelector(state =>
		state.memoryReducer.sessions.filter(session => !session.isRunning)
	);

export const useMemoryMetadata = () =>
	useAppSelector(state => ({
		address: state.memoryReducer.memoryBytes.address,
		length: state.memoryReducer.memoryBytes.data.length
	}));

export const useMemoryError = () =>
	useAppSelector(state => state.memoryReducer.error);

export const useReachedEndOfMemory = () =>
	useAppSelector(state => state.memoryReducer.reachedEndOfMemory);

export const useActiveSession = () => {
	const activeSessionId = useAppSelector(
		state => state.memoryReducer.activeSessionId
	);
	const sessions = useAppSelector(
		state => state.memoryReducer.sessions
	);

	return sessions.find(
		session => session.sessionId === activeSessionId
	);
};

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

import {useEffect, useRef} from 'react';
import {stripWhiteSpaceFromText} from '../../utils/clipboard-formatting';
import styles from './memory-grid.module.scss';
import {
	useNumColumns,
	useByteGrouping,
	useEndianness,
	useDisplayFormat,
	useTargetAddress
} from '../../state/slices/app-context/app-context.selector';
import {clearTargetAddress} from '../../state/slices/app-context/app-context.reducer';
import {
	useHaltedSessions,
	useMemoryAddresses,
	useMemoryAscii,
	useMemoryValues,
	useMemoryMetadata,
	useReachedEndOfMemory
} from '../../state/slices/memory/memory.selector';
import {List, type ListImperativeAPI} from 'react-window';
import {useInfiniteLoader} from 'react-window-infinite-loader';
import {appendMemoryData} from '../../state/slices/memory/memory.reducer';
import {useAppDispatch, useAppSelector} from '../../state/store';
import {DATA_INFINITE_CHUNK_SIZE} from '../../constants/data-read';
import MemoryGridRow from '../memory-grid-row/memory-grid-row';

export default function MemoryGrid() {
	const listRef = useRef<ListImperativeAPI>(null);
	const haltedSessions = useHaltedSessions();
	const {address, length} = useMemoryMetadata();
	const numColumns = useNumColumns();
	const byteGrouping = useByteGrouping();
	const endianness = useEndianness();
	const displayFormat = useDisplayFormat();
	const addresses = useMemoryAddresses(numColumns, byteGrouping);
	const dispatch = useAppDispatch();
	const isLoading = useAppSelector(
		state => state.memoryReducer.loading
	);
	const reachedEndOfMemory = useReachedEndOfMemory();
	const targetAddress = useTargetAddress();

	const bytesPerRow = numColumns * byteGrouping;
	const valueRows = useMemoryValues(
		numColumns,
		byteGrouping,
		endianness,
		displayFormat
	);
	const asciiRows = useMemoryAscii(bytesPerRow);
	const onRowsRendered = useInfiniteLoader({
		isRowLoaded: index => addresses[index] !== undefined,
		async loadMoreRows() {
			if (
				haltedSessions.length > 0 &&
				address !== undefined &&
				length !== undefined &&
				!isLoading &&
				!reachedEndOfMemory
			) {
				await dispatch(
					appendMemoryData({
						sessionId: haltedSessions[0]?.sessionId,
						address: address + length,
						length: DATA_INFINITE_CHUNK_SIZE
					})
				);
			}
		},
		rowCount: reachedEndOfMemory ? addresses.length : 10e9,
		threshold: 100
	});

	useEffect(() => {
		if (
			targetAddress !== undefined &&
			address !== undefined &&
			listRef.current
		) {
			const targetRowIndex = Math.floor(
				(targetAddress - address) / bytesPerRow
			);
			listRef.current.scrollToRow({
				index: targetRowIndex,
				align: 'start',
				behavior: 'smooth'
			});
			dispatch(clearTargetAddress());
		}
	}, [targetAddress, address, bytesPerRow, dispatch, listRef]);

	const cleanUpCopiedText = (
		event: React.ClipboardEvent<HTMLDivElement>
	) => {
		event.preventDefault();
		const selection = window.getSelection()?.toString() ?? '';
		event.clipboardData.setData(
			'text/plain',
			stripWhiteSpaceFromText(selection)
		);
	};

	const getRowHeight = (index: number) => (index === 0 ? 36 : 24);

	return (
		<div
			className={styles.gridWrapper}
			data-test='memory-grid'
			onCopy={cleanUpCopiedText}
		>
			<List
				listRef={listRef}
				rowHeight={getRowHeight}
				rowComponent={MemoryGridRow}
				rowCount={addresses.length}
				rowProps={{addresses, valueRows, asciiRows}}
				overscanCount={100}
				onRowsRendered={onRowsRendered}
			/>
		</div>
	);
}

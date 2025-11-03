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

import {
	Button,
	DataGrid,
	DataGridCell,
	DataGridRow
} from 'cfs-react-library';
import styles from './dfg-stream-table.module.scss';
import {useStreams} from '../../../state/slices/gaskets/gasket.selector';
import {to8DigitHex} from '../dfg-canvas/dfg-canvas';
import SmallSettingsIcon from '../../../../../common/components/icons/SamllSettingsIcon';
import {useAppDispatch, useAppSelector} from '../../../state/store';
import {setEditingStream} from '../../../state/slices/gaskets/gasket.reducer';
import {useFilteredStreamsBySourcesAndDest} from '../hooks/useFilteredStreams';

export function DfgStreamTable() {
	const streams = useStreams();
	const dispatch = useAppDispatch();

	const filteredStreams = useFilteredStreamsBySourcesAndDest(streams);

	// Still need these for specific UI logic
	const filteredDestinations = useAppSelector(
		state => state.gasketsReducer.filteredDestinations ?? []
	);
	const searchQuery: string = useAppSelector(
		state => state.gasketsReducer.searchQuery ?? ''
	);

	const columns = [
		{
			header: 'ID',
			gridColumn: '1'
		},
		{
			header: 'Source',
			gridColumn: '2'
		},
		{
			header: 'Destination',
			gridColumn: '3'
		},
		{
			header: 'Index',
			gridColumn: '4'
		},
		{
			header: 'Description',
			gridColumn: '5'
		},
		{
			header: 'Group',
			gridColumn: '6'
		},
		{
			header: 'Buffer Address',
			gridColumn: '7'
		},
		{
			header: 'Buffer Size',
			gridColumn: '8'
		},
		{
			header: '',
			gridColumn: '9'
		}
	];

	return (
		<div>
			<DataGrid
				className={styles.table}
				gridTemplateColumns='4% 8% 8% 8% 16% 8% 22% 22% 4%'
				ariaLabel='Stream table'
				dataTest='stream-table-grid'
			>
				<DataGridRow rowType='header'>
					{columns.map(column => (
						<DataGridCell
							key={column.header}
							cellType='columnheader'
							gridColumn={column.gridColumn}
						>
							<div className={styles['sortable-title']}>
								{column.header}
							</div>
						</DataGridCell>
					))}
				</DataGridRow>
				{filteredStreams.map(stream =>
					// A second stage filter to only show destinations that match the filter
					stream.Destinations.filter(
						dest =>
							filteredDestinations.length === 0 ||
							filteredDestinations.includes(dest.Gasket)
					).map(dest => {
						const key =
							stream.StreamId.toString() + '-' + dest.Gasket;

						return (
							<DataGridRow
								key={key}
								dataTest={'stream-table-row-' + key}
							>
								<DataGridCell
									gridColumn='1'
									className={styles.streamListItemId}
								>
									{stream.StreamId}
								</DataGridCell>
								<DataGridCell gridColumn='2'>
									{stream.Source.Gasket}
								</DataGridCell>
								<DataGridCell gridColumn='3'>
									{dest.Gasket}
								</DataGridCell>
								<DataGridCell gridColumn='4'>
									{stream.Source.Index} &rarr; {dest.Index}
								</DataGridCell>
								<DataGridCell
									gridColumn='5'
									className={styles.streamListItemDescription}
									title={stream.Description}
								>
									{stream.Description}
								</DataGridCell>
								<DataGridCell gridColumn='6'>
									{stream.Group}
								</DataGridCell>
								<DataGridCell gridColumn='7'>
									{to8DigitHex(stream.Source.BufferAddress)} &rarr;{' '}
									{to8DigitHex(dest.BufferAddress)}
								</DataGridCell>
								<DataGridCell gridColumn='8'>
									{stream.Source.BufferSize}B &rarr; {dest.BufferSize}
									B
								</DataGridCell>
								<DataGridCell
									gridColumn='9'
									className={styles.streamListItemButtonCell}
								>
									<Button
										appearance='icon'
										className={styles.streamListItemButton}
										onClick={() => {
											dispatch(setEditingStream(stream));
										}}
									>
										<SmallSettingsIcon />
									</Button>
								</DataGridCell>
							</DataGridRow>
						);
					})
				)}
			</DataGrid>
			{searchQuery && searchQuery.length === 1 ? (
				<div className={styles.message}>
					A minimum of two characters is required to start searching.
				</div>
			) : filteredStreams.length === 0 && streams.length > 0 ? (
				<div className={styles.message}>
					No streams found matching the current filters.
				</div>
			) : null}
		</div>
	);
}

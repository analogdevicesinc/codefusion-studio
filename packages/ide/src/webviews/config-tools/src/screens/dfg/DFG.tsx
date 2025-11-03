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
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsMainLayout';
import {StreamSidebar} from './sidebar/stream-sidebar';
import {StreamConfigSidePanel} from './stream-config/stream-config-sidepanel';
import styles from './dfg-styles.module.scss';
import {Button, SearchInput} from 'cfs-react-library';
import {
	setEditingStream,
	setSearchQuery,
	setStreamView
} from '../../state/slices/gaskets/gasket.reducer';
import {useAppDispatch, useAppSelector} from '../../state/store';
import ViewDropdown, {
	type ViewType
} from './view-dropdown/view-dropdown';
import {GasketConfigSidePanel} from './gasket-config/gasket-config-sidepanel';
import {navigationItems} from '../../../../common/constants/navigation';
import {
	setActiveScreenSubscreen,
	setActiveScreenSubscreens
} from '../../state/slices/app-context/appContext.reducer';
import {useActiveScreenSubscreen} from '../../state/slices/app-context/appContext.selector';
import {useCallback, useEffect} from 'react';
import {DfgStreamTable} from './dfg-stream-table/dfg-stream-table';
import SingleColumnLayout from '../../../../common/components/single-column-layout/single-column-layout';
import {DfgStreamTableFilter} from './dfg-stream-table/dfg-stream-table-filter';
import type {NavigationItem} from '../../../../common/types/navigation';
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';
import {exportCSV} from '../../../../common/api';
import {
	useDfgUI,
	useStreams
} from '../../state/slices/gaskets/gasket.selector';
import {DFGCanvas, to8DigitHex} from './dfg-canvas/dfg-canvas';
import type {DFGStream} from 'cfs-plugins-api';
import {useFilteredStreamsBySourcesAndDest} from './hooks/useFilteredStreams';

// Function to generate CSV content from stream data
function generateStreamTableCSV(
	streams: DFGStream[],
	filteredDestinations: string[]
): string {
	const headers = [
		'ID',
		'Source',
		'Destination',
		'Source Index',
		'Destination Index',
		'Description',
		'Group',
		'Source Buffer Address',
		'Destination Buffer Address',
		'Source Buffer Size',
		'Destination Buffer Size'
	];

	const csvRows = [
		headers.join(','),
		...streams.flatMap(stream =>
			// Apply the same second-stage destination filter as the table
			stream.Destinations.filter(
				dest =>
					filteredDestinations.length === 0 ||
					filteredDestinations.includes(dest.Gasket)
			).map(dest =>
				[
					stream.StreamId,
					`"${stream.Source.Gasket}"`,
					`"${dest.Gasket}"`,
					stream.Source.Index,
					dest.Index,
					`"${stream.Description}"`,
					`"${stream.Group}"`,
					to8DigitHex(stream.Source.BufferAddress),
					to8DigitHex(dest.BufferAddress),
					`${stream.Source.BufferSize}B`,
					`${dest.BufferSize}B`
				].join(',')
			)
		)
	];

	return csvRows.join('\n');
}

export function Dfg({
	initialActiveScreenSubscreen
}: {
	readonly initialActiveScreenSubscreen?: NavigationItem;
}) {
	const dispatch = useAppDispatch();
	const activeScreenSubscreen = useActiveScreenSubscreen();
	const streams = useStreams();
	const filteredStreams = useFilteredStreamsBySourcesAndDest(streams);

	// Get the filtered destinations for the second-stage filter
	const filteredDestinations = useAppSelector(
		state => state.gasketsReducer.filteredDestinations ?? []
	);

	const handleExportCSV = useCallback(async () => {
		try {
			const csvContent = generateStreamTableCSV(
				filteredStreams,
				filteredDestinations
			);
			const result = await exportCSV(csvContent, 'dfg-stream-table');

			if (result) {
				console.log('CSV exported successfully to:', result);
			}
		} catch (error) {
			console.error('Failed to export CSV:', error);
		}
	}, [filteredStreams, filteredDestinations]);

	useEffect(() => {
		dispatch(
			setActiveScreenSubscreens([
				navigationItems.dfgVisualisation,
				navigationItems.dfgStreamList
			])
		);
		dispatch(
			setActiveScreenSubscreen(
				initialActiveScreenSubscreen ??
					navigationItems.dfgVisualisation
			)
		);
	}, [dispatch, initialActiveScreenSubscreen]);

	return activeScreenSubscreen &&
		activeScreenSubscreen === navigationItems.dfgStreamList ? (
		<SingleColumnLayout
			header={
				<div className={styles.headerItems}>
					<div className={styles.headerleft}>
						<DfgStreamTableFilter />
					</div>
					<div className={styles.headerRight}>
						<Button
							id='export-as-csv'
							dataTest='export-as-csv'
							appearance='secondary'
							onClick={handleExportCSV}
						>
							{t({id: 'dfgStreamList.exportAsCsv'})}
						</Button>
						<Button
							id='create-stream-button'
							appearance='primary'
							onClick={() => {
								dispatch(setEditingStream({}));
							}}
						>
							{t({id: 'dfg.createStream'})}
						</Button>
					</div>
				</div>
			}
			body={
				<>
					<div data-test='dfg-stream-list'>
						<DfgStreamTable />
					</div>
					<div className={styles.sidePanelContainer}>
						<StreamConfigSidePanel />
					</div>
				</>
			}
		/>
	) : (
		<div
			data-test='dfg-visualisation'
			className={styles.dfgVisualisation}
		>
			<CfsTwoColumnLayout>
				<div slot='header' className={styles.headerItems}>
					<div className={styles.headerleft}>
						<LeftHeaderItems />
					</div>
					<div className={styles.headerRight}>
						<Button
							id='create-stream-button'
							appearance='primary'
							onClick={() => {
								dispatch(setEditingStream({}));
							}}
						>
							{t({id: 'dfg.createStream'})}
						</Button>
					</div>
				</div>
				<div slot='side-panel'>
					<StreamSidebar />
				</div>
				<DFGCanvas />
				<div slot='header' className={styles.sidePanelContainer}>
					<StreamConfigSidePanel />
					<GasketConfigSidePanel />
				</div>
			</CfsTwoColumnLayout>
		</div>
	);
}

export function LeftHeaderItems() {
	const {streamView} = useDfgUI();
	const dispatch = useAppDispatch();

	const searchQuery = useAppSelector(
		state => state.gasketsReducer.searchQuery ?? ''
	);

	const handleViewChange = (view: ViewType) => {
		dispatch(setStreamView(view));
		console.log('View changed to:', view);
	};

	return (
		<>
			<SearchInput
				inputVal={searchQuery}
				dataTest='dfg-search-input'
				onClear={() => {
					dispatch(setSearchQuery(''));
				}}
				onInputChange={(value: string) => {
					dispatch(setSearchQuery(value));
				}}
			/>
			<ViewDropdown
				selectedView={streamView}
				onViewChange={handleViewChange}
			/>
		</>
	);
}

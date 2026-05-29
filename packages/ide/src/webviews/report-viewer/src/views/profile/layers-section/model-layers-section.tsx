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
import {
	Button,
	InfoIcon,
	TextField,
	Tooltip
} from 'cfs-react-library';
import styles from './model-layers-section.module.scss';
import {useEffect, useState} from 'react';
import {useMessenger} from '@common/contexts/MessengerContext';
import {layerDataRequestMessage} from '@constants/messages/report-view-messages';
import Database from '@common/icons/Database';
import {
	DataTableBody,
	DataTableHeader,
	type SortState
} from './model-layers-table';
import {formatToFixedOrFirstSignificant} from '@common/utils/string';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	type FilterdLayerData,
	type OptimizationOpportunities
} from '@ide-types/report-view-types';

const defaultQuery = 'Select *';

const containerId = 'profiling-model-layer-section';

export function ModelLayersSection({
	reportOptimizations,
	activeSqlQuery,
	setActiveSqlQuery
}: {
	readonly reportOptimizations: OptimizationOpportunities;
	readonly activeSqlQuery: string;
	readonly setActiveSqlQuery: (query: string) => void;
}) {
	const [sqlQuery, setSqlQuery] = useState('');
	const [data, setData] = useState<FilterdLayerData | undefined>();
	const [sortState, setSortState] = useState<SortState | undefined>();
	const [queryError, setQueryError] = useState<string | undefined>(
		undefined
	);

	useEffect(() => {
		setSqlQuery(activeSqlQuery);
	}, [activeSqlQuery]);

	const messenger = useMessenger();

	useEffect(() => {
		messenger
			.sendRequest(
				layerDataRequestMessage,
				{type: 'extension'},
				{query: activeSqlQuery}
			)
			.then(response => {
				console.log('Layer data response:', response);
				setData(response);
				setQueryError(undefined);
			})
			.catch(error => {
				console.error('Error fetching layer data:', error);
				setQueryError(
					(error.message as string) ?? 'An unknown error occurred.'
				);
				setData(undefined);
			});
	}, [activeSqlQuery, setData, messenger]);

	const l10n = useLocaleContext();

	return (
		<div
			className={styles.container}
			id={containerId}
			data-test='model-layers-section'
		>
			<h2 className={styles.sectionTitle}>
				{l10n?.profiling.modelLayers.title}
			</h2>
			<div className={styles.stickyHeaderSection}>
				<TextField
					startSlot={<Database />}
					endSlot={
						<div className={styles.sqlInputEndSlot}>
							{sqlQuery !== defaultQuery && (
								<Button
									appearance='icon'
									onClick={() => {
										setSqlQuery(defaultQuery);
										setActiveSqlQuery(defaultQuery);
									}}
								>
									<span className='codicon codicon-discard' />
								</Button>
							)}
							<Tooltip
								title={l10n?.profiling.modelLayers.sqlHint}
								containerId={containerId}
							>
								<InfoIcon />
							</Tooltip>
						</div>
					}
					inputVal={sqlQuery}
					onInputChange={(val: string) => {
						setSqlQuery(val);
					}}
					onKeyUp={e => {
						if (e.key === 'Enter') {
							setActiveSqlQuery(sqlQuery);
						}
					}}
				/>
				{data && data.rows.length > 0 && (
					<DataTableHeader
						columns={data.columns}
						sortState={sortState}
						setSortState={setSortState}
					/>
				)}
			</div>
			{queryError && (
				<div className={styles.error}>
					{queryError.split('\n').map((line, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<div key={index}>{line}</div>
					))}
				</div>
			)}
			{data && data.rows.length > 0 && (
				<>
					<DataTableBody
						data={data}
						optimizations={reportOptimizations}
						sortState={sortState}
						setActiveSqlQuery={setActiveSqlQuery}
					/>
					<DataInfoFooter data={data} />
				</>
			)}
		</div>
	);
}

function DataInfoFooter({data}: {readonly data: FilterdLayerData}) {
	return (
		<div className={styles.footer}>
			<FooterInfoEntry
				label='Layers Displayed'
				value={data.rows.length.toString()}
			/>
			{data.rows[0].memory_kb !== undefined && (
				<FooterInfoEntry
					label='Peak Memory Usage'
					value={`${Math.max(
						...data.rows.map(row => row.memory_kb ?? 0)
					).toLocaleString()}kb`}
				/>
			)}
			{data.rows[0].cycles !== undefined && (
				<FooterInfoEntry
					label='Total Cycles'
					value={`${data.rows
						.reduce((acc, row) => acc + (row.cycles ?? 0), 0)
						.toLocaleString()}`}
				/>
			)}
			{data.rows[0].latency_ms !== undefined && (
				<FooterInfoEntry
					label='Latency'
					value={`${formatToFixedOrFirstSignificant(data.rows.reduce((acc, row) => acc + (row.latency_ms ?? 0), 0))}ms`}
				/>
			)}
		</div>
	);
}

function FooterInfoEntry({
	label,
	value
}: {
	readonly label: string;
	readonly value: string;
}) {
	return (
		<div className={styles.footerInfoEntry}>
			<h5 className={styles.footerInfoKey}>{label}</h5>
			<span className={styles.footerInfoValue}>{value}</span>
		</div>
	);
}

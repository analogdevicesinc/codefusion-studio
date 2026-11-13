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
	Badge,
	Button,
	DataGrid,
	DataGridCell,
	DataGridRow,
	EmptyState,
	SruInvertedSignalIcon,
	Tooltip
} from 'cfs-react-library';
import styles from './routing-table.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	resetSruConnectionWithUndo,
	configureConnectionFromRouting
} from '../../../state/slices/sru/sru.thunks';
import ConfigIcon16px from '@common/icons/Config16px';
import {
	useFilteredSruConnections,
	useSruRoutingFilter,
	useSruSignalInversions
} from '../../../state/slices/sru/sru.selector';
import {useAppDispatch} from '../../../state/store';
import {AliasedSignalName} from '../common/aliased-signal-name';
import {clearRoutingFilter} from '../../../state/slices/sru/sru.reducer';

export function RoutingTable() {
	const dispatch = useAppDispatch();
	const l10n = useLocaleContext()?.signalRoutingUnit?.routing;

	const entries = useFilteredSruConnections(useSruRoutingFilter());
	const invertedSignals = useSruSignalInversions();

	const isInverted = (signalName: string) =>
		Boolean(invertedSignals[signalName]);

	const renderEmptyState = () => (
		<EmptyState
			dataTest='empty-state'
			type='info'
			title={l10n?.emptyState.noResultsTitle}
			description={l10n?.emptyState.noResultsDescription}
			className={styles.emptyState}
		>
			<div slot='body' className={styles.description}>
				<Button
					appearance='primary'
					dataTest='clear-filters'
					onClick={() => {
						dispatch(clearRoutingFilter());
					}}
				>
					{l10n?.emptyState.clearFilters}
				</Button>
			</div>
		</EmptyState>
	);

	return (
		<DataGrid
			gridTemplateColumns='23% 23% 23% 23% 8%'
			ariaLabel='Signal routing table'
			dataTest='routing-table'
			className={styles.table}
		>
			<DataGridRow
				rowType='header'
				className={`${styles.tableHeader} ${styles.tableRow}`}
			>
				<DataGridCell
					gridColumn='1'
					cellType='columnheader'
					className={styles.tableCell}
				>
					{l10n?.source}
				</DataGridCell>
				<DataGridCell
					gridColumn='2'
					cellType='columnheader'
					className={styles.tableCell}
				>
					{l10n?.destination}
				</DataGridCell>
				<DataGridCell
					gridColumn='3'
					cellType='columnheader'
					className={styles.tableCell}
				>
					{l10n?.description}
				</DataGridCell>
				<DataGridCell
					gridColumn='4'
					cellType='columnheader'
					className={styles.tableCell}
				>
					{l10n?.connectionStatus}
				</DataGridCell>
			</DataGridRow>
			{entries.length === 0
				? renderEmptyState()
				: entries.map(entry => (
						<DataGridRow
							key={entry.input}
							className={styles.tableRow}
						>
							<DataGridCell
								gridColumn='1'
								dataTest='source-cell'
								className={styles.tableCell}
							>
								<AliasedSignalName
									name={entry.output}
									alias={entry.outputAlias}
								/>
							</DataGridCell>
							<DataGridCell
								gridColumn='2'
								dataTest='destination-cell'
								className={styles.tableCell}
							>
								<AliasedSignalName
									name={entry.input}
									alias={entry.inputAlias}
									nameSuffix={
										isInverted(entry.input) && (
											<Tooltip
												type='short'
												title={l10n?.invertedSignal}
											>
												<span className={styles.invertedIconWrapper}>
													<SruInvertedSignalIcon
														height={12}
														width={12}
													/>
												</span>
											</Tooltip>
										)
									}
								/>
							</DataGridCell>
							<DataGridCell
								gridColumn='3'
								className={styles.tableCell}
							>
								{entry.description ?? '--'}
							</DataGridCell>
							<DataGridCell
								gridColumn='4'
								className={styles.tableCell}
							>
								{entry.status === 'default' ? (
									<Badge appearance='secondary'>
										{l10n?.default}
									</Badge>
								) : (
									<Badge appearance='active'>{l10n?.modified}</Badge>
								)}
							</DataGridCell>
							<DataGridCell
								gridColumn='5'
								className={styles.tableCell}
							>
								<div className={styles.rowActions}>
									<Tooltip
										title={l10n?.resetSource ?? ''}
										type='short'
									>
										<Button
											appearance='icon'
											disabled={entry.status === 'default'}
											dataTest={`reset-${entry.input}`}
											className={
												entry.status === 'default'
													? styles.disabled
													: undefined
											}
											onClick={() => {
												dispatch(
													resetSruConnectionWithUndo(entry.input)
												);
											}}
										>
											<span className='codicon codicon-sync' />
										</Button>
									</Tooltip>
									<Tooltip title={l10n?.configure ?? ''} type='short'>
										<Button
											appearance='icon'
											dataTest={`configure-${entry.input}`}
											onClick={() => {
												dispatch(
													configureConnectionFromRouting(entry.input)
												);
											}}
										>
											<ConfigIcon16px />
										</Button>
									</Tooltip>
								</div>
							</DataGridCell>
						</DataGridRow>
					))}
		</DataGrid>
	);
}

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

import emptyComponentStyle from '../../components/empty-table-view/EmptyTableView.module.scss';
import styles from './ModelList.module.scss';
import baseStyles from './BaseAiFusionStyles.module.scss';
import {useEffect, useMemo, useState} from 'react';
import DownFilledArrow from 'cfs-ide/src/webviews/common/icons/DownFilledArrow';
import DownArrow from 'cfs-ide/src/webviews/common/icons/DownArrow';
import {
	useAIModels,
	useCompatibilityState
} from '../../state/slices/ai-tools/aiModel.selector';
import {useAppDispatch} from '../../state/store';
import {
	CompatabilityStatus,
	createNewModel,
	deleteModel,
	editModel,
	setCompatibilityState,
	toggleModelActive
} from '../../state/slices/ai-tools/aiModel.reducer';
import {
	Button,
	DataGrid,
	DataGridCell,
	DataGridRow,
	InfoIcon,
	Tooltip
} from 'cfs-react-library';
import DeleteIcon from '../../../../common/icons/Delete';
import Toggle from '../../../../common/components/toggle/Toggle';
import {EmptyTableView} from '../../components/empty-table-view/EmptyTableView';
import {ModelEditPanel} from './model-editor-view/ModelEditPanel';
import ConfigIcon16px from '../../../../common/icons/Config16px';
import {ConfirmDialog} from '../../../../common/components/confirm-dialog/ConfirmDialog';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {type AIModelWithId} from '../../state/slices/ai-tools/aiModel.reducer';
import ConflictIcon from '../../../../common/icons/Conflict';
import {LocalizedMessage} from '../../../../common/components/l10n/LocalizedMessage';
import {
	type AIBackends,
	AISupportingCore,
	getAICores,
	loadAIBackends
} from '../../utils/ai-tools';
import loaderStyles from '../../components/screen-loader/screen-loader.module.scss';
import ChartIcon from '../../../../common/icons/Chart';
import {analyzeAIModel, validateAIModel} from '../../utils/api';
import {Spinner} from '../../../../common/components/spinner/Spinner';
import CircledCheckmarkIcon from '../../../../common/icons/CircledCheckmark';
import WarningIcon from '../../../../common/icons/Warning';
import ViewSourceIcon from '../../../../common/icons/ViewSource';
import {openFile} from '../../../../common/api';
import {AiSupportingBackend} from '../../../../common/types/ai-fusion-data-model';

const unkownCore: AISupportingCore = {
	Id: 'Unknown Core',
	Name: 'Unknown Core',
	Family: 'Unknown Family',
	Description: 'Unknown Core',
	Memory: []
};

export function ModelList() {
	const dispatch = useAppDispatch();
	const models = useAIModels();
	const aiSupportingCores = getAICores();

	const [aiBackends, setAiBackends] = useState<
		AIBackends | undefined
	>(undefined);

	useEffect(() => {
		void loadAIBackends().then(backends => {
			setAiBackends(backends);
		});
	}, []);

	const i10n = useLocaleContext();

	const [modelToDelete, setModelToDelete] = useState<
		AIModelWithId | undefined
	>();

	const modelsByCore: Map<AISupportingCore, AIModelWithId[]> =
		useMemo(() => {
			const modelsByCore: Map<AISupportingCore, AIModelWithId[]> =
				new Map();
			const coresById = new Map(
				aiSupportingCores.map(core => [
					core.Id + (core.Accelerator ?? ''),
					core
				])
			);
			models.forEach(model => {
				const targetId =
					model.Target.Core + (model.Target.Accelerator ?? '');
				const core = coresById.get(targetId) ?? unkownCore;

				if (modelsByCore.has(core)) {
					modelsByCore.get(core)?.push(model);
				} else {
					modelsByCore.set(core, [model]);
				}
			});

			return modelsByCore;
		}, [aiSupportingCores, models]);

	if (aiBackends === undefined) {
		return (
			<div className={loaderStyles.shimmerBody}>
				<div className={loaderStyles.shimmer} />
			</div>
		);
	}

	if (Object.keys(aiBackends).length === 0) {
		return <MissingCFSAIPackage />;
	}

	return (
		<div className={styles.aiToolsContainer}>
			<div className={`${baseStyles.mainArea} ${styles.page}`}>
				<div className={styles.header}>
					<div>
						<h1 className={baseStyles.pageTitle}>
							{i10n?.aitools.modelList.title}
						</h1>
						<span className={baseStyles.pageTitleDescription}>
							{i10n?.aitools.modelList.description}
						</span>
					</div>
					<div className={styles.configSections}>
						{models.length ? (
							<Button onClick={() => dispatch(createNewModel())}>
								{i10n?.aitools.modelList.addModelButton}
							</Button>
						) : undefined}
					</div>
				</div>
				{models.length ? (
					Array.from(modelsByCore.entries()).map(([core, models]) => (
						<div key={core.Id + (core.Accelerator ?? '')}>
							<h2 className={styles.tableTitle}>{core.Name}</h2>
							<ModelTable
								backend={aiBackends[models[0]?.Backend.Name]}
								models={models}
								onDelete={setModelToDelete}
							/>
						</div>
					))
				) : (
					<div className={styles.emptyComponentContainer}>
						<EmptyTableView
							buttonText={i10n?.aitools.modelList.addModelButton}
							title={i10n?.aitools.modelList.emptyListTitle}
							subtext={i10n?.aitools.modelList.emptyListDescription}
							onAddNew={() => dispatch(createNewModel())}
						/>
					</div>
				)}
			</div>
			<ModelEditPanel />
			<ConfirmDialog
				isOpen={Boolean(modelToDelete)}
				title={i10n?.aitools.modelList.deleteConfirmDialog.title}
				message={i10n?.aitools.modelList.deleteConfirmDialog.message}
				showDialogPreferenceId='cfgtools.views.aiTools.showDeleteConfirmDialog'
				onConfirm={() => {
					setModelToDelete(undefined);

					if (modelToDelete) {
						dispatch(deleteModel(modelToDelete.id));
					}
				}}
				onCancel={() => {
					setModelToDelete(undefined);
				}}
			/>
		</div>
	);
}

type ModelTableProps = {
	readonly models: AIModelWithId[];
	readonly backend: AiSupportingBackend | undefined;
	readonly onDelete: (model: AIModelWithId) => void;
};

function ModelTable({models, backend, onDelete}: ModelTableProps) {
	const [sorted, setSorted] = useState<'asc' | 'desc' | undefined>(
		undefined
	);
	const dispatch = useAppDispatch();

	const columnsLocale =
		useLocaleContext()?.aitools.modelList.tableColumns;

	const sortedModels = useMemo(() => {
		if (!sorted) {
			return models;
		}

		return [...models].sort((a, b) =>
			sorted === 'asc'
				? a.Name.localeCompare(b.Name, 'en-US', {
						numeric: true,
						sensitivity: 'base'
					})
				: b.Name.localeCompare(a.Name, 'en-US', {
						numeric: true,
						sensitivity: 'base'
					})
		);
	}, [models, sorted]);

	return (
		<DataGrid
			gridTemplateColumns={`1fr 100px 1fr ${backend?.AdvancedTools ? '125px' : ''} 150px`}
			className={styles.table}
			dataTest={`${models[0].Target.Core}.${models[0].Target.Accelerator ?? 'none'}-table`}
		>
			<DataGridRow rowType='header' className={styles.headerRow}>
				<DataGridCell gridColumn='1'>
					<div
						className={`${styles['sortable-title']} ${styles[sorted ?? ''] ?? ''} `}
						onClick={() => {
							setSorted(
								sorted
									? sorted === 'asc'
										? 'desc'
										: undefined
									: 'asc'
							);
						}}
					>
						{columnsLocale?.modelName}
						{sorted ? <DownFilledArrow /> : <DownArrow />}
					</div>
				</DataGridCell>
				<DataGridCell
					gridColumn='2'
					className={styles.headerCellWithInfo}
				>
					<span>{columnsLocale?.include}</span>
					<Tooltip title={columnsLocale?.includeTooltip}>
						<InfoIcon />
					</Tooltip>
				</DataGridCell>
				<DataGridCell gridColumn='3'>
					{columnsLocale?.file}
				</DataGridCell>
				{backend?.AdvancedTools && (
					<DataGridCell gridColumn='4'>
						{columnsLocale?.compatibility}
					</DataGridCell>
				)}
				<DataGridCell
					gridColumn={backend?.AdvancedTools ? '5' : '4'}
				/>
			</DataGridRow>
			{sortedModels.map(model => (
				<DataGridRow key={model.Name} className={styles.row}>
					<DataGridCell gridColumn='1'>
						<div className={styles.tableText}>{model.Name}</div>
					</DataGridCell>
					<DataGridCell gridColumn='2'>
						<Toggle
							dataTest={`include-toggle-${model.Name}`}
							isToggledOn={model.Enabled}
							handleToggle={() => {
								dispatch(toggleModelActive({model}));
							}}
						/>
					</DataGridCell>
					<DataGridCell
						gridColumn='3'
						className={styles.truncatedCell}
						title={model.Files?.Model ?? ''}
					>
						<div className={styles.tableText}>
							{model.Files?.Model ?? ''}
						</div>
					</DataGridCell>
					{backend?.AdvancedTools && (
						<DataGridCell gridColumn='4'>
							<CompatibilityStateView model={model} />
						</DataGridCell>
					)}
					<DataGridCell
						gridColumn={backend?.AdvancedTools ? '5' : '4'}
					>
						<ActionButtons
							model={model}
							backend={backend}
							onDelete={onDelete}
						/>
					</DataGridCell>
				</DataGridRow>
			))}
		</DataGrid>
	);
}

function MissingCFSAIPackage() {
	const l10n = useLocaleContext();

	return (
		<div
			className={`${styles.emptyPackageError} ${emptyComponentStyle.container}`}
		>
			<ConflictIcon />
			<div className={emptyComponentStyle.textArea}>
				<h4>{l10n?.aitools.modelList.missingPackageTitle}</h4>
				<span>
					<LocalizedMessage
						parseHtml
						id='aitools.modelList.missingPackageDescription'
					/>
				</span>
			</div>
		</div>
	);
}

type ActionButtonsProps = {
	readonly model: AIModelWithId;
	readonly backend: AiSupportingBackend | undefined;
	readonly onDelete: (model: AIModelWithId) => void;
};

function ActionButtons({
	model,
	backend,
	onDelete
}: ActionButtonsProps) {
	const dispatch = useAppDispatch();
	const compatibilityState = useCompatibilityState(model.id);
	const [runningAnalysis, setRunningAnalysis] =
		useState<boolean>(false);

	const l10n = useLocaleContext()?.aitools.modelList.actions;

	return (
		<div className={styles.actions}>
			{compatibilityState?.reportPath && (
				<Tooltip
					title={l10n?.openCompatReport}
					type='short'
					width={140}
				>
					<Button
						appearance='icon'
						onClick={() => {
							openFile(compatibilityState.reportPath ?? '');
						}}
					>
						<ViewSourceIcon />
					</Button>
				</Tooltip>
			)}
			{backend?.AdvancedTools && (
				<Tooltip
					title={
						runningAnalysis
							? 'Running Profiling'
							: 'Open Profiling Report'
					}
					width={110}
				>
					<Button
						appearance='icon'
						onClick={() => {
							if (runningAnalysis) {
								return;
							}

							setRunningAnalysis(true);
							analyzeAIModel(model).then(() => {
								setRunningAnalysis(false);
							});
						}}
					>
						{runningAnalysis ? <Spinner /> : <ChartIcon />}
					</Button>
				</Tooltip>
			)}
			<Tooltip title='Delete' type='short' width={50}>
				<Button
					appearance='icon'
					onClick={() => {
						onDelete(model);
					}}
				>
					<DeleteIcon />
				</Button>
			</Tooltip>
			<Tooltip title='Edit' type='short' width={50}>
				<Button
					appearance='icon'
					onClick={() => dispatch(editModel(model))}
				>
					<ConfigIcon16px />
				</Button>
			</Tooltip>
		</div>
	);
}

type CompatibilityStateViewProps = {
	model: AIModelWithId;
};

function CompatibilityStateView({
	model
}: CompatibilityStateViewProps) {
	const state = useCompatibilityState(model.id)?.state;
	const dispatch = useAppDispatch();
	const l10n = useLocaleContext()?.aitools.modelList.compatibility;

	useEffect(() => {
		if (!state) {
			dispatch(
				setCompatibilityState({
					modelId: model.id,
					status: CompatabilityStatus.Running
				})
			);

			validateAIModel(model)
				.then(result => {
					dispatch(
						setCompatibilityState({
							modelId: model.id,
							status: result.isValid
								? CompatabilityStatus.Compatible
								: CompatabilityStatus.Incompatible,
							reportPath: result.reportPath
						})
					);
				})
				.catch(() => {
					dispatch(
						setCompatibilityState({
							modelId: model.id,
							status: CompatabilityStatus.Error
						})
					);
				});
		}
	}, [state, model]);

	return (
		<div className={styles.compatibilityState}>
			{state === CompatabilityStatus.Compatible && (
				<>
					<span>{l10n?.compatible}</span>
					<CircledCheckmarkIcon />
				</>
			)}
			{state === CompatabilityStatus.Incompatible && (
				<>
					<WarningIcon />
					<span>{l10n?.incompatible}</span>
				</>
			)}
			{state === CompatabilityStatus.Running && (
				<>
					<Spinner />
					<span>{l10n?.checking}</span>
				</>
			)}
			{state === CompatabilityStatus.Error && (
				<>
					<ConflictIcon />
					<span>{l10n?.error}</span>
				</>
			)}
		</div>
	);
}

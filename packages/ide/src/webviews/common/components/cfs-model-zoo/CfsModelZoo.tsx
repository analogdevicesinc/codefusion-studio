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
	InlineMessage,
	MultiSelect,
	type MultiSelectOption,
	SearchInput,
	Tooltip
} from 'cfs-react-library';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import type {ModelData} from '../../types/model-zoo-data';
import {
	createHighlightForElements,
	isHighlightsAPISupported
} from '../../utils/highlightApi';
import CloseIcon from '../icons/CloseIcon';
import {Spinner} from '../spinner/Spinner';
import {CfsModelSummaryCard} from './CfsModelSummaryCard';
import styles from './CfsModelZoo.module.scss';
import {fetchModelZooData} from './model-zoo-utils';
import {getLocalization} from '../../utils/localization';

const highlightGroup = 'search-highlight';

type CoreFilterOption = {
	socs: string[];
} & MultiSelectOption;

export type ModelZooSelectionData = {
	readonly model: ModelData;
	readonly quantization: string;
};

export type CfsModelZooProps = {
	readonly isOpen: boolean;
	readonly defaultSocFilter?: string[];
	readonly defaultCoreFilter?: string[];
	readonly defaultCategoryFilter?: string[];
	readonly initialModelSelection?: ModelZooSelectionData;
	readonly onClose: () => void;
	readonly onModelSelected: (model: ModelZooSelectionData) => void;
	readonly onLocalFileSelected: (filePath: string) => void;
	/**
	 * Function used to get preferences from the host environment.
	 */
	readonly getPreference: (id: string) => Promise<any>;
	/**
	 * Function used to open a file picker in the host environment.
	 */
	readonly selectFile: (options?: {
		title?: string;
		filters?: Record<string, string[]>;
		relativeToWorkspaceRoot?: boolean;
	}) => Promise<string | undefined>;
};

function getSearchText(model: ModelData): string {
	const tagLikeFields = [model.task, model.taskType, model.framework];

	return [model.name, model.displayName ?? '', ...tagLikeFields]
		.join(' ')
		.toLowerCase();
}

export function CfsModelZoo({
	isOpen,
	defaultSocFilter,
	defaultCoreFilter,
	defaultCategoryFilter,
	initialModelSelection,
	onClose,
	onModelSelected,
	onLocalFileSelected,
	getPreference,
	selectFile
}: CfsModelZooProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [modelZooData, setModelZooData] = useState<ModelData[]>();
	const [searchQuery, setSearchQuery] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const [filters, setFilters] = useState({
		socs: defaultSocFilter ?? [],
		cores: defaultCoreFilter ?? [],
		taskTypes: defaultCategoryFilter ?? []
	});
	const [selectedModel, setSelectedModel] = useState<
		ModelZooSelectionData | undefined
	>(initialModelSelection);
	const [showSelectError, setShowSelectError] = useState(false);

	const l10n = getLocalization('model-zoo');

	useEffect(() => {
		(async () => {
			setModelZooData(await fetchModelZooData(getPreference));
		})();
	}, [getPreference]);

	const wasOpenRef = useRef(false);
	useEffect(() => {
		// Only run when opening the dialog and not while using it
		if (isOpen && !wasOpenRef.current) {
			setSelectedModel(undefined);
			setFilters({
				socs: defaultSocFilter ?? [],
				cores: defaultCoreFilter ?? [],
				taskTypes: defaultCategoryFilter ?? []
			});
			setSelectedModel(initialModelSelection);
			setShowSelectError(false);
		}

		wasOpenRef.current = isOpen;
	}, [
		isOpen,
		defaultSocFilter,
		defaultCoreFilter,
		defaultCategoryFilter,
		initialModelSelection
	]);

	const filteredModels = useMemo(() => {
		if (!modelZooData) {
			return [];
		}

		const query = searchQuery.trim().toLowerCase();
		const hasSocFilter = filters.socs.length > 0;
		const hasCoreFilter = filters.cores.length > 0;
		const hasCategoryFilter = filters.taskTypes.length > 0;

		return modelZooData.filter(model => {
			if (query && !getSearchText(model).includes(query)) {
				return false;
			}

			if (
				hasCategoryFilter &&
				!filters.taskTypes.includes(model.taskType)
			) {
				return false;
			}

			if (!hasSocFilter && !hasCoreFilter) {
				return true;
			}

			return model.supportedPlatforms.some(
				platform =>
					(!hasSocFilter || filters.socs.includes(platform.soc)) &&
					(!hasCoreFilter || filters.cores.includes(platform.core))
			);
		});
	}, [modelZooData, searchQuery, filters]);

	const platformFilterOptions = useMemo(() => {
		const platforms = new Map<string, MultiSelectOption>();

		defaultSocFilter?.forEach(soc => {
			platforms.set(soc, {value: soc, label: soc});
		});

		for (const model of modelZooData ?? []) {
			for (const platform of model.supportedPlatforms) {
				platforms.set(platform.soc, {
					value: platform.soc,
					label: platform.soc
				});
			}
		}

		return Array.from(platforms.values());
	}, [modelZooData, defaultSocFilter]);

	const coreFilterOptions = useMemo(() => {
		const cores = new Map<string, CoreFilterOption>();

		defaultCoreFilter?.forEach(core => {
			cores.set(core, {value: core, label: core, socs: []});
		});

		for (const model of modelZooData ?? []) {
			for (const platform of model.supportedPlatforms) {
				const {core} = platform;

				if (cores.has(core)) {
					cores.get(core)?.socs.push(platform.soc);
				} else {
					cores.set(core, {
						value: core,
						label: core,
						socs: [platform.soc]
					});
				}
			}
		}

		// Disable cores that don't have any socs in the current soc filter
		return Array.from(cores.values()).map(core => ({
			...core,
			disabled:
				filters.socs.length > 0 &&
				!core.socs.some(soc => filters.socs.includes(soc))
		}));
	}, [modelZooData, filters.socs, defaultCoreFilter]);

	const selectedSocOptions = useMemo(
		() =>
			filters.socs.map(
				platformId =>
					platformFilterOptions.find(p => p.value === platformId) ?? {
						value: platformId,
						label: platformId
					}
			),
		[filters.socs, platformFilterOptions]
	);

	const selectedCoreOptions = useMemo(
		() =>
			filters.cores.map(
				coreId =>
					coreFilterOptions.find(c => c.value === coreId) ?? {
						value: coreId,
						label: coreId
					}
			),
		[filters.cores, coreFilterOptions]
	);

	const categoryFilterOptions = useMemo(() => {
		const categories = new Map<string, MultiSelectOption>();

		defaultCategoryFilter?.forEach(category => {
			categories.set(category, {value: category, label: category});
		});

		for (const model of modelZooData ?? []) {
			categories.set(model.taskType, {
				value: model.taskType,
				label: model.taskType
			});
		}

		return Array.from(categories.values());
	}, [modelZooData, defaultCategoryFilter]);

	const selectedCategoryOptions = useMemo(
		() =>
			filters.taskTypes.map(
				taskType =>
					categoryFilterOptions.find(c => c.value === taskType) ?? {
						value: taskType,
						label: taskType
					}
			),
		[filters.taskTypes, categoryFilterOptions]
	);

	useEffect(() => {
		const dialog = dialogRef.current;

		if (!dialog) {
			return;
		}

		if (isOpen) {
			dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}

		return () => {
			if (dialog.open) {
				dialog.close();
			}
		};
	}, [isOpen]);

	useLayoutEffect(() => {
		if (!isHighlightsAPISupported()) {
			return;
		}

		CSS.highlights.delete(highlightGroup);

		if (!isOpen || !searchQuery.trim() || !containerRef.current) {
			return;
		}

		const highlightableElements =
			containerRef.current.getElementsByClassName(
				styles.highlightable as string
			);

		const highlight = createHighlightForElements(
			highlightableElements,
			searchQuery
		);

		CSS.highlights.set(highlightGroup, highlight);
	}, [isOpen, searchQuery, filteredModels]);

	const handleBrowseLocalFile = useCallback(async () => {
		const filePath = await selectFile({
			title: l10n?.browse?.selectFileTitle,
			filters: {files: ['*']},
			relativeToWorkspaceRoot: true
		});

		if (filePath) {
			onLocalFileSelected(filePath);
			onClose();
		}
	}, [l10n, onLocalFileSelected, onClose, selectFile]);

	return (
		<dialog
			ref={dialogRef}
			className={styles.dialog}
			aria-modal='true'
			aria-labelledby='model-zoo-title'
			data-test='cfs-model-zoo'
			onCancel={event => {
				event.preventDefault();
				onClose();
			}}
			onClick={event => {
				if (event.target === dialogRef.current) {
					onClose();
				}
			}}
		>
			<div className={styles.innerDialog}>
				<div className={styles.dialogHeader}>
					<h2 id='model-zoo-title' className={styles.dialogTitle}>
						{l10n?.title}{' '}
						<Tooltip position='bottom' title={l10n?.description}>
							<InfoIcon />
						</Tooltip>
					</h2>
					<Button
						appearance='icon'
						className={styles.closeButton}
						ariaLabel={l10n?.closeButtonAriaLabel}
						dataTest='model-zoo-close'
						onClick={onClose}
					>
						<CloseIcon />
					</Button>
				</div>

				<div ref={containerRef} className={styles.dialogBody}>
					<div className={styles.toolbar}>
						<div className={styles.searchInputContainer}>
							<SearchInput
								inputVal={searchQuery}
								placeholder={l10n?.search?.placeholder}
								dataTest='model-zoo-search'
								onClear={() => {
									setSearchQuery('');
								}}
								onInputChange={value => {
									setSearchQuery(value);
								}}
							/>
						</div>
						<div className={styles.filtersContainer}>
							<MultiSelect
								dropdownText={l10n?.filter?.platforms}
								chipText={
									filters.socs.length > 0
										? filters.socs.length.toString()
										: undefined
								}
								alignment='right'
								variant='filter'
								options={platformFilterOptions}
								initialSelectedOptions={selectedSocOptions}
								dataTest='model-zoo-soc-filter'
								onSelection={options => {
									setShowSelectError(false);
									setFilters(prev => ({
										...prev,
										socs: options.map(option => option.value)
									}));
								}}
							/>
							<MultiSelect
								dropdownText={l10n?.filter?.cores}
								chipText={
									filters.cores.length > 0
										? filters.cores.length.toString()
										: undefined
								}
								alignment='right'
								variant='filter'
								options={coreFilterOptions}
								initialSelectedOptions={selectedCoreOptions}
								dataTest='model-zoo-core-filter'
								onSelection={selection => {
									setFilters(prev => ({
										...prev,
										cores: selection.map(option => option.value)
									}));
								}}
							/>
							<MultiSelect
								dropdownText={l10n?.filter?.category}
								chipText={
									filters.taskTypes.length > 0
										? filters.taskTypes.length.toString()
										: undefined
								}
								alignment='right'
								variant='filter'
								options={categoryFilterOptions}
								initialSelectedOptions={selectedCategoryOptions}
								dataTest='model-zoo-category-filter'
								onSelection={selection => {
									setFilters(prev => ({
										...prev,
										taskTypes: selection.map(option => option.value)
									}));
								}}
							/>
						</div>
					</div>
					{showSelectError && (
						<div className={styles.selectErrorContainer}>
							<InlineMessage type='error'>
								<p className={styles.selectErrorText}>
									{l10n?.noModelSelectedError}
								</p>
							</InlineMessage>
						</div>
					)}
					<div className={styles.contentContainer}>
						{modelZooData ? (
							filteredModels.length > 0 ? (
								filteredModels.map(model => (
									<CfsModelSummaryCard
										key={model.uniqueId}
										model={model}
										filters={filters}
										highlightClassName={styles.highlightable}
										selected={
											selectedModel?.model.uniqueId === model.uniqueId
										}
										selectedQuantization={
											selectedModel?.model.uniqueId === model.uniqueId
												? selectedModel?.quantization
												: undefined
										}
										setSelected={quantization => {
											setSelectedModel({model, quantization});
										}}
									/>
								))
							) : (
								<div
									className={styles.emptyState}
									data-test='model-zoo-empty'
								>
									{l10n?.search?.noResults}
								</div>
							)
						) : (
							<div
								className={styles.loadingState}
								data-test='model-zoo-loading'
							>
								<Spinner />
							</div>
						)}
					</div>
					<div className={styles.footer}>
						<Button
							dataTest='model-zoo-use-model'
							onClick={() => {
								if (selectedModel) {
									onModelSelected(selectedModel);
									onClose();
								} else {
									setShowSelectError(true);
								}
							}}
						>
							{l10n?.browse?.useSelectedModel}
						</Button>
						<Button
							className={styles.browseLocalButton}
							appearance='secondary'
							dataTest='model-zoo-browse-local'
							onClick={handleBrowseLocalFile}
						>
							{l10n?.browse?.localFileButton}
						</Button>
					</div>
				</div>
			</div>
		</dialog>
	);
}

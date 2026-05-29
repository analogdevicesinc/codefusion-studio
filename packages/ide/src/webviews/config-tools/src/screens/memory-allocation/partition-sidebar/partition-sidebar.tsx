/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {Button, SlidingPanel, CfsSuspense} from 'cfs-react-library';
import styles from './partition-sidebar.module.scss';
import {useAppDispatch} from '../../../state/store';
import {useEffect, useMemo, useState} from 'react';
import {
	createPartition,
	editPartition,
	removePartition,
	updateActivePartition,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {PartitionDetails} from '../partition-details/PartitionDetails';
import {AssignedCoresSelector} from '../assigned-cores/assigned-cores-selector';
import {MemoryBlocks} from '../memory-blocks/MemoryBlocks';
import type {ControlCfg, MemoryBlock} from '@common/types/soc';
import {getCoreMemoryBlocks} from '../../../utils/memory';
import {
	useActivePartitionConfig,
	useActivePartitionProjects,
	usePartitions,
	useSidebarState
} from '../../../state/slices/partitions/partitions.selector';
import {validatePartitionForm} from '../../../utils/memory-validation';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {getControlsForProjectIds} from '../../../utils/api';
import {PluginOptionsSection} from '../plugin-options-section/plugin-options-section';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';
import DeleteIcon from '../../../../../common/icons/Delete';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import {validatePluginOptions} from '../../../utils/plugin-options-validation';
import {getAllPluginOptions} from '../../../utils/plugin-options';

type PartitionSidebarProps = {
	readonly isFormTouched: boolean;
	readonly onClose: () => void;
	readonly onFormTouched: (touched: boolean) => void;
};

function addDefaultPluginOptionValues(
	activePartition: Partition,
	pluginOptions: Record<string, Record<string, ControlCfg[]>>
) {
	// Any missing properties in config should be added from pluginOptions with default values.
	const partition = {
		...activePartition
	};

	Object.entries(pluginOptions).forEach(([projectId, controls]) => {
		if (partition.projects.find(p => p.projectId === projectId)) {
			partition.config = {...(partition.config ?? {})};
			partition.config[projectId] = {
				...(partition.config[projectId] ?? {})
			};

			controls.memory?.forEach(control => {
				if (
					!control.Condition ||
					evaluateCondition(
						{projectId, ...partition.config![projectId]},
						control.Condition
					)
				) {
					if (
						partition.config![projectId][control.Id] === undefined
					) {
						partition.config![projectId][control.Id] =
							control.Hint ??
							(control.Type === 'boolean' ? 'FALSE' : '');
					}
				}
			});
		}
	});

	return partition;
}

export function PartitionSidebar({
	isFormTouched,
	onClose,
	onFormTouched
}: PartitionSidebarProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const partitions = usePartitions();
	const dispatch = useAppDispatch();
	const memoryBlocks: MemoryBlock[] = getCoreMemoryBlocks();
	const {sidebarPartition, isSidebarMinimised, activePartition} =
		useSidebarState();
	const projects = useActivePartitionProjects();
	const config = useActivePartitionConfig();

	// Existing partitions have a name.
	const existingPartition = Boolean(sidebarPartition.displayName);
	// Plugin options metadata.
	const [pluginOptions, setPluginOptions] = useState<
		Record<string, Record<string, ControlCfg[]>>
	>({});

	const blocksForType = useMemo(
		() =>
			memoryBlocks.filter(
				block => block.Type === activePartition?.type
			),
		[memoryBlocks, activePartition?.type]
	);

	const updateActivePartitionDetails = (
		partitionDetails: Partition
	): void => {
		if (activePartition) {
			dispatch(updateActivePartition(partitionDetails));
		}
	};

	const formValidationState = useMemo(() => {
		if (!activePartition || !isFormTouched) {
			return {
				valid: false,
				errors: {
					displayName: '',
					blocks: '',
					type: '',
					cores: '',
					startAddress: '',
					size: ''
				}
			};
		}

		return validatePartitionForm(
			activePartition,
			partitions.filter(
				partition =>
					parseInt(partition.startAddress, 16) !==
					parseInt(sidebarPartition.startAddress, 16)
			),
			blocksForType
		);
	}, [
		sidebarPartition,
		activePartition,
		blocksForType,
		partitions,
		isFormTouched
	]);

	useEffect(() => {
		for (const project of projects ?? []) {
			if (!pluginOptions[project.projectId]) {
				void getControlsForProjectIds(
					[project.projectId],
					CONTROL_SCOPES.MEMORY
				).then(controls => {
					setPluginOptions({
						...pluginOptions,
						[project.projectId]: controls
					});
				});
			}
		}
	}, [projects, pluginOptions]);

	const allPluginOptions = useMemo(
		() => getAllPluginOptions(config, pluginOptions, projects),
		[config, pluginOptions, projects]
	);

	const pluginOptionsAreValid = useMemo(() => {
		const projectIdList = Object.keys(pluginOptions);

		for (const projectId of projectIdList) {
			const config = allPluginOptions[projectId];
			const pluginControls = pluginOptions[projectId].memory ?? [];
			const pluginOptionsErrors = validatePluginOptions(
				config,
				pluginControls
			);

			if (Object.keys(pluginOptionsErrors).length > 0) {
				return false;
			}
		}

		return true;
	}, [allPluginOptions, pluginOptions]);

	const partitionTitle = useMemo(
		() => (
			<div
				data-test='partition-title'
				className={styles.titleContainer}
			>
				{existingPartition
					? i10n?.partition.editTitle
					: i10n?.partition.createTitle}
				{existingPartition && (
					<Button
						appearance='icon'
						dataTest='delete-partition-button'
						onClick={() => {
							dispatch(
								removePartition({
									startAddress: sidebarPartition.startAddress
								})
							);
							onClose();
						}}
					>
						<DeleteIcon />
					</Button>
				)}
			</div>
		),
		[
			existingPartition,
			i10n?.partition.editTitle,
			i10n?.partition.createTitle,
			dispatch,
			sidebarPartition.startAddress,
			onClose
		]
	);

	return (
		<SlidingPanel
			title={partitionTitle}
			isMinimised={isSidebarMinimised}
			closeSlider={onClose}
			dataTest='partition-sidebar'
			footer={
				<div className={styles.footerContainer}>
					<Button
						className={styles.btn}
						dataTest='create-partition-button'
						onClick={() => {
							if (!activePartition) {
								return;
							}

							if (!isFormTouched) {
								if (
									validatePartitionForm(
										activePartition,
										partitions.filter(
											partition =>
												parseInt(partition.startAddress, 16) !==
												parseInt(sidebarPartition.startAddress, 16)
										),
										blocksForType
									).valid &&
									pluginOptionsAreValid
								) {
									if (existingPartition) {
										dispatch(
											editPartition({
												sidebarPartition: activePartition,
												startAddress: sidebarPartition.startAddress
											})
										);
									} else {
										const partition = addDefaultPluginOptionValues(
											activePartition,
											pluginOptions
										);
										dispatch(createPartition(partition));
									}

									onClose();
								} else {
									onFormTouched(true);
								}
							} else if (
								formValidationState.valid &&
								pluginOptionsAreValid
							) {
								if (existingPartition) {
									dispatch(
										editPartition({
											sidebarPartition: activePartition,
											startAddress: sidebarPartition.startAddress
										})
									);
								} else {
									const partition = addDefaultPluginOptionValues(
										activePartition,
										pluginOptions
									);
									dispatch(createPartition(partition));
								}

								onClose();
							}
						}}
					>
						{existingPartition
							? i10n?.partition.updateBtn
							: i10n?.partition.createBtn}
					</Button>
				</div>
			}
		>
			{activePartition && (
				<>
					<PartitionDetails errors={formValidationState.errors} />
					<AssignedCoresSelector
						errors={formValidationState.errors}
						onCoreChange={cores => {
							updateActivePartitionDetails({
								...activePartition,
								projects: cores
							});
						}}
					/>
					{activePartition.projects.length > 0 ? (
						<CfsSuspense fallbackPosition='center'>
							<PluginOptionsSection
								pluginOptions={pluginOptions}
								allOptions={allPluginOptions}
							/>
						</CfsSuspense>
					) : (
						<div className={styles.section}>
							<h3>{i10n?.partition['plugin-options']}</h3>
							<ConfigUnavailable
								message={i10n?.partition['missing-assignment']}
							/>
						</div>
					)}
					<MemoryBlocks
						// @TODO: This is a work around for the vsCodeDropdown bug. Needs check when new UI framework is implemented.
						partition={
							!activePartition.type && sidebarPartition.type
								? sidebarPartition
								: activePartition
						}
						errors={formValidationState.errors}
						isFormTouched={isFormTouched}
						blocksForType={blocksForType}
						onChange={value => {
							updateActivePartitionDetails({
								...activePartition,
								...value
							});
						}}
					/>
				</>
			)}
		</SlidingPanel>
	);
}

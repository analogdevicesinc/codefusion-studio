/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import CheckmarkIcon from '@common/icons/Checkmark';
import {useAppDispatch} from '../../../state/store';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
	createPartition,
	editPartition,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {PartitionDetails} from '../partition-details/PartitionDetails';
import {AssignedCoresSection} from '../assigned-cores/AssignedCores';
import {MemoryBlocks} from '../memory-blocks/MemoryBlocks';
import type {ControlCfg, MemoryBlock} from '@common/types/soc';
import {getCoreMemoryBlocks} from '../../../utils/memory';
import {
	usePartitions,
	useSidebarState
} from '../../../state/slices/partitions/partitions.selector';
import {validatePartitionForm} from '../../../utils/memory-validation';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {getControlsForProjectIds} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {PluginOptionsSection} from '../plugin-options-section/plugin-options-section';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';

type PartitionSidebarProps = {
	readonly isFormTouched: boolean;
	readonly partition?: Partition;
	readonly onClose: () => void;
	readonly onFormTouched: (touched: boolean) => void;
};

export function PartitionSidebar({
	isFormTouched,
	partition,
	onClose,
	onFormTouched
}: PartitionSidebarProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const partitions = usePartitions();
	const dispatch = useAppDispatch();
	const memoryBlocks: MemoryBlock[] = getCoreMemoryBlocks();
	const [activePartition, setActivePartition] = useState<
		Partition | undefined
	>();
	const {sidebarPartition, isSidebarMinimised} = useSidebarState();

	const pluginConfig = useRef<
		Record<string, Record<string, string | number | boolean>>
	>({});
	const blocksForType = useMemo(
		() =>
			memoryBlocks.filter(
				block => block.Type === activePartition?.type
			),
		[memoryBlocks, activePartition?.type]
	);

	useEffect(() => {
		pluginConfig.current = {};
	}, [sidebarPartition]);

	useEffect(() => {
		setActivePartition(partition);
	}, [partition]);

	const updateActivePartitionDetails = (
		partitionDetails: Partition
	): void => {
		if (activePartition) {
			setActivePartition({
				...partitionDetails,
				config:
					Object.values(pluginConfig.current).length === 0
						? partitionDetails.config
						: pluginConfig.current
			});
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

	const pluginOptionsPromise = useMemo(async () => {
		if (!(activePartition?.projects ?? []).length) {
			return Promise.resolve([
				{
					controls: {} satisfies Record<string, ControlCfg[]>,
					projectId: ''
				}
			]);
		}

		return Promise.all(
			(activePartition?.projects ?? []).map(async project => ({
				controls: await getControlsForProjectIds(
					[project.projectId],
					CONTROL_SCOPES.MEMORY
				),
				projectId: project.projectId
			}))
		);
	}, [activePartition?.projects]);

	return (
		<SlidingPanel
			title={
				sidebarPartition.type
					? i10n?.partition.edit
					: i10n?.partition.create
			}
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

							const partitionDetails = activePartition.config
								? {...activePartition, config: pluginConfig.current}
								: activePartition;

							if (!isFormTouched) {
								if (
									validatePartitionForm(
										partitionDetails,
										partitions.filter(
											partition =>
												parseInt(partition.startAddress, 16) !==
												parseInt(sidebarPartition.startAddress, 16)
										),
										blocksForType
									).valid
								) {
									if (sidebarPartition.startAddress) {
										dispatch(
											editPartition({
												sidebarPartition: partitionDetails,
												startAddress: sidebarPartition.startAddress
											})
										);
									} else {
										dispatch(createPartition(partitionDetails));
									}

									onClose();
								} else {
									onFormTouched(true);
								}
							} else if (formValidationState.valid) {
								if (sidebarPartition.startAddress) {
									dispatch(
										editPartition({
											sidebarPartition: partitionDetails,
											startAddress: sidebarPartition.startAddress
										})
									);
								} else {
									dispatch(createPartition(partitionDetails));
								}

								onClose();
							}
						}}
					>
						<CheckmarkIcon />{' '}
						{sidebarPartition.type
							? i10n?.partition.edit
							: i10n?.partition.create}
					</Button>
				</div>
			}
		>
			{activePartition && (
				<>
					<PartitionDetails
						displayName={activePartition.displayName}
						type={activePartition.type}
						errors={formValidationState.errors}
						onNameChange={name => {
							updateActivePartitionDetails({
								...activePartition,
								displayName: name
							});
						}}
						onTypeChange={type => {
							pluginConfig.current = {};
							updateActivePartitionDetails({
								type,
								displayName: activePartition.displayName,
								projects: [],
								startAddress: '',
								size: 0,
								blockNames: [],
								baseBlock: {
									Name: '',
									Description: '',
									AddressStart: '',
									AddressEnd: '',
									Width: 0,
									MinimumAlignment: undefined,
									Access: '',
									Location: '',
									Type: '',
									TrustZone: undefined
								},
								config: {}
							});
						}}
					/>
					<AssignedCoresSection
						assignedCores={activePartition.projects}
						memoryType={activePartition.type}
						errors={formValidationState.errors}
						onCoreChange={cores => {
							updateActivePartitionDetails({
								...activePartition,
								projects:
									cores.length === 1
										? [{...cores[0], owner: true}]
										: cores
							});
						}}
					/>
					{activePartition.projects.length > 0 ? (
						<CfsSuspense fallbackPosition='center'>
							<PluginOptionsSection
								config={activePartition.config}
								pluginOptionsPromise={pluginOptionsPromise}
								onChange={(projectId, controlId, value) => {
									const currentConfig = pluginConfig.current;
									pluginConfig.current = {
										...activePartition.config,
										...currentConfig,
										[projectId]: {
											...activePartition.config?.[projectId],
											...currentConfig[projectId],
											[controlId]: value
										}
									};
								}}
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

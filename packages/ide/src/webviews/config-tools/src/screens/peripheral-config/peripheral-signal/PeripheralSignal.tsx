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
import {memo, useCallback, useEffect, useState} from 'react';
import styles from './PeripheralSignal.module.scss';
import Core from '../core/Core';
import DeleteIcon from '../../../../../common/icons/Delete';
import {PlusIcon} from 'cfs-react-library';
import {useAppDispatch} from '../../../state/store';
import {
	removePeripheralAssignment,
	removeSignalAssignment,
	setActivePeripheral,
	setActiveSignal,
	setAllocationConfig
} from '../../../state/slices/peripherals/peripherals.reducer';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import {type FormattedPeripheralSignal} from '../../../../../common/types/soc';
import {setProjectSelectionView} from '../../../state/slices/app-context/appContext.reducer';

export type PeripheralSignalProps = Readonly<{
	name: string;
	peripheral: string;
	isGrouped?: boolean;
	isSecure?: string;
	signals: Record<string, FormattedPeripheralSignal>;
	signal?: string;
	isSignalAssigned: boolean;
	projects: string[];
	isSelected?: boolean;
	allocatedCoreId?: string;
	onClick?: () => void;
}>;

function PeripheralSignal({
	name,
	peripheral,
	signal,
	projects,
	isGrouped,
	isSecure,
	signals,
	isSignalAssigned,
	isSelected,
	allocatedCoreId,
	onClick
}: PeripheralSignalProps) {
	const dispatch = useAppDispatch();

	const [deleteHovered, setDeleteHovered] = useState(false);
	const [editHovered, setEditHovered] = useState(false);
	const [allocateHovered, setAllocateHovered] = useState(false);

	const handleDelete = async () => {
		if (peripheral && signal) {
			dispatch(
				removeSignalAssignment({
					peripheral,
					signalName: signal
				})
			);
			dispatch(setActiveSignal(undefined));
		}

		if (peripheral && !signal) {
			// Delete entire peripheral allocation
			dispatch(
				removePeripheralAssignment({
					peripheral
				})
			);
			dispatch(setActivePeripheral(undefined));
		}
	};

	const getTooltipPosition = useCallback(() => {
		const parent = document.getElementById(
			`peripheral-signal-${name}-chevron`
		);
		const tooltip = document.getElementById('tooltipText');
		const rect = parent?.getBoundingClientRect();

		if (parent && tooltip && rect) {
			tooltip.style.top = `${rect.top - 20}px`;
		}
	}, [name]);

	useEffect(() => {
		if (allocateHovered) {
			getTooltipPosition();
		}
	}, [allocateHovered, getTooltipPosition]);

	return (
		<div
			data-test={`peripheral-signal-${name}-container`}
			className={styles.container}
			onClick={onClick}
		>
			<div className={styles.peripheral}>
				<div
					data-test={`peripheral-signal-${name}`}
					className={isGrouped ? styles.groupedSignal : styles.signal}
				>
					{name}
				</div>
				{allocatedCoreId && (
					<div className={styles.core}>
						<Core projectId={allocatedCoreId} />
					</div>
				)}
			</div>
			{allocatedCoreId ? (
				<div
					data-test={`peripheral-signal-${name}-checkmark`}
					className={styles.actionButton}
				>
					<div
						className={styles.configureButton}
						onMouseEnter={() => {
							setEditHovered(true);
						}}
						onMouseLeave={() => {
							setEditHovered(false);
						}}
					>
						<ConfigIcon16px
							onClick={() => {
								if (peripheral && signal) {
									dispatch(
										setActiveSignal({
											signal: signal ?? '',
											peripheral: peripheral ?? ''
										})
									);
								} else {
									dispatch(
										setActivePeripheral(
											`${peripheral ?? ''}:${allocatedCoreId}`
										)
									);
								}
							}}
						/>
						{editHovered && (
							<div id='tooltipText' className={styles.tooltip}>
								Configure
							</div>
						)}
					</div>
					<div
						data-test={`peripheral-signal-${name}-delete`}
						onMouseEnter={() => {
							setDeleteHovered(true);
						}}
						onMouseLeave={() => {
							setDeleteHovered(false);
						}}
					>
						<DeleteIcon onClick={handleDelete} />
						{deleteHovered && (
							<div id='tooltipText' className={styles.tooltip}>
								Remove
							</div>
						)}
					</div>
				</div>
			) : (
				!isSelected &&
				!isGrouped && (
					<div
						data-test={`peripheral-signal-${name}-chevron`}
						className={styles.chevron}
						id={`peripheral-signal-${name}-chevron`}
						onMouseEnter={() => {
							setAllocateHovered(true);
						}}
						onMouseLeave={() => {
							setAllocateHovered(false);
						}}
					>
						<PlusIcon
							onClick={() => {
								dispatch(setProjectSelectionView(true));

								if (isSignalAssigned) {
									dispatch(
										setAllocationConfig({
											signalName: signal ?? '',
											peripheralTitle: peripheral ?? '',
											allocationTarget: '',
											projects: projects ?? [],
											signals: {},
											isPeripheralSecure: ''
										})
									);
								} else {
									dispatch(
										setAllocationConfig({
											signalName: '',
											peripheralTitle: name,
											allocationTarget: name,
											projects: projects ?? [],
											signals: signals ?? {},
											isPeripheralSecure: isSecure ?? ''
										})
									);
								}
							}}
						/>
						{allocateHovered && (
							<div id='tooltipText' className={styles.tooltip}>
								Allocate
							</div>
						)}
					</div>
				)
			)}
		</div>
	);
}

export default memo(PeripheralSignal);

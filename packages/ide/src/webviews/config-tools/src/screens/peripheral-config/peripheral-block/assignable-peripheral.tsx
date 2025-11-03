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
import {useState, useEffect, useCallback, memo} from 'react';
import styles from './PeripheralBlock.module.scss';
import DeleteIcon from '../../../../../common/icons/Delete';
import {PlusIcon} from 'cfs-react-library';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import Core from '../core/Core';
import {useAppDispatch} from '../../../state/store';
import {
	removePeripheralAssignment,
	setActivePeripheral,
	setAllocationConfig
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setProjectSelectionView} from '../../../state/slices/app-context/appContext.reducer';
import {useIsAllocatingProject} from '../../../state/slices/app-context/appContext.selector';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';

type Props = FormattedPeripheral<FormattedPeripheralSignal> & {
	allocatedCore?: string;
	highlighted: boolean;
	isAllocateHovered: (isHovered: boolean) => void;
};

function AssignablePeripheral({
	name,
	cores,
	signals,
	security,
	allocatedCore,
	highlighted,
	isAllocateHovered
}: Props) {
	const dispatch = useAppDispatch();
	const isAllocatingProject = useIsAllocatingProject();
	const [editHovered, setEditHovered] = useState(false);
	const [deleteHovered, setDeleteHovered] = useState(false);
	const [allocateHovered, setAllocateHovered] = useState(false);
	const [_, setAllocatedTarget] = useState<string | undefined>(
		undefined
	);

	const getTooltipPosition = useCallback(() => {
		const parent = document.getElementById(`peripheral-${name}`);
		const tooltip = document.getElementById('tooltipText');
		const rect = parent?.getBoundingClientRect();

		if (parent && tooltip && rect) {
			tooltip.style.top = `${rect.top + 30}px`;
		}
	}, [name]);

	const onMouseEnterAllocateButton = useCallback(() => {
		setAllocateHovered(true);
		isAllocateHovered(true);
	}, [isAllocateHovered]);

	const onMouseLeaveAllocateButton = useCallback(() => {
		setAllocateHovered(false);
		isAllocateHovered(false);
	}, [isAllocateHovered]);

	useEffect(() => {
		if (!isAllocatingProject) setAllocatedTarget(undefined);
	}, [isAllocatingProject]);

	useEffect(() => {
		if (editHovered || allocateHovered || deleteHovered) {
			getTooltipPosition();
		}
	}, [
		editHovered,
		allocateHovered,
		deleteHovered,
		getTooltipPosition
	]);

	return (
		<div
			className={`${styles.noGroupContainer} ${highlighted ? styles.highlight : ''}`}
			data-test={`no-group-${name}-container`}
		>
			<div className={styles.noGroupTitleContainer}>
				<div className={styles.noGroupTitle}>{name}</div>
				{allocatedCore && (
					<div className={styles.core}>
						<Core projectId={allocatedCore} />
					</div>
				)}
			</div>
			{allocatedCore ? (
				<div className={styles.actionButton}>
					<div
						className={styles.configureButton}
						onMouseEnter={() => setEditHovered(true)}
						onMouseLeave={() => setEditHovered(false)}
					>
						<ConfigIcon16px
							onClick={() =>
								dispatch(
									setActivePeripheral(`${name}:${allocatedCore}`)
								)
							}
						/>
						{editHovered && (
							<div id='tooltipText' className={styles.tooltip}>
								Configure
							</div>
						)}
					</div>
					<div
						onMouseEnter={() => setDeleteHovered(true)}
						onMouseLeave={() => setDeleteHovered(false)}
					>
						<DeleteIcon
							onClick={() => {
								dispatch(
									removePeripheralAssignment({peripheral: name})
								);
								dispatch(setActivePeripheral(undefined));
							}}
						/>
						{deleteHovered && (
							<div id='tooltipText' className={styles.tooltip}>
								Remove
							</div>
						)}
					</div>
				</div>
			) : (
				<div
					data-test={`allocate-${name}-button`}
					onMouseEnter={onMouseEnterAllocateButton}
					onMouseLeave={onMouseLeaveAllocateButton}
				>
					<PlusIcon
						onClick={() => {
							dispatch(setProjectSelectionView(true));
							dispatch(
								setAllocationConfig({
									peripheralTitle: name,
									allocationTarget: name,
									projects: cores ?? [],
									signals,
									isPeripheralSecure: security ?? '',
									signalName: ''
								})
							);
						}}
					/>
					{allocateHovered && (
						<div id='tooltipText' className={styles.tooltip}>
							Allocate
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default memo(AssignablePeripheral);

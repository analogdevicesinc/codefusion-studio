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
import {memo} from 'react';
import styles from './assignable-item.module.scss';
import Core from '../core/Core';
import DeleteIcon from '../../../../../common/icons/Delete';
import {PlusIcon, Tooltip} from 'cfs-react-library';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import PeripheralAllocTooltip from '../peripheral-block/peripheral-alloc-tooltip/peripheral-alloc-tooltip';
import {useTooltipDebouncedHover} from '../../../hooks/use-tooltip-debounced-hover';
import {
	PERIPHERAL_LIST_CONTAINER_ID,
	TOOLTIP_HOVER_DEBOUNCE_MS
} from '../constants';

export type AssignableItemProps = Readonly<{
	name: string;
	allocatedProjectId?: string;
	onClick?: () => void;
	/** When true, shows highlight animation */
	isHighlighted?: boolean;
	/** Handler called when user clicks configure button */
	onConfigure?: () => void;
	/** Handler called when user clicks delete button */
	onDelete?: () => void;
	/** Handler called when user clicks allocate button */
	onAllocate: () => void;
	/** Whether to show the item as selected */
	isSelected?: boolean;
	/** Optional className for parent-controlled styling */
	className?: string;
	/** When true, shows the assignment (+) icon. Parent controls visibility logic. */
	isAssignmentEnabled?: boolean;
	/** Optional description to show in tooltip when hovering the label */
	description?: string;
}>;

function AssignableItem({
	name,
	className,
	description,
	allocatedProjectId,
	isHighlighted = false,
	isAssignmentEnabled = true,
	onClick,
	onConfigure,
	onDelete,
	onAllocate
}: AssignableItemProps) {
	const {
		isHovered: isLabelHovered,
		displayTooltip,
		hideTooltip
	} = useTooltipDebouncedHover(TOOLTIP_HOVER_DEBOUNCE_MS);

	return (
		<div
			id={`assignable-item-${name}`}
			data-test={`assignable-item:container:${name}`}
			className={`${className ?? ''} ${styles.container} ${isHighlighted ? styles.highlight : ''}`}
			onClick={onClick}
		>
			<div
				className={styles.labelContainer}
				onMouseEnter={() => {
					displayTooltip();
				}}
				onMouseLeave={() => {
					hideTooltip();
				}}
			>
				<div
					data-test={`assignable-item:label:${name}`}
					className={`${styles.label}`}
				>
					{name}
				</div>
				{allocatedProjectId && (
					<div className={styles.core}>
						<Core projectId={allocatedProjectId} />
					</div>
				)}
			</div>
			{isLabelHovered && description && (
				<PeripheralAllocTooltip
					title={name}
					description={description}
				/>
			)}
			{allocatedProjectId ? (
				<div
					data-test={`assignable-item:checkmark:${name}`}
					className={styles.actionButton}
				>
					{onConfigure && (
						<div className={styles.configureButton}>
							<Tooltip
								title='Configure'
								position='bottom'
								type='short'
								containerId={PERIPHERAL_LIST_CONTAINER_ID}
							>
								<ConfigIcon16px onClick={onConfigure} />
							</Tooltip>
						</div>
					)}
					{onDelete && (
						<div data-test={`assignable-item:delete:${name}`}>
							<Tooltip
								title='Remove'
								position='bottom'
								type='short'
								containerId={PERIPHERAL_LIST_CONTAINER_ID}
							>
								<DeleteIcon onClick={onDelete} />
							</Tooltip>
						</div>
					)}
				</div>
			) : (
				isAssignmentEnabled && (
					<div
						data-test={`assignable-item:chevron:${name}`}
						className={styles.chevron}
						id={`assignable-item-chevron-${name}`}
					>
						<Tooltip
							title='Assign'
							position='bottom'
							type='short'
							containerId={PERIPHERAL_LIST_CONTAINER_ID}
						>
							<PlusIcon onClick={onAllocate} />
						</Tooltip>
					</div>
				)
			)}
		</div>
	);
}

export default memo(AssignableItem);

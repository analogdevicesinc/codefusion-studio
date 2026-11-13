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

import {useCallback, useRef, useState} from 'react';
import {Badge, Button, EditIcon} from 'cfs-react-library';
import ChevronRight from '@common/icons/ChevronRight';
import DragDropIcon from '@common/icons/drag-drop';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import EventSourceListItem from './event-source-list-item';
import EventSourceGroupNameEditor from './event-source-group-name-editor';
import OptionsMenu from './options-menu';
import ItemTooltip from './item-tooltip';
import {useItemTooltip} from '../../../common/hooks/use-item-tooltip';
import {MENU_ACTION as ACTION} from '../../../common/constants/events';
import type {RowStateUpdate} from '../../../common/types/timeline';
import type {MenuAction} from '../../../common/types/events';
import type {TimelineGroupRow} from '../../../common/types/events';

import styles from './event-sources-list.module.scss';

type EventSourceGroupProps = Readonly<{
	rowIndex: number;
	row: TimelineGroupRow;
	isResizingRef: React.MutableRefObject<boolean>;
	isDraggingRef: React.MutableRefObject<boolean>;
	onRowStateChange: (update: RowStateUpdate) => void;
	onPointerDown: (
		index: number,
		e: React.PointerEvent<HTMLSpanElement>
	) => void;
	onToggle: () => void;
	onRenameGroup: (groupId: string, groupName: string) => void;
	onMenuOptionSelect: (action: MenuAction, index: number) => void;
}>;

/** Renders group controls and manages inline renaming. */
export default function EventSourceGroup({
	rowIndex,
	row,
	isResizingRef,
	isDraggingRef,
	onRowStateChange,
	onPointerDown,
	onToggle,
	onRenameGroup,
	onMenuOptionSelect
}: EventSourceGroupProps): React.JSX.Element {
	const [isActive, setIsActive] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const renameButtonRef = useRef<HTMLSpanElement>(null);
	const {
		isTooltipVisible,
		showTooltip,
		showTooltipImmediately,
		hideTooltip
	} = useItemTooltip({
		isResizingRef,
		isDraggingRef
	});
	const {name, isExpanded} = row;
	const nodeId = row.id;
	const sourceCount = row.descendantSourceNames.length;
	const toggleLabel = `${isExpanded ? 'Collapse' : 'Expand'} ${name}`;
	const i10n = useLocaleContext();

	const handlePointerDown = useCallback(
		(ev: React.PointerEvent<HTMLSpanElement>) => {
			onRowStateChange({rowIndex, isHovered: false});
			onPointerDown(rowIndex, ev);
		},
		[onPointerDown, onRowStateChange, rowIndex]
	);

	const handleToggleMenu = useCallback(
		(value: boolean | undefined) => {
			const nextValue = value ?? !isActive;

			setIsActive(nextValue);
			onRowStateChange({rowIndex, isActive: nextValue});
		},
		[rowIndex, isActive, onRowStateChange]
	);

	const handleStartRenaming = useCallback(() => {
		hideTooltip();
		setIsRenaming(true);
	}, [hideTooltip]);

	const handleSaveGroupName = useCallback(
		(groupName: string) => {
			onRenameGroup(nodeId, groupName);
			setIsRenaming(false);
		},
		[nodeId, onRenameGroup]
	);

	const handleCancelRenaming = useCallback(() => {
		setIsRenaming(false);
	}, []);

	const countBadge = (
		<Badge
			appearance='secondary'
			size='small'
			className={styles.groupCount}
			dataTest={`event-sources:group:count:${rowIndex}`}
		>
			{sourceCount}
		</Badge>
	);

	const renameButton = (
		<span
			ref={renameButtonRef}
			className={styles.editButtonContainer}
			onPointerEnter={showTooltip}
			onPointerLeave={hideTooltip}
			onFocus={showTooltipImmediately}
			onBlur={hideTooltip}
		>
			<Button
				type='button'
				appearance='icon'
				className={styles.editButton}
				dataTest='event-sources:group:rename'
				ariaLabel='Rename group'
				onClick={event => {
					event.stopPropagation();
					handleStartRenaming();
				}}
			>
				<EditIcon />
			</Button>
		</span>
	);

	const leadingContent = (
		<>
			<span
				data-test={`event-sources:item:drag-handle:${rowIndex}`}
				className={styles.dragIcon}
				title={
					i10n?.timeline.diagram['event-sources']['drag-to-reorder']
				}
				onPointerDown={handlePointerDown}
			>
				<DragDropIcon width={20} height={20} />
			</span>
			<span
				className={styles.expandButtonContainer}
				title={toggleLabel}
				onPointerDown={event => {
					event.stopPropagation();
				}}
			>
				<Button
					type='button'
					appearance='icon'
					ariaLabel={toggleLabel}
					className={styles.expandButton}
					dataTest={`event-sources:group:toggle:${rowIndex}`}
					onClick={ev => {
						ev.stopPropagation();
						onToggle();
					}}
				>
					<span
						className={`${styles.chevron} ${
							isExpanded ? styles.chevronExpanded : ''
						}`}
					>
						<ChevronRight />
					</span>
				</Button>
			</span>
		</>
	);

	const optionsMenu = (
		<OptionsMenu
			isPanelOpen={isActive}
			row={row}
			onToggleMenu={handleToggleMenu}
			onOptionSelect={action => {
				if (action === ACTION.renameGroup) {
					handleStartRenaming();

					return;
				}

				onMenuOptionSelect(action, rowIndex);
			}}
		/>
	);

	return (
		<EventSourceListItem
			index={rowIndex}
			row={row}
			name={name}
			leadingContent={leadingContent}
			nameTrailingContent={
				<>
					{countBadge}
					{renameButton}
				</>
			}
			overlayContent={
				isTooltipVisible &&
				!isRenaming && (
					<ItemTooltip
						id={`event-source-group-rename-tooltip:${row.id}`}
						anchorRef={renameButtonRef}
					>
						<span
							className={styles.editTooltipText}
							data-test='event-sources:group:rename-tooltip'
						>
							Rename group
						</span>
					</ItemTooltip>
				)
			}
			nameEditor={
				isRenaming ? (
					<EventSourceGroupNameEditor
						name={name}
						onSave={handleSaveGroupName}
						onCancel={handleCancelRenaming}
					/>
				) : undefined
			}
			trailingContent={optionsMenu}
			isResizingRef={isResizingRef}
			isDraggingRef={isDraggingRef}
			onRowStateChange={onRowStateChange}
		/>
	);
}

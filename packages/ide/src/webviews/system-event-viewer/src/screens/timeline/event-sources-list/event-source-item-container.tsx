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

import {memo, useCallback, useEffect, useState} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import DragDropIcon from '@common/icons/drag-drop';
import EventSourceListItem from './event-source-list-item';
import OptionsMenu from './options-menu';
import type {RowStateUpdate} from '../../../common/types/timeline';
import type {
	MenuAction,
	TimelineSourceRow
} from '../../../common/types/events';

import styles from './event-sources-list.module.scss';

type EventSourceItemContainerProps = Readonly<{
	row: TimelineSourceRow;
	rowIndex: number;
	isResizingRef: React.MutableRefObject<boolean>;
	isDraggingRef: React.MutableRefObject<boolean>;
	onRowStateChange: (update: RowStateUpdate) => void;
	onPointerDown: (
		index: number,
		e: React.PointerEvent<HTMLSpanElement>
	) => void;
	onMenuOptionSelect: (action: MenuAction, index: number) => void;
}>;

function EventSourceItemContainer({
	row,
	rowIndex,
	isResizingRef,
	isDraggingRef,
	onRowStateChange,
	onPointerDown,
	onMenuOptionSelect
}: EventSourceItemContainerProps) {
	const [isActive, setIsActive] = useState(false);
	const i10n = useLocaleContext();

	const handleToggleMenu = useCallback(
		(value: boolean | undefined) => {
			const nextValue = value ?? !isActive;

			setIsActive(nextValue);
			onRowStateChange({rowIndex, isActive: nextValue});
		},
		[rowIndex, isActive, onRowStateChange]
	);

	const handlePointerDown = useCallback(
		(ev: React.PointerEvent<HTMLSpanElement>) => {
			onRowStateChange({rowIndex, isHovered: false});
			onPointerDown(rowIndex, ev);
		},
		[rowIndex, onPointerDown, onRowStateChange]
	);

	useEffect(
		() => () => {
			onRowStateChange({
				rowIndex,
				isActive: false
			});
		},
		[rowIndex, onRowStateChange]
	);

	const dragHandle = (
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
	);

	const optionsMenu = (
		<OptionsMenu
			isPanelOpen={isActive}
			row={row}
			onToggleMenu={handleToggleMenu}
			onOptionSelect={action => {
				onMenuOptionSelect(action, rowIndex);
			}}
		/>
	);

	return (
		<EventSourceListItem
			index={rowIndex}
			row={row}
			name={row.sourceName}
			leadingContent={dragHandle}
			trailingContent={optionsMenu}
			isResizingRef={isResizingRef}
			isDraggingRef={isDraggingRef}
			onRowStateChange={onRowStateChange}
		/>
	);
}

export default memo(EventSourceItemContainer);

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

import {memo, useCallback, useEffect, useRef, useState} from 'react';

import ItemTooltip from './item-tooltip';
import {useItemTooltip} from '../../../common/hooks/use-item-tooltip';
import {
	ROOT_PADDING,
	DEPTH_PADDING
} from '../../../common/constants/events';
import type {RowStateUpdate} from '../../../common/types/timeline';
import type {TimelineRow} from '../../../common/types/events';

import styles from './event-sources-list.module.scss';

type EventSourceListItemProps = Readonly<{
	index: number;
	row: TimelineRow;
	name: string;
	leadingContent: React.ReactNode;
	trailingContent?: React.ReactNode;
	nameTrailingContent?: React.ReactNode;
	overlayContent?: React.ReactNode;
	nameEditor?: React.ReactNode;
	isResizingRef: React.MutableRefObject<boolean>;
	isDraggingRef: React.MutableRefObject<boolean>;
	onRowStateChange: (update: RowStateUpdate) => void;
}>;

/** Renders shared row content while keeping menus and tooltips outside clipping. */
function EventSourceListItem({
	index,
	row,
	name,
	leadingContent,
	trailingContent,
	nameTrailingContent,
	overlayContent,
	nameEditor,
	isResizingRef,
	isDraggingRef,
	onRowStateChange
}: EventSourceListItemProps): React.JSX.Element {
	const [isTruncated, setIsTruncated] = useState(false);
	const nameRef = useRef<HTMLHeadingElement>(null);
	const isEditMode = nameEditor !== undefined;
	const isGroup = row.type === 'group';
	const {isTooltipVisible, showTooltip, hideTooltip} = useItemTooltip(
		{
			isResizingRef,
			isDraggingRef
		}
	);

	const handlePointerEnter = useCallback(() => {
		if (!isGroup) {
			showTooltip();
		}

		onRowStateChange({rowIndex: index, isHovered: true});
	}, [showTooltip, index, isGroup, onRowStateChange]);

	const handlePointerLeave = useCallback(() => {
		hideTooltip();
		onRowStateChange({rowIndex: index, isHovered: false});
	}, [hideTooltip, index, onRowStateChange]);

	const checkTruncation = useCallback(() => {
		if (!nameRef.current) return;

		setIsTruncated(
			nameRef.current.scrollWidth > nameRef.current.clientWidth
		);
	}, []);

	useEffect(() => {
		if (!nameRef.current || typeof ResizeObserver === 'undefined')
			return;

		const observer = new ResizeObserver(checkTruncation);
		observer.observe(nameRef.current);
		checkTruncation();

		return () => {
			observer.disconnect();
		};
	}, [checkTruncation, isEditMode, name]);

	useEffect(() => {
		if (isEditMode) {
			hideTooltip();
		}
	}, [hideTooltip, isEditMode]);

	useEffect(
		() => () => {
			onRowStateChange({rowIndex: index, isHovered: false});
		},
		[index, onRowStateChange]
	);

	const nodeNameContent = (
		<div
			className={`${styles.nameContainer} ${isGroup ? styles.groupNameContainer : ''}`}
		>
			<h5
				ref={nameRef}
				className={styles.name}
				data-test='event-sources:item:name'
				onPointerEnter={isGroup ? showTooltip : undefined}
				onPointerLeave={isGroup ? hideTooltip : undefined}
			>
				{name}
			</h5>
			{nameTrailingContent}
		</div>
	);

	return (
		<li
			id={`event-source-item-container:${index}`}
			data-row-index={index}
			data-row-id={row.id}
			data-row-type={row.type}
			className={styles.item}
			data-test={`event-sources:item:${index}`}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
			onFocusCapture={isGroup ? hideTooltip : undefined}
		>
			<div
				className={styles.itemContentViewport}
				data-test='event-sources:item:content-viewport'
			>
				<div
					className={styles.itemContent}
					data-test='event-sources:item:content'
					style={{
						paddingInlineStart:
							ROOT_PADDING + row.depth * DEPTH_PADDING
					}}
				>
					{leadingContent}
					{isEditMode ? (
						<div className={styles.groupNameEditorContainer}>
							{nameEditor}
						</div>
					) : (
						nodeNameContent
					)}
				</div>
			</div>

			{trailingContent}
			{!isEditMode && overlayContent}

			{isTooltipVisible &&
				isTruncated &&
				!isEditMode &&
				!overlayContent &&
				!isResizingRef.current &&
				!isDraggingRef.current && (
					<ItemTooltip
						id={`event-source-item-tooltip:${index}`}
						anchorRef={nameRef}
					>
						<span className={styles.eventTooltipText}>{name}</span>
					</ItemTooltip>
				)}
		</li>
	);
}

export default memo(EventSourceListItem);

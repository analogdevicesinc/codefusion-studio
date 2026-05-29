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
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import debounce from 'lodash.debounce';
import DragDropIcon from '@common/icons/drag-drop';
import OptionsMenu from './options-menu';
import ItemTooltip from './item-tooltip';
import type {RowStateUpdate} from '../../../common/types/timeline';
import type {MenuAction} from '../../../common/types/events';

import styles from './event-sources-list.module.scss';

type EventSourceItemProps = Readonly<{
	index: number;
	totalLength: number;
	name: string;
	isDragged: boolean;
	isResizingRef: React.MutableRefObject<boolean>;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDragStart: (index: number, e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragEnter: (index: number) => void;
	onOptionSelect: (action: MenuAction, index: number) => void;
	onDragEnd: () => void;
}>;

function EventSourceItem({
	index,
	totalLength,
	name,
	isDragged,
	isResizingRef,
	onRowStateChange,
	onDragStart,
	onDragOver,
	onDragEnter,
	onDragEnd,
	onOptionSelect
}: EventSourceItemProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [isTruncated, setIsTruncated] = useState(false);
	const nameRef = useRef<HTMLHeadingElement>(null);

	const debouncedHover = useMemo(
		() =>
			debounce(() => {
				setIsHovered(true);
			}, 600),
		[]
	);

	const displayTooltip = useCallback(() => {
		if (!isResizingRef.current) {
			debouncedHover();
		}
	}, [debouncedHover, isResizingRef]);

	const hideTooltip = useCallback(() => {
		debouncedHover.cancel();
		setIsHovered(false);
	}, [debouncedHover]);

	const handleOnMouseEnter = useCallback(() => {
		displayTooltip();
		onRowStateChange({rowIndex: index, isHovered: true});
	}, [index, onRowStateChange, displayTooltip]);

	const handleOnMouseLeave = useCallback(() => {
		hideTooltip();
		onRowStateChange({rowIndex: index, isHovered: false});
	}, [hideTooltip, index, onRowStateChange]);

	const handleOnToggleMenu = useCallback(
		(value: boolean | undefined) => {
			const nextValue = value ?? !isActive;

			setIsActive(nextValue);
			onRowStateChange({
				rowIndex: index,
				isActive: nextValue
			});
		},
		[index, isActive, setIsActive, onRowStateChange]
	);

	const checkTruncation = useCallback(() => {
		if (!nameRef.current) return;

		setIsTruncated(
			nameRef.current.scrollWidth > nameRef.current.clientWidth
		);
	}, []);

	useEffect(() => {
		if (!nameRef.current || typeof ResizeObserver === 'undefined')
			return;

		const observer = new ResizeObserver(() => {
			checkTruncation();
		});
		observer.observe(nameRef.current);

		return () => {
			observer.disconnect();
		};
	}, [checkTruncation]);

	useEffect(
		() => () => {
			onRowStateChange({
				rowIndex: index,
				isHovered: false,
				isActive: false
			});
		},
		[index, onRowStateChange]
	);

	return (
		<li
			id={`event-source-item-container:${index}`}
			data-row-index={index}
			className={
				isDragged
					? `${styles.item} ${styles.placeholder}`
					: styles.item
			}
			data-test={`event-sources:item:${index}`}
			onMouseEnter={isDragged ? undefined : handleOnMouseEnter}
			onMouseLeave={isDragged ? undefined : handleOnMouseLeave}
			onDragEnter={() => {
				onDragEnter(index);
			}}
			onDragOver={e => {
				onDragOver(e);
			}}
		>
			<span
				draggable
				data-test={`event-sources:item:drag-handle:${index}`}
				className={styles.dragIcon}
				title='Drag to reorder'
				onDragStart={e => {
					onDragStart(index, e);
				}}
				onDragEnd={() => {
					onDragEnd();
				}}
			>
				<DragDropIcon />
			</span>

			<h5
				ref={nameRef}
				className={styles.name}
				data-test='event-sources:item:name'
			>
				{name}
			</h5>

			{totalLength > 1 && (
				<OptionsMenu
					isPanelOpen={isActive}
					itemIndex={index}
					totalLength={totalLength}
					onToggleMenu={handleOnToggleMenu}
					onOptionSelect={action => {
						onOptionSelect(action, index);
					}}
				/>
			)}
			{!isDragged &&
				isHovered &&
				isTruncated &&
				!isResizingRef.current && (
					<ItemTooltip index={index} name={name} />
				)}
		</li>
	);
}

export default memo(EventSourceItem);

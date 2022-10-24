/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {VSCodeOption} from '@vscode/webview-ui-toolkit/react';
import {useEffect, useLayoutEffect, useState, useRef} from 'react';
import type {TContextMenuOption} from '../../../common/types/generic';
import styles from './ContextMenuPanel.module.scss';

type ContextMenuProps = {
	readonly isVisible: boolean;
	readonly x: number;
	readonly y: number;
	readonly options: TContextMenuOption[];
	readonly closeMenu: () => void;
	readonly handleOptionClick: (clickedElement: HTMLElement) => void;
};

export default function ContextMenuPanel({
	isVisible,
	x,
	y,
	options,
	closeMenu,
	handleOptionClick
}: ContextMenuProps) {
	const contextMenuRef = useRef<HTMLDivElement>(null);
	const [contextMenuDimensions, setContextMenuDimensions] = useState({
		width: 0,
		height: 0
	});

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				contextMenuRef.current &&
				!contextMenuRef.current.contains(event.target as Node)
			) {
				closeMenu();
			}
		};

		if (isVisible) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isVisible, closeMenu]);

	useLayoutEffect(() => {
		if (contextMenuRef.current) {
			const {width, height} =
				contextMenuRef.current.getBoundingClientRect();
			setContextMenuDimensions({width, height});
		}
	}, [isVisible]);

	/**
	 * When clicking on last column, context menu will go outside viewport
	 * this is a workaround for this
	 */
	const rect = document.documentElement.getBoundingClientRect();
	const maxX = rect.width - contextMenuDimensions.width;
	const maxY = rect.height - contextMenuDimensions.height;

	const adjustedX = Math.min(x, maxX);
	const adjustedY = Math.min(y, maxY);

	const style = {
		top: adjustedY,
		left: adjustedX,
		display: isVisible ? 'flex' : 'none'
	};

	return (
		<div
			ref={contextMenuRef}
			className={styles.contextMenu}
			style={style}
		>
			{options.map(
				(option: TContextMenuOption) =>
					option.show && (
						<VSCodeOption
							key={option.id}
							className={styles.option}
							onClick={e => {
								handleOptionClick(e.target as HTMLElement);
							}}
						>
							{option.label}
						</VSCodeOption>
					)
			)}
		</div>
	);
}

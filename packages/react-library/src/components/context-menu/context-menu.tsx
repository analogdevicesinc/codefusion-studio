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

const DEFAULT_DISTANCE_TO_ANCHOR = 4;

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import styles from './context-menu.module.scss';

export type MenuOption = {
	id: string;
	label: string;
	onClick?: () => void;
};

export type ContextMenuProps = {
	anchor?: HTMLElement | {x: number; y: number};
	options: Array<MenuOption | 'divider'>;
	preferredPlacement?: 'top' | 'bottom';
	open: boolean;
	onClose: () => void;
	onOpen?: () => void;
	onSelect?: (option: MenuOption) => void;
	className?: string;
};

export function ContextMenu({
	anchor,
	options,
	preferredPlacement = 'bottom',
	open,
	className,
	onClose,
	onOpen,
	onSelect
}: ContextMenuProps) {
	const [scrollTick, setScrollTick] = useState(0);

	const positioning = useMemo(() => {
		const {verticalPlacement, horizontalPlacement} =
			calculateMenuPlacement(options, preferredPlacement, anchor);
		let top, left;
		let anchorMargin = 0;
		if (anchor instanceof HTMLElement) {
			const rect = anchor.getBoundingClientRect();
			top = verticalPlacement === 'bottom' ? rect.bottom : rect.top;
			left = horizontalPlacement === 'right' ? rect.right : rect.left;
			anchorMargin = DEFAULT_DISTANCE_TO_ANCHOR;
		} else if (anchor) {
			top = anchor.y;
			left = anchor.x;
		}
		if (typeof top === 'undefined' || typeof left === 'undefined') {
			return undefined;
		}

		return {
			top,
			left,
			transform: `translateX(${
				horizontalPlacement === 'right' ? '-100%' : '0'
			}) translateY(${
				verticalPlacement === 'top'
					? `calc(-100% - ${anchorMargin}px)`
					: `${anchorMargin}px`
			})`
		};
		// scrollTick is included to recalculate position when the user scrolls
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options, preferredPlacement, anchor, open, scrollTick]);

	// Recalculate position on scroll so the menu follows the anchor
	useEffect(() => {
		if (!open || !(anchor instanceof HTMLElement)) return;

		function handleScroll() {
			setScrollTick(t => t + 1);
		}

		window.addEventListener('scroll', handleScroll, true);

		return () => {
			window.removeEventListener('scroll', handleScroll, true);
		};
	}, [open, anchor]);

	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open && onOpen) {
			onOpen();
		}
	}, [open, onOpen]);

	// Close menu on outside click
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as HTMLElement;
			if (open && !target.closest(`.${styles.panel}`)) {
				onClose();
			}
		}

		document.addEventListener('mousedown', handleClickOutside);

		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	}, [onClose, open]);

	// handle keyboard events
	useEffect(() => {
		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				handleFocusChange(1, menuRef.current);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				handleFocusChange(-1, menuRef.current);
			}
		}

		document.addEventListener('keydown', handleEscape);

		return () =>
			document.removeEventListener('keydown', handleEscape);
	}, [onClose]);

	const handleClickOption = useCallback(
		(option: MenuOption) => {
			option.onClick?.();
			if (onSelect) {
				onSelect(option);
			}
			onClose();
		},
		[onClose, onSelect]
	);

	if (!open) {
		return null;
	}

	return (
		<menu
			className={`${styles.panel} ${anchor ? styles.anchor : ''} ${className ?? ''}`}
			style={positioning}
			role='menu'
			data-test='event-sources:options-menu:panel'
			onClick={e => e.stopPropagation()}
			ref={menuRef}
		>
			{options.map((option, index) => {
				if (option === 'divider') {
					return (
						<hr
							key={`divider-${index}`}
							className={styles.divider}
							role='separator'
						/>
					);
				}
				return (
					<li
						key={`${option.label}-${option.id}`}
						role='menuitem'
						tabIndex={0}
						className={styles.menuItem}
						data-test={`event-sources:options-menu:item:${option.id}`}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								handleClickOption(option);
							}
						}}
						onClick={() => {
							handleClickOption(option);
						}}
					>
						<div className={styles.label}>{option.label}</div>
					</li>
				);
			})}
		</menu>
	);
}

function calculateMenuPlacement(
	options: Array<MenuOption | 'divider'>,
	preferredPlacement: 'top' | 'bottom',
	anchor?: HTMLElement | {x: number; y: number}
): {
	verticalPlacement: 'top' | 'bottom';
	horizontalPlacement: 'left' | 'right';
} {
	// estimate menu height
	const estimatedHeight =
		options.reduce(
			// 4 pixels vertical padding. 20 pixels per option, 6 pixels for dividers
			(acc, option) => acc + (option === 'divider' ? 6 : 20),
			0
		) + 4;

	// calculate estimated width based on longest label
	let maxTextLength = 0;
	options.forEach(option => {
		if (option !== 'divider') {
			maxTextLength = Math.max(maxTextLength, option.label.length);
		}
	});
	// 6 pixels per character approximation, 16 pixels for padding
	const estimatedWidth = maxTextLength * 6 + 16;

	let anchorY = 0;
	let anchorX = 0;
	if (anchor instanceof HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		anchorY =
			preferredPlacement === 'bottom'
				? rect.bottom + DEFAULT_DISTANCE_TO_ANCHOR
				: rect.top - estimatedHeight - DEFAULT_DISTANCE_TO_ANCHOR;
		anchorX = rect.left;
	} else if (anchor) {
		anchorY = anchor.y;
		anchorX = anchor.x;
	}

	// fix the final positioning of the element based on viewport boundaries
	let verticalPlacement = preferredPlacement;
	if (
		preferredPlacement === 'bottom' &&
		anchorY + estimatedHeight >= window.innerHeight
	) {
		verticalPlacement = 'top';
	} else if (preferredPlacement === 'top' && anchorY < 0) {
		verticalPlacement = 'bottom';
	}

	let horizontalPlacement: 'left' | 'right' = 'left';
	if (anchorX + estimatedWidth >= window.innerWidth) {
		horizontalPlacement = 'right';
	}

	return {verticalPlacement, horizontalPlacement};
}

function handleFocusChange(
	direction: -1 | 1,
	menu: HTMLDivElement | null
) {
	if (!menu) return;

	const focusableItems = Array.from(
		menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
	);

	if (focusableItems.length === 0) return;

	const activeElement = document.activeElement as HTMLElement;
	const currentIndex = focusableItems.indexOf(activeElement);

	let nextIndex = 0;
	if (currentIndex === -1) {
		nextIndex = direction === 1 ? 0 : focusableItems.length - 1;
	} else {
		nextIndex =
			(currentIndex + direction + focusableItems.length) %
			focusableItems.length;
	}

	focusableItems[nextIndex].focus();
}

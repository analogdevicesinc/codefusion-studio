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
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import {Button} from 'cfs-react-library';
import MoreIcon from '@common/icons/More';

import type {
	MenuAction,
	PanelPlacement
} from '../../../common/types/events';
import {
	MENU_ACTION as ACTION,
	PANEL_PLACEMENT as PLACEMENT
} from '../../../common/constants/events';

import styles from './options-menu.module.scss';

const MENU_OPTIONS: Array<{
	id: number;
	label: string;
	action: MenuAction;
}> = [
	{
		id: 0,
		label: 'Move to top',
		action: ACTION.top
	},
	{
		id: 1,
		label: 'Move up',
		action: ACTION.up
	},
	{
		id: 2,
		label: 'Move down',
		action: ACTION.down
	},
	{
		id: 3,
		label: 'Move to bottom',
		action: ACTION.bottom
	}
];

type OptionsMenuProps = Readonly<{
	isPanelOpen: boolean;
	itemIndex: number;
	totalLength: number;
	onToggleMenu: (value?: boolean) => void;
	onOptionSelect: (action: MenuAction) => void;
}>;

function OptionsMenu({
	isPanelOpen,
	itemIndex,
	totalLength,
	onToggleMenu,
	onOptionSelect
}: OptionsMenuProps) {
	const menuRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [placement, setPlacement] = useState<PanelPlacement>(
		PLACEMENT.bottom
	);

	const shouldShowOption = useCallback(
		(action: MenuAction) => {
			if (itemIndex === 0) {
				return action === ACTION.down || action === ACTION.bottom;
			}

			if (itemIndex === totalLength - 1) {
				return action === ACTION.top || action === ACTION.up;
			}

			return true;
		},
		[totalLength, itemIndex]
	);

	const getScrollableAncestor = (el: HTMLElement): HTMLElement => {
		let node = el?.parentElement;

		while (node && node !== document.body) {
			const style = getComputedStyle(node);

			const isScrollable =
				(style.overflowY === 'auto' ||
					style.overflowY === 'scroll') &&
				node.scrollHeight > node.clientHeight;

			if (isScrollable) return node;
			node = node.parentElement;
		}

		return document.documentElement;
	};

	// The purpose of this effect is to check if the panel overflows the
	// scrollable container when opened, and if so, flip its placement to top
	useLayoutEffect(() => {
		if (!isPanelOpen) return;

		const panel = panelRef.current;
		const menuEl = menuRef.current;
		if (!panel || !menuEl) return;

		const scrollContainer = getScrollableAncestor(menuEl);
		const panelRect = panel.getBoundingClientRect();
		const containerRect = scrollContainer.getBoundingClientRect();

		if (panelRect.bottom > containerRect.bottom) {
			setPlacement(PLACEMENT.top);
		}
	}, [isPanelOpen]);

	return (
		<section
			ref={menuRef}
			className={styles.optionsMenuContainer}
			tabIndex={-1}
			data-test='event-sources:options-menu'
			onBlur={ev => {
				// Close the menu if focus moves outside of the menu container
				const el = menuRef.current;
				const target = ev.relatedTarget;

				if (el && isPanelOpen && (!target || !el.contains(target))) {
					onToggleMenu(false);
				}
			}}
			onKeyDown={e => {
				if (e.key === 'Escape') {
					onToggleMenu(false);
				}
			}}
		>
			<Button
				id='options-menu-button'
				className={styles.moreIcon}
				appearance='icon'
				type='button'
				dataTest='event-sources:options-menu:button'
				onClick={() => {
					// Set default placement when opening because it may have been
					// changed to 'top' from a previous open action
					setPlacement(PLACEMENT.bottom);
					onToggleMenu();
				}}
			>
				<MoreIcon />
			</Button>

			{isPanelOpen && (
				<div
					ref={panelRef}
					className={`${styles.panel} ${placement === PLACEMENT.top ? styles.top : styles.bottom}`}
					role='menu'
					data-test='event-sources:options-menu:panel'
				>
					{MENU_OPTIONS.map(
						option =>
							shouldShowOption(option.action) && (
								<button
									key={`${option.label}-${option.id}`}
									type='button'
									role='menu-item'
									className={styles.menuItem}
									data-test={`event-sources:options-menu:item:${option.action}`}
									onClick={() => {
										onOptionSelect(option.action);
										onToggleMenu(false);
									}}
								>
									<div className={styles.label}>{option.label}</div>
								</button>
							)
					)}
				</div>
			)}
		</section>
	);
}

export default memo(OptionsMenu);

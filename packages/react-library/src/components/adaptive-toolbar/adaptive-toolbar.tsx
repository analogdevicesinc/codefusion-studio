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
	type MouseEventHandler,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import Button from '../button/button';
import Tooltip from '../tooltip/tooltip';
import {
	ContextMenu,
	type MenuOption
} from '../context-menu/context-menu';
import {MoreIcon} from '../icons/more-icon';
import styles from './adaptive-toolbar.module.scss';

// Horizontal padding on each side of every icon.
const ICON_PADDING = 2;

export type ToolbarAction = {
	readonly id: string;
	readonly label: string;
	readonly tooltip?: string;
	readonly icon: ReactNode;
	readonly action: () => void;
	readonly disabled?: boolean;
	/** Icon width in px, overriding the toolbar's `defaultIconWidth` for this action. */
	readonly width?: number;
};

export type AdaptiveToolbarProps = {
	readonly actions: ToolbarAction[];
	readonly className?: string;
	readonly ariaLabel?: string;
	readonly defaultIconWidth?: number;
};

/**
 * An icon-only toolbar that adapts to the width of its container.
 * Actions are rendered left-to-right as icon buttons; whenever there
 * isn't enough horizontal room to show every action, the trailing
 * actions that don't fit are collapsed behind a "More actions" button
 * that opens a menu listing them instead.
 *
 * @param {AdaptiveToolbarProps} props - The object containing properties for the toolbar.
 * @param {ToolbarAction[]} props.actions - Ordered list of actions to render; overflow always eats from the trailing end.
 * @param {string} props.className - Optional class applied to the toolbar's root element.
 * @param {string} props.ariaLabel - Optional accessible label for the toolbar's `role="toolbar"` container.
 * @param {number} props.defaultIconWidth - Icon width in px used for actions that don't set their own `width`. Defaults to 16.
 * @returns an AdaptiveToolbar as a JSX.Element
 */
export default function AdaptiveToolbar({
	actions,
	className,
	ariaLabel,
	defaultIconWidth = 16
}: AdaptiveToolbarProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [overflowAnchor, setOverflowAnchor] = useState<
		HTMLElement | undefined
	>(undefined);
	const [overflowOpen, setOverflowOpen] = useState(false);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		setContainerWidth(container.clientWidth);

		const observer = new ResizeObserver(entries => {
			const entry = entries[0];
			if (entry) {
				setContainerWidth(entry.contentRect.width);
			}
		});
		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	const getSlotWidth = (width?: number) =>
		(width ?? defaultIconWidth) + ICON_PADDING * 2;

	const totalWidth = actions.reduce(
		(sum, a) => sum + getSlotWidth(a.width),
		0
	);
	const allFit = totalWidth <= containerWidth;

	let visibleCount = actions.length;
	if (!allFit) {
		const budget = containerWidth - getSlotWidth(defaultIconWidth);
		let used = 0;
		visibleCount = 0;
		for (const a of actions) {
			const slotWidth = getSlotWidth(a.width);
			if (used + slotWidth > budget) break;
			used += slotWidth;
			visibleCount++;
		}
	}
	const visibleActions = actions.slice(0, visibleCount);
	const overflowActions = actions.slice(visibleCount);

	const overflowMenuOptions: MenuOption[] = overflowActions.map(
		a => ({
			id: a.id,
			label: a.label,
			icon: a.icon,
			disabled: a.disabled,
			onClick: a.action
		})
	);

	const handleActionMenuClick: MouseEventHandler<
		HTMLElement
	> = event => {
		setOverflowAnchor(event.currentTarget);
		setOverflowOpen(true);
	};

	return (
		<div
			ref={containerRef}
			role='toolbar'
			aria-label={ariaLabel}
			className={`${className ? `${className}` : ''} ${styles['adaptive-toolbar']}`}
		>
			{visibleActions.map(a => (
				<Tooltip key={a.id} title={a.tooltip ?? a.label} type='short'>
					<Button
						appearance='icon'
						ariaLabel={a.label}
						disabled={a.disabled}
						className={styles.toolbarButton}
						onClick={a.action}
					>
						<span
							className={styles.icon}
							style={{maxWidth: a.width ?? defaultIconWidth}}
						>
							{a.icon}
						</span>
					</Button>
				</Tooltip>
			))}
			{overflowActions.length > 0 && (
				<>
					<Button
						appearance='icon'
						ariaLabel='More actions'
						className={styles.toolbarButton}
						onClick={handleActionMenuClick}
					>
						<span
							className={styles.icon}
							style={{maxWidth: defaultIconWidth}}
						>
							<MoreIcon />
						</span>
					</Button>
					<ContextMenu
						anchor={overflowAnchor}
						options={overflowMenuOptions}
						open={overflowOpen}
						onClose={() => setOverflowOpen(false)}
					/>
				</>
			)}
		</div>
	);
}

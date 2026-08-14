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

import {type ReactNode, useState} from 'react';
import Button from '../button/button';
import {
	ContextMenu,
	type MenuOption
} from '../context-menu/context-menu';
import DownArrowIcon from '../icons/down-arrow-icon';
import styles from './button-with-options.module.scss';

export type ButtonWithOptionsProps = {
	readonly dataTest?: string;
	readonly className?: string;
	readonly ariaLabel?: string;
	readonly children: ReactNode;
	readonly onMainAction: () => void;
	readonly options: Array<MenuOption | 'divider'>;
	readonly disabled?: boolean;
	readonly appearance?: 'primary' | 'secondary' | 'icon';
	readonly dropdownLabel?: string;
	readonly preferredPlacement?: 'top' | 'bottom';
	readonly onOptionSelect?: (option: MenuOption) => void;
};

/**
 * Split button with a primary action and a contextual options menu.
 */
export default function ButtonWithOptions({
	dataTest = 'button-with-options',
	className,
	ariaLabel,
	children,
	onMainAction,
	options,
	disabled,
	appearance = 'primary',
	preferredPlacement,
	dropdownLabel,
	onOptionSelect
}: ButtonWithOptionsProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();

	const hasOptions =
		options.some(option => option !== 'divider') && !disabled;

	return (
		<>
			<div
				className={`${styles.container} ${className ?? ''}`}
				{...(dataTest ? {'data-test': dataTest} : {})}
				role='toolbar'
				aria-label={ariaLabel ?? 'Primary action and options'}
			>
				<Button
					className={styles.mainButton}
					dataTest={`${dataTest}:main-action`}
					onClick={onMainAction}
					disabled={disabled}
					appearance={appearance}
				>
					{children}
				</Button>
				<Button
					className={styles.dropdownButton}
					dataTest={`${dataTest}:more-actions`}
					onClick={event => {
						event.stopPropagation();
						if (!hasOptions) {
							return;
						}

						setMenuAnchor(event.currentTarget as HTMLElement);
						setIsMenuOpen(prev => !prev);
					}}
					disabled={!hasOptions}
					appearance={appearance}
				>
					<div
						className={`${styles.dropdownLabel} ${dropdownLabel ? styles.hasLabel : ''}`}
					>
						{dropdownLabel ?? ''}
						<DownArrowIcon />
					</div>
				</Button>
			</div>
			<ContextMenu
				anchor={menuAnchor}
				options={options}
				open={isMenuOpen && !!menuAnchor}
				onClose={() => setIsMenuOpen(false)}
				onSelect={onOptionSelect}
				preferredPlacement={preferredPlacement}
				className={styles.menu}
			/>
		</>
	);
}

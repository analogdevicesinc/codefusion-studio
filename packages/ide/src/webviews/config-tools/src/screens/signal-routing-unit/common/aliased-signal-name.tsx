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

import type {ReactNode} from 'react';
import styles from './aliased-signal-name.module.scss';

type AliasedSignalNameProps = Readonly<{
	name: string;
	alias?: string;
	className?: string;
	/**
	 * When provided, the raw name (not the alias sub-label) renders as a
	 * button styled as a link, e.g. to jump to that signal's own card on its
	 * owning peripheral. Omitted entirely, the name renders as plain text.
	 */
	onNameClick?: () => void;
	/**
	 * Optional inline content rendered directly after the name, e.g. a status
	 * icon. Kept generic so this component stays unaware of what callers put
	 * here.
	 */
	nameSuffix?: ReactNode;
}>;

/**
 * Renders an SRU signal's display name: the raw schema signal name is always
 * the primary label; when a user-assigned alias exists, it is shown as a
 * sub-label directly underneath. Position alone marks the alias as secondary
 * - it is rendered at full-strength `--vscode-editorWidget-foreground` rather
 * than a dimmed color, so it is not mistaken for the dimmed signal
 * description text that can appear in the same card.
 * Always renders its own wrapper element (even without an alias) so callers'
 * `className` is never silently dropped.
 *
 * Inherits font size/weight from whatever heading/text element it's nested
 * in (e.g. `<h3>`, `<h4>`) - the alias sub-label follows the same size.
 */
export function AliasedSignalName({
	name,
	alias,
	className,
	onNameClick,
	nameSuffix
}: AliasedSignalNameProps) {
	return (
		<span className={`${styles.stack} ${className ?? ''}`}>
			{onNameClick ? (
				<button
					type='button'
					className={`${styles.primary} ${styles.link}`}
					data-test='signal-name'
					onClick={onNameClick}
				>
					{name}
				</button>
			) : (
				<span className={styles.primaryWrapper}>
					<span className={styles.primary} data-test='signal-name'>
						{name}
					</span>
					{nameSuffix}
				</span>
			)}
			{alias && (
				<span className={styles.alias} data-test='signal-alias'>
					{alias}
				</span>
			)}
		</span>
	);
}

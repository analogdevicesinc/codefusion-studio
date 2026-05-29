/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import React from 'react';
import {type ReactNode, type ReactElement} from 'react';
import InfoIcon from '../icons/info-icon';

import styles from './empty-state.module.scss';
import WarningIcon from '../icons/warning-icon';
import ConflictIcon from '../icons/conflict-icon';

type EmptyStateProps = {
	readonly children?: ReactNode;
	readonly type?: 'info' | 'warning' | 'error';
	readonly dataTest?: string;
	readonly title?: string;
	readonly description?: string;
	readonly linkText?: string;
	readonly onLinkClick?: () => void;
	readonly hasBorder?: boolean;
};

const iconMap = {
	info: (
		<InfoIcon width={20} height={20} className={styles.infoIcon} />
	),
	warning: <WarningIcon width={20} height={20} />,
	error: <ConflictIcon width={20} height={20} />
};

const isReactElement = (
	child: ReactNode
): child is ReactElement<unknown, string> =>
	React.isValidElement(child);

export default function EmptyState({
	children,
	type = 'info',
	title,
	description,
	linkText,
	onLinkClick,
	hasBorder = true,
	dataTest
}: EmptyStateProps) {
	const bodySlot: ReactNode[] = [];
	const footerSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props as {slot?: string};

			if (slot === 'body') {
				bodySlot.push(child);
			} else if (slot === 'footer') {
				footerSlot.push(child);
			}
		}
	});

	return (
		<div
			className={`${styles.emptyStateContainer} ${hasBorder ? styles.withBorder : ''}`}
			data-test={dataTest}
		>
			{iconMap[type]}
			<div className={styles.titleContainer}>
				{title && <div className={styles.title}>{title}</div>}
				{(description || linkText) && (
					<div className={styles.description}>
						{description}
						{linkText && onLinkClick && (
							<>
								{' '}
								<button
									type='button'
									className={styles.link}
									onClick={onLinkClick}
								>
									{linkText}
								</button>
							</>
						)}
					</div>
				)}
			</div>
			{bodySlot}
			{footerSlot}
		</div>
	);
}

/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import styles from './accordion.module.scss';
import DownArrow from '../icons/down-arrow-icon';
import Button from '../button/button';
import Tooltip from '../tooltip/tooltip';

type AccordionProps = Readonly<{
	readonly dataTest?: string;
	readonly children?: React.ReactNode;
	readonly open: boolean;
	readonly title?: string | React.ReactNode;
	readonly className?: string;
	readonly onToggle?: () => void;
}>;

export default function Accordion({
	dataTest,
	children,
	title,
	open,
	className,
	onToggle
}: AccordionProps) {
	return (
		<div
			className={`${styles.container} ${className ?? ''}`}
			{...(dataTest ? {'data-test': dataTest} : {})}
		>
			<header
				className={styles.header}
				role='button'
				onClick={() => onToggle?.()}
				aria-expanded={open}
			>
				<div className={styles.titleContainer}>
					{typeof title === 'string' ? (
						<h2 className={styles.title}>{title}</h2>
					) : (
						<div className={styles.content}>{title}</div>
					)}
				</div>
				<Tooltip title={open ? 'Collapse' : 'Expand'} type='short'>
					<Button
						className={`${styles.chevron} ${open ? styles.open : ''}`}
						appearance='icon'
						onClick={e => {
							e.stopPropagation();
							onToggle?.();
						}}
					>
						<DownArrow />
					</Button>
				</Tooltip>
			</header>
			{open && (
				<div className={styles.body} role='region'>
					{children}
				</div>
			)}
		</div>
	);
}

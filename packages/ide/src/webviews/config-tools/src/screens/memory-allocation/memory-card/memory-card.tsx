/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {Card} from 'cfs-react-library';
import React, {useState, memo, type ReactNode} from 'react';
import {isReactElement} from '../../../../../common/utils';
import styles from './memory-card.module.scss';
import DownArrow from '../../../../../common/icons/DownArrow';

type MemoryCardProps = Readonly<{
	key?: string;
	children?: ReactNode;
	dataTest?: string;
	isExpandable?: boolean;
	isOpen?: boolean;
	setOpen?: (open: boolean) => void;
}>;

function MemoryCard({
	key,
	children,
	dataTest,
	isExpandable = true,
	isOpen: controlledIsOpen,
	setOpen: controlledSetOpen
}: MemoryCardProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledIsOpen ?? internalOpen;
	const setOpen = controlledSetOpen ?? setInternalOpen;

	const endSlot: ReactNode[] = [];
	const titleSlot: ReactNode[] = [];
	const contentSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'end') {
				endSlot.push(child);
			} else if (slot === 'title') {
				titleSlot.push(child);
			} else if (slot === 'content') {
				contentSlot.push(child);
			}
		}
	});

	const handleCardEndClick = () => {
		setOpen(!isOpen);
	};

	return (
		<Card key={key} disableHoverEffects>
			<section
				className={styles.memoryCardContainer}
				id='memoryCardContainer'
				data-test={dataTest}
			>
				<section className={styles.memoryCardHeader}>
					<div className={styles.title}>{titleSlot}</div>
					{Boolean(endSlot.length) && (
						<div
							className={`${styles.end} ${isExpandable ? styles.expandable : ''}`}
							data-test='partition-details-chevron'
							onClick={() => {
								if (isExpandable) {
									handleCardEndClick();
								}
							}}
						>
							{contentSlot.length ? (
								<>
									{endSlot}
									<span
										className={`${styles.downArrow}${isOpen ? ` ${styles.iconOpen}` : ''}`}
									>
										<DownArrow width='10' height='8' />
									</span>
								</>
							) : (
								endSlot
							)}
						</div>
					)}
				</section>
				{isOpen && (
					<section className={styles.body}>
						<div className={styles.content}>{contentSlot}</div>
					</section>
				)}
			</section>
		</Card>
	);
}

export default memo(MemoryCard);

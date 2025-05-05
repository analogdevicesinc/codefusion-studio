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
import React, {
	type MouseEvent,
	type ReactNode,
	memo,
	useState
} from 'react';
import {Card} from 'cfs-react-library';

import {isReactElement} from '../../utils';

import styles from './CfsSelectionCard.module.scss';
import DownArrow from '../../icons/DownArrow';

type CfsSelectionProps = Readonly<{
	isChecked?: boolean;
	id: string;
	testId?: string;
	ariaLabel?: string;
	hasError?: boolean;
	isDisabled?: boolean;
	children?: ReactNode;
	onChange?: (selectedId: string) => void;
}>;

function CfsSelectionCard({
	isChecked,
	id,
	testId = id,
	ariaLabel,
	hasError,
	isDisabled,
	children,
	onChange
}: CfsSelectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const startSlot: ReactNode[] = [];
	const endSlot: ReactNode[] = [];
	const titleSlot: ReactNode[] = [];
	const contentSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'start') {
				startSlot.push(child);
			} else if (slot === 'end') {
				endSlot.push(child);
			} else if (slot === 'title') {
				titleSlot.push(child);
			} else if (slot === 'content') {
				contentSlot.push(child);
			}
		}
	});

	const handleAccordionExpansion = () => {
		if (contentSlot.length) {
			setIsExpanded(prevIsExpanded => !prevIsExpanded);
		}
	};

	const handleCardEndClick = (e: MouseEvent<HTMLElement>) => {
		const isLink = (e.target as HTMLElement).closest('a');

		if (!isLink) {
			e.stopPropagation();
		}
	};

	return (
		<Card
			hasError={hasError}
			isActive={isChecked}
			id={id}
			ariaLabel={ariaLabel}
			testId={testId}
			isDisabled={isDisabled}
		>
			<section
				className={styles.cardContainer}
				onClick={() => {
					if (onChange) {
						onChange(id);
					}
				}}
			>
				<section className={styles.header}>
					<div className={styles.start}>{startSlot}</div>
					<div className={styles.title}>{titleSlot}</div>
					{Boolean(endSlot.length) && (
						<div className={styles.end} onClick={handleCardEndClick}>
							{contentSlot.length ? (
								<>
									{endSlot}
									<span
										className={`${styles.icon} ${styles.interactable} ${isExpanded ? styles.expanded : null}`}
										data-test={`${testId}:endSlot:icon`}
										onClick={handleAccordionExpansion}
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
				{isExpanded && (
					<section className={styles.body}>
						<div className={styles.divider} />
						<div className={styles.content}>{contentSlot}</div>
					</section>
				)}
			</section>
		</Card>
	);
}

export default memo(CfsSelectionCard);

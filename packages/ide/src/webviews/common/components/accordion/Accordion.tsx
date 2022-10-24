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
import {useEffect, useRef} from 'react';
import RightArrow from '@common/icons/RightArrow';
import styles from './Accordion.module.scss';
import ConflictIcon from '../../icons/Conflict';

type AccordionProps = {
	readonly title: string;
	readonly hasError?: boolean;
	readonly body: React.ReactNode;
	readonly isOpen: boolean;
	readonly toggleExpandMenu: (title: string) => void;
};

export default function Accordion({
	title,
	hasError = false,
	body,
	isOpen,
	toggleExpandMenu
}: AccordionProps) {
	const peripheralRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			setTimeout(() => {
				if (!peripheralRef.current) return;

				const parentContainer = peripheralRef.current.parentElement;

				if (parentContainer) {
					const parentContainerBottom =
						parentContainer.getBoundingClientRect().bottom;

					const peripheralBottom =
						peripheralRef.current.getBoundingClientRect().bottom;

					const offsetFromBottom = 50;

					if (peripheralBottom > parentContainerBottom) {
						parentContainer.scrollBy({
							top:
								peripheralBottom -
								(parentContainerBottom - offsetFromBottom),
							behavior: 'smooth'
						});
					}
				}
			}, 250);
		}
	}, [isOpen]);

	return (
		<div
			ref={peripheralRef}
			className={`${styles.container} ${isOpen && styles.hasBorder}`}
			data-test={title}
		>
			<section
				className={styles.header}
				onClick={() => {
					toggleExpandMenu(title);
				}}
			>
				<div className={` ${isOpen ? styles.iconOpen : ''}`}>
					<RightArrow />
				</div>
				<span>{title}</span>
				{hasError && (
					<>
						<div className={styles.divider} />
						<div
							id={`${title}-conflict`}
							className={styles.conflictIcon}
						>
							<ConflictIcon />
						</div>
					</>
				)}
			</section>
			{isOpen && <section className={styles.body}>{body}</section>}
		</div>
	);
}

/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import ChevronRight from '../../icons/ChevronRight';
import styles from './Accordion.module.scss';

type AccordionProps = Readonly<{
	title: string;
	body: React.ReactNode;
	subTitle?: React.ReactNode;
	caption?: React.ReactNode;
	isOpen: boolean;
	id?: string;
	highlight?: boolean;
	icon?: React.ReactNode;
	disableBorderOnHover?: boolean;
	variant?: 'default' | 'no-gap';
	toggleExpand: (title: string) => void;
}>;

export default function Accordion({
	id,
	title,
	body,
	subTitle,
	caption,
	highlight,
	isOpen,
	variant = 'default',
	disableBorderOnHover,
	icon,
	toggleExpand
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
			className={`${styles.container} ${isOpen && !disableBorderOnHover && styles.hasBorder} ${
				styles[variant]
			} ${disableBorderOnHover ? styles.disableBorder : ''}`}
			data-test={`accordion:${title}`}
		>
			<section
				className={`${styles.header} ${highlight ? styles.highlight : ''}`}
				onClick={() => {
					toggleExpand(id ?? title);
				}}
			>
				<div className={styles.leftSection}>
					<div
						className={`${styles.chevron}${isOpen ? ` ${styles.iconOpen}` : ''}`}
					>
						<ChevronRight />
					</div>
					<div className={styles.titleContainer}>
						<span className={styles.title}>{title}</span>
						{subTitle && (
							<div className={styles.subTitle}>{subTitle}</div>
						)}
					</div>
					{icon && (
						<>
							<div className={styles.divider} />
							<div>{icon}</div>
						</>
					)}
				</div>
				{caption && <span className={styles.caption}>{caption}</span>}
			</section>
			{isOpen && <section className={styles.body}>{body}</section>}
		</div>
	);
}

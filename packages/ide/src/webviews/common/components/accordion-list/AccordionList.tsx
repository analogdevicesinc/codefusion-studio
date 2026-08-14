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
import styles from './AccordionList.module.scss';

type AccordionListProps = Readonly<{
	title: string;
	children: React.ReactNode;
	subTitle?: React.ReactNode;
	caption?: React.ReactNode;
	highlight?: boolean;
	icon?: React.ReactNode;
	className?: string;
}>;

type AccordionItemProps = Readonly<{
	children: React.ReactNode;
	subTitle?: React.ReactNode;
	active?: boolean;
	icon?: React.ReactNode;
	onClick?: () => void;
}>;

export function AccordionItem({
	children,
	subTitle,
	active,
	icon,
	onClick
}: AccordionItemProps) {
	return (
		<div
			className={`${styles.item} ${active ? styles.active : ''}`}
			role='button'
			tabIndex={0}
			onClick={onClick}
			onKeyDown={e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onClick?.();
				}
			}}
		>
			<div className={styles.itemContent}>
				<div className={styles.itemTextContainer}>
					{children}
					{subTitle && (
						<div className={styles.itemSubTitle}>{subTitle}</div>
					)}
				</div>
			</div>
			{icon && <div className={styles.icon}>{icon}</div>}
		</div>
	);
}

export default function AccordionList({
	title,
	children,
	subTitle,
	caption,
	highlight,
	icon,
	className
}: AccordionListProps) {
	return (
		<div
			className={`${styles.container} ${className ?? ''}`}
			data-test={`accordion-list:${title}`}
		>
			<section
				className={`${styles.header} ${highlight ? styles.highlight : ''}`}
			>
				<div className={styles.leftSection}>
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
			<div className={styles.list}>{children}</div>
		</div>
	);
}

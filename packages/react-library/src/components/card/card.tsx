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
import {useId, type ReactNode} from 'react';
import styles from './card.module.scss';

type CardProps = Readonly<{
	id?: string;
	ariaLabel?: string;
	interactive?: boolean;
	isActive?: boolean;
	testId?: string;
	hasError?: boolean;
	isDisabled?: boolean;
	disableHoverEffects?: boolean;
	isExpanded?: boolean;
	children?: ReactNode;
}>;

export default function Card({
	ariaLabel,
	interactive = true,
	isActive,
	id,
	testId,
	hasError,
	isDisabled,
	isExpanded,
	disableHoverEffects,
	children
}: CardProps) {
	const baseId = useId();
	return (
		<div
			data-test={testId}
			data-active={isActive}
			className={`${styles['card']} ${interactive && isActive ? styles.active : ''} ${interactive && hasError ? styles.error : ''} ${interactive && (disableHoverEffects || isDisabled) ? styles.noHover : ''} ${interactive && isExpanded ? styles.expanded : ''} ${isDisabled ? styles.disabled : ''}`}
			id={id ? id : baseId}
			aria-label={ariaLabel}
		>
			{children}
		</div>
	);
}

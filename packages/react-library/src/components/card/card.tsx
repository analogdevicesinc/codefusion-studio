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
	isActive?: boolean;
	testId?: string;
	hasError?: boolean;
	isDisabled?: boolean;
	disableHoverEffects?: boolean;
	children?: ReactNode;
}>;

export default function Card({
	ariaLabel,
	isActive,
	id,
	testId,
	hasError,
	isDisabled,
	disableHoverEffects,
	children
}: CardProps) {
	const baseId = useId();
	return (
		<div
			data-test={testId}
			data-active={isActive}
			className={`${styles['card']} ${isActive ? styles.active : ''} ${hasError ? styles.error : ''} ${disableHoverEffects || isDisabled ? styles.noHover : ''} ${isDisabled ? styles.disabled : ''}`}
			id={id ? id : baseId}
			aria-label={ariaLabel}
		>
			{children}
		</div>
	);
}

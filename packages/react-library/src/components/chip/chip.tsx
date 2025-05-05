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
import type React from 'react';
import styles from './chip.module.scss';
import {memo} from 'react';
import Button from '../button/button';
import {vscButtonAppearance} from '../../constants/constants';

type ChipProps = {
	readonly label: string;
	readonly id?: string;
	readonly dataValue?: number | boolean;
	readonly dataTest?: string;
	readonly isDisabled?: boolean | number;
	readonly isActive?: boolean;
	readonly onClick: () => void;
	readonly children?: React.ReactNode;
};

const {primary, secondary} = vscButtonAppearance;

function Chip({
	id,
	label,
	isDisabled,
	dataValue,
	dataTest,
	isActive,
	children,
	onClick
}: ChipProps) {
	return (
		<Button
			id={id}
			dataTest={dataTest}
			dataValue={dataValue}
			disabled={
				typeof isDisabled === 'boolean'
					? isDisabled
					: Boolean(!isDisabled)
			}
			appearance={isActive ? primary : secondary}
			className={styles.chipContainer}
			onClick={() => {
				onClick();
			}}
		>
			<div className={styles.bodyWrapper}>
				{label}
				{children}
			</div>
		</Button>
	);
}

export default memo(Chip);

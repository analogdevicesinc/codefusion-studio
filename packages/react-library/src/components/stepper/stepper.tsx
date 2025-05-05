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

import {ChangeEvent, useRef} from 'react';
import DownArrow from '../icons/down-arrow-icon';
import Button from '../button/button';
import styles from './stepper.module.scss';

export interface StepperProps {
	stepAmount?: number;
	inputValue: number;
	dataTest?: string;
	error?: string;
	onValueChange: (value: number) => void;
}
export default function Stepper({
	stepAmount = 1,
	inputValue,
	dataTest,
	error,
	onValueChange
}: StepperProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const increment = (): void =>
		onValueChange(inputValue + stepAmount);

	const decrement = (): void => {
		if (inputValue - stepAmount < 0) {
			onValueChange(0);
		} else {
			onValueChange(inputValue - stepAmount);
		}
	};

	const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.value === '') {
			onValueChange(0);
			return;
		}

		const formatted = e.target.value.replace(/[^\0-9]/g, '').trim();
		const parsedInt = parseInt(formatted, 10);
		onValueChange(Number.isNaN(parsedInt) ? 0 : parsedInt);
	};

	return (
		<div className={styles.container} data-test={dataTest}>
			<div
				className={`${error ? styles.errorBorder : ''} ${styles.inputWrapper}`}
			>
				<input
					ref={inputRef}
					className={styles.input}
					type='text'
					onChange={handleOnChange}
					value={inputValue}
				></input>
				<div className={styles.arrows}>
					<div className={styles.upArrow}>
						<Button
							appearance='icon'
							className={styles.iconButton}
							onClick={increment}
						>
							<DownArrow />
						</Button>
					</div>
					<div className={styles.downArrow}>
						<Button
							appearance='icon'
							className={styles.iconButton}
							onClick={decrement}
						>
							<DownArrow />
						</Button>
					</div>
				</div>
			</div>
			{error && (
				<span
					data-test={`${dataTest}-error`}
					className={styles.error}
				>
					{error}
				</span>
			)}
		</div>
	);
}

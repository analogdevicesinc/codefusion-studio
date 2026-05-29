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

import {useCallback, useRef} from 'react';
import TextField from '../text-field/textfield.js';
import DownArrow from '../icons/down-arrow-icon';
import Button from '../button/button';

import styles from './integer-field.module.scss';

type IntegerFieldProps = Omit<
	React.ComponentProps<typeof TextField>,
	'inputVal' | 'onInputChange'
> & {
	value: number;
	step?: number;
	min?: number;
	max?: number;
	allowNegative?: boolean;
	endSlot?: React.ReactNode;
	dataTest?: string;
	onInputClamped?: () => void;
	onOutOfRange?: (value: number) => void;
	onValueChange?: (value: number) => void;
};

const SAFE_MAX = Number.MAX_SAFE_INTEGER;
const SAFE_MIN = -Number.MAX_SAFE_INTEGER;

function isBiggerThanLimit(
	str: string,
	allowNegative: boolean
): boolean {
	if (str === '' || str === '-') return false;

	const big = BigInt(str);

	if (big > BigInt(SAFE_MAX)) return true;
	if (allowNegative && big < BigInt(SAFE_MIN)) return true;
	if (!allowNegative && big < 0n) return true;

	return false;
}

const format = (value: number): string => Number(value).toString();

function clampToSafe(value: number): number {
	if (value > SAFE_MAX) return SAFE_MAX;
	if (value < SAFE_MIN) return SAFE_MIN;

	return value;
}

const sanitize = (
	allowNegative: boolean,
	raw: string
): {stringValue: string; numberValue: number | null} => {
	let clone = raw;

	if (allowNegative) {
		clone = clone.replace(/(?!^)-/g, ''); // remove any '-' but not at start
		clone = clone.replace(/[^0-9-]/g, ''); // strip non-digit except leading '-'

		// The case when the user types just '-'
		if (clone === '-') {
			return {
				stringValue: '-',
				numberValue: null
			};
		}
	} else {
		clone = clone.replace(/\D+/g, '');
	}

	const negative = allowNegative && clone.startsWith('-');
	const digits = negative ? clone.slice(1) : clone;
	const normalized = digits.replace(/^0+(?=\d)/, '');
	const digitsForDisplay = normalized === '' ? '0' : normalized;
	const stringValue = negative
		? `-${digitsForDisplay}`
		: digitsForDisplay;

	return {
		stringValue,
		numberValue: parseInt(stringValue, 10)
	};
};

export default function IntegerField({
	value,
	step,
	min,
	max,
	allowNegative = false,
	endSlot,
	onInputClamped,
	onOutOfRange,
	onValueChange,
	...rest
}: IntegerFieldProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	// Imperative patch to update input value without causing a re-render
	const commitDisplay = (value: number) => {
		if (inputRef.current)
			inputRef.current.value = Number(value).toString();
	};

	const emitRangeStatus = useCallback(
		(value: number) => {
			const belowMin = min !== undefined && value < min;
			const aboveMax = max !== undefined && value > max;

			if (belowMin || aboveMax) {
				onOutOfRange?.(value);
			}
		},
		[min, max, onOutOfRange]
	);

	const adjustValue = useCallback(
		(currentVal: number) => {
			if (!step) return;

			const nextVal = value + currentVal;
			const safeVal = clampToSafe(nextVal);

			if (safeVal !== nextVal) {
				commitDisplay(safeVal);
				onInputClamped?.();
				onValueChange?.(safeVal);

				return;
			}

			commitDisplay(nextVal);
			emitRangeStatus(nextVal);
			onValueChange?.(nextVal);
		},
		[step, value, emitRangeStatus, onValueChange, onInputClamped]
	);

	const handleInputChange = useCallback(
		(raw: string) => {
			const {stringValue, numberValue} = sanitize(allowNegative, raw);

			// Allow user to type '-' if negatives are allowed
			if (allowNegative && stringValue === '-' && inputRef.current) {
				inputRef.current.value = '-';

				return;
			}

			if (isBiggerThanLimit(stringValue, allowNegative)) {
				const safeStr = stringValue.startsWith('-')
					? SAFE_MIN.toString()
					: SAFE_MAX.toString();

				commitDisplay(Number(safeStr));
				onInputClamped?.();
				onValueChange?.(Number(safeStr));

				return;
			}

			let parsed = numberValue ?? 0;
			if (!allowNegative && parsed < 0) parsed = 0;

			commitDisplay(parsed);
			emitRangeStatus(parsed);
			onValueChange?.(parsed);
		},
		[allowNegative, emitRangeStatus, onInputClamped, onValueChange]
	);

	const canIncrement =
		!!step && Math.abs(value + (step ?? 0)) <= SAFE_MAX;
	const canDecrement =
		!!step &&
		(allowNegative || value - (step ?? 0) >= 0) &&
		Math.abs(value - (step ?? 0)) <= SAFE_MAX;

	const stepper = (
		<div className={styles.stepperContainer}>
			<Button
				appearance='icon'
				disabled={!canIncrement}
				className={`${styles.iconButton} ${styles.upArrow}`}
				onClick={() => adjustValue(step ?? 0)}
			>
				<DownArrow />
			</Button>
			<Button
				appearance='icon'
				disabled={!canDecrement}
				className={`${styles.iconButton} ${styles.downArrow}`}
				onClick={() => adjustValue(-(step ?? 0))}
			>
				<DownArrow />
			</Button>
		</div>
	);

	const resolvedEndSlot = step ? (
		<div className={styles.endSlotContainer}>
			{endSlot && <span>{endSlot}</span>}
			{stepper}
		</div>
	) : (
		endSlot
	);

	return (
		<TextField
			{...rest}
			ref={inputRef}
			inputVal={format(value)}
			endSlot={resolvedEndSlot}
			onInputChange={handleInputChange}
		/>
	);
}

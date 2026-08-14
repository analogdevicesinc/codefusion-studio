/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {
	VSCodeDropdown,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react';
import styles from './dropdown.module.scss';
import {useEffect, useRef, useState} from 'react';
import DownArrow from '../icons/down-arrow-icon';

export type DropDownOptions = Array<{
	value: string;
	label: string;
	dataTest?: string;
	disabled?: boolean;
	optionGroup?: string;
}>;

type DropDownOption = DropDownOptions[number];

type DropDownRenderOption =
	| (DropDownOption & {type: 'option'; isGrouped: boolean})
	| {type: 'group'; label: string};

type DropDownProps = Readonly<{
	controlId: string;
	isDisabled?: boolean;
	currentControlValue: string | undefined;
	options: DropDownOptions;
	dataTest?: string;
	size?: 'large' | 'small';
	// When error is a boolean, the style is applied but no error message is shown.
	error?: string | boolean;
	placeholder?: string;
	// Adds an option to the list when there is no value selected yet
	noValueOption?: DropDownOptions[0];
	onOpenDropdown?: () => void;
	onHandleDropdown: (value: string) => void;
	className?: string;
}>;

export default function DropDown({
	controlId,
	isDisabled = false,
	currentControlValue,
	options,
	dataTest,
	size = 'large',
	error,
	placeholder,
	className,
	noValueOption,
	onOpenDropdown,
	onHandleDropdown
}: DropDownProps) {
	const dropdownRef = useRef<HTMLSelectElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const hasValue = !!currentControlValue;
	const dropdownOptions =
		noValueOption && !hasValue
			? [noValueOption, ...options]
			: options;

	const handleDropdown = () => {
		dropdownRef.current?.blur();
		onHandleDropdown(dropdownRef.current?.value ?? '');
		setIsExpanded(false);
	};

	const getGroupedOptions = (
		items: DropDownOptions
	): DropDownRenderOption[] => {
		const groupedOptions = new Map<string, DropDownOption[]>();
		const ungroupedOptions: DropDownRenderOption[] = [];

		items.forEach(option => {
			if (!option.optionGroup) {
				ungroupedOptions.push({
					...option,
					type: 'option',
					isGrouped: false
				});

				return;
			}

			const optionGroup =
				groupedOptions.get(option.optionGroup) ?? [];
			optionGroup.push(option);
			groupedOptions.set(option.optionGroup, optionGroup);
		});

		return [
			...ungroupedOptions,
			...Array.from(groupedOptions.entries()).flatMap(
				([label, groupOptions]) => [
					{type: 'group' as const, label},
					...groupOptions.map(option => ({
						...option,
						type: 'option' as const,
						isGrouped: true
					}))
				]
			)
		];
	};

	useEffect(() => {
		document.addEventListener('click', handleBodyClick);

		return () => {
			document.removeEventListener('click', handleBodyClick);
		};
	}, []);

	const handleBodyClick = (event: Event): void => {
		const clickEventTarget = event.target as HTMLElement;
		if (!containerRef.current) return;
		if (!containerRef.current.contains(clickEventTarget)) {
			setIsExpanded(false);
		}
	};

	// @TODO: Add another prop to this component to (size: xs/lg) to allow it to also render smaller dropdowns - i.e. the one in pinmux
	return (
		<div ref={containerRef} className={styles.container}>
			<VSCodeDropdown
				// @ts-expect-error: This external component doesn't recognize a ref as a possible prop
				ref={dropdownRef}
				id={`${controlId}-controlDropdown`}
				data-test={dataTest}
				disabled={isDisabled}
				className={`
					${className ? className : ''}
					${styles.dropdown}
					${error ? styles.error : ''}
					${isExpanded ? styles.expandedDropdown : ''}
					${styles[size]}
				`}
				value={
					noValueOption && !hasValue
						? noValueOption.value
						: currentControlValue
				}
				onClick={() => {
					if (!isExpanded && !isDisabled) {
						onOpenDropdown?.();
					}

					setIsExpanded(!isExpanded);
				}}
				onChange={() => {
					handleDropdown();
				}}
			>
				<div
					slot='indicator'
					className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
				>
					<DownArrow />
				</div>
				{getGroupedOptions(dropdownOptions).map(option => {
					if (option.type === 'group') {
						const optionGroupURIEncoded = `${controlId}__optionGroup__${encodeURIComponent(option.label)}`;
						return (
							<VSCodeOption
								key={optionGroupURIEncoded}
								id={optionGroupURIEncoded}
								value={optionGroupURIEncoded}
								data-test={optionGroupURIEncoded}
								className={`${styles.option} ${styles.optionGroup}`}
								disabled
							>
								{option.label}
							</VSCodeOption>
						);
					}

					return (
						<VSCodeOption
							key={`${controlId}_${option.value}`}
							id={`${controlId}_${option.value}`}
							data-test={option.dataTest}
							value={option.value}
							data-value={option.value}
							className={`${styles.option} ${
								option.isGrouped ? styles.groupedOption : ''
							}`}
							disabled={option.disabled}
						>
							{option.label}
						</VSCodeOption>
					);
				})}
			</VSCodeDropdown>

			{placeholder && !hasValue && !isExpanded && (
				<div className={styles.placeholder} aria-hidden='true'>
					{placeholder}
				</div>
			)}

			{error && error !== true && (
				<div
					className={styles.errorMessage}
					data-test={`${dataTest}-error`}
				>
					{error}
				</div>
			)}
		</div>
	);
}

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

import {
	useId,
	useState,
	useEffect,
	useRef,
	forwardRef,
	useImperativeHandle,
} from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import styles from "./grid-combobox.module.css";
import CloseIcon from "../icons/close-icon";

export type GridComboboxProp = {
	readonly grid: string[][];
	readonly headings: string[];
	readonly label?: string;
	readonly placeholder?: string;
	readonly prefixIcon?: React.ReactNode;
	readonly disabled?: boolean;
	readonly onClear?: () => void;
	readonly onInput?: (value: string) => void;
	readonly onRowSelection?: (row: string[]) => void;
	readonly searchFn?: (value: string, grid: string[][]) => string[][];
};

export interface GridComboboxHandle {
	clearInput: () => void;
}

const defaultSearch = (value: string, grid: string[][]): string[][] => {
	const searchTerm = value.toLowerCase();

	if (!searchTerm) {
		return [];
	}

	return grid.filter((row) =>
		row.some((col) => col.toLowerCase().includes(searchTerm)),
	);
};

/**
 * @param {GridComboboxProp} props - The object containing properties for the grid combobox.
 * @param {string[][]} props.grid - 2D string array representing all possible options.
 * @param {string[]} props.headings - Heading row to appear at top of list.
 * @param {string} props.label - Optional label to display above input field.
 * @param {string} props.placeholder - Placeholder text for the internal input element.
 * @param {boolean} props.disabled - Property  to disable the input in the gridbox.
 * @param {() => void)} props.onClear - Callback function called when user clicks clear button.
 * @param {(string) => void)} props.onInput - Callback function called when user types and input value changes.
 * @param {(string[]) => void)} props.onRowSelection - Callback function which will be called when user selects a row.
 * @param {(string, string[][]) => string[][]} props.searchFn - Custom search function takes in a search string and 2D string array. The default will return the subset of rows with any match of the search string.
 * @returns a GridCombobox as a JSX.Element
 */
export const GridCombobox = forwardRef<GridComboboxHandle, GridComboboxProp>(
	function GridCombobox(
		{
			grid,
			headings,
			label,
			placeholder,
			prefixIcon,
			disabled = false,
			onInput = () => {},
			onClear = () => {},
			onRowSelection = () => {},
			searchFn = defaultSearch,
		}: GridComboboxProp,
		ref,
	) {
		const baseId = useId();
		const inputRef = useRef<HTMLInputElement>(null);
		const gridRef = useRef<HTMLDivElement>(null);
		const [isDropdownOpen, setIsDropdownOpen] = useState(false);
		const [searchResults, setSearchResults] = useState<string[][]>([]);
		const [activeRowIndex, setActiveRowIndex] = useState(-1);
		const inputId = baseId + "-input";

		useImperativeHandle(ref, () => {
			return {
				clearInput,
			};
		});

		const handleInputKeyUp = (event: React.KeyboardEvent) => {
			const { key } = event;

			switch (key) {
				case "ArrowUp":
				case "ArrowDown":
				case "Escape":
				case "Enter":
					event.preventDefault();

					return;
				default:
					onInput(inputRef.current?.value ?? "");
					updateResults();
					setIsDropdownOpen(true);
			}
		};

		const handleInputKeyDown = (event: React.KeyboardEvent) => {
			const { key } = event;

			if (searchResults.length < 1) {
				return;
			}

			const prevActiveItem =
				gridRef.current?.children[activeRowIndex]?.children[0];

			switch (key) {
				case "Escape":
					event.preventDefault();

					return;
				case "ArrowUp":
				case "ArrowDown":
					setRowFromKey(key);

					break;
				case "Enter":
					if (activeRowIndex >= 1 && inputRef.current) {
						inputRef.current.value =
							getSelectedItem(activeRowIndex)?.textContent ?? "";
						hideResults();
						onRowSelection(searchResults[activeRowIndex - 1]);
					}

					return;
				default:
					return;
			}

			if (prevActiveItem) {
				prevActiveItem?.setAttribute("aria-selected", "false");
			}
		};

		useEffect(() => {
			const activeItem = gridRef.current?.children[activeRowIndex];

			if (activeItem) {
				inputRef.current?.setAttribute(
					"aria-activedescendant",
					baseId + "-" + activeRowIndex,
				);
				// Theres a distinction between the active item which is the row and the selected cell which is always col 0. Could be modified in future to be a col index from props.
				const selectedItem = activeItem?.children[0];
				selectedItem?.setAttribute("aria-selected", "true");
			} else {
				inputRef.current?.setAttribute("aria-activedescendant", "");
			}
		}, [activeRowIndex, baseId]);

		useEffect(() => {
			const constrainedIndex = Math.max(
				0,
				Math.min(activeRowIndex, searchResults.length),
			);
			if (searchResults.length && constrainedIndex !== activeRowIndex) {
				setActiveRowIndex(constrainedIndex);
			}
		}, [searchResults, activeRowIndex]);

		const setRowFromKey = (key: string) => {
			if (key === "ArrowUp") {
				if (activeRowIndex <= 0) {
					setActiveRowIndex(searchResults.length);
				} else {
					setActiveRowIndex(activeRowIndex - 1);
				}
			} else if (
				activeRowIndex === -1 ||
				activeRowIndex === searchResults.length
			) {
				setActiveRowIndex(0);
			} else {
				setActiveRowIndex(activeRowIndex + 1);
			}
		};

		const updateResults = () => {
			const userInput = inputRef.current?.value ?? "";
			if (userInput === "") {
				setSearchResults(grid);
			} else {
				setSearchResults(searchFn(userInput, grid));
			}
		};

		const hideResults = () => {
			setActiveRowIndex(-1);
			setIsDropdownOpen(false);
		};

		const getSelectedItem = (rowIndex: number): Element | undefined =>
			gridRef.current?.children[rowIndex]?.children[0];

		const handleRowClick = (row: string[], index: number) => {
			if (inputRef.current) {
				inputRef.current.value = getSelectedItem(index)?.textContent ?? "";
				hideResults();
			}

			onRowSelection(row);
		};

		const clearInput = () => {
			if (inputRef.current) {
				inputRef.current.value = "";
			}
			onClear();
		};

		useEffect(() => {
			document.addEventListener("click", handleBodyClick);

			return () => {
				document.removeEventListener("click", handleBodyClick);
			};
		});

		const handleBodyClick = (event: MouseEvent) => {
			if (
				event.target !== inputRef.current &&
				!gridRef.current?.contains(event.target as Node)
			) {
				hideResults();
			}
		};

		const numColumns = grid[0]?.length;

		if (!grid.length && inputRef.current) {
			inputRef.current.value = "";
		}

		return (
			<>
				<label htmlFor={inputId} className={styles.label}>
					{label}
				</label>
				<div
					className={`${styles.container} ${disabled ? styles.disabled : ""}`}
				>
					<div className={styles.inputWrapper}>
						{prefixIcon}
						<input
							ref={inputRef}
							type="text"
							id={inputId}
							placeholder={placeholder}
							aria-haspopup="grid"
							aria-expanded={isDropdownOpen}
							autoComplete="off"
							onKeyUp={handleInputKeyUp}
							onKeyDown={handleInputKeyDown}
							onFocus={() => {
								updateResults();
								setIsDropdownOpen(true);
							}}
							disabled={disabled}
						/>
						<VSCodeButton
							appearance="icon"
							onClick={clearInput}
							disabled={disabled}
						>
							<CloseIcon />
						</VSCodeButton>
					</div>
					<div
						ref={gridRef}
						role="grid"
						className={`${styles.grid} ${isDropdownOpen && searchResults.length ? "" : styles.hidden}`}
						style={{
							gridTemplateColumns: `repeat(${numColumns - 1}, minmax(100px, max-content)) minmax(100px, auto)`,
						}}
					>
						{[headings, ...searchResults].map((row, index) => (
							<div
								id={baseId + "-" + index}
								key={index}
								role="row"
								className={`${styles.row} ${index === activeRowIndex ? styles.focused : ""}`}
								onClick={() => {
									if (index > 0) {
										handleRowClick(row, index);
									}
								}}
							>
								{row.map((col, colIndex) => (
									<div key={colIndex} role="gridcell" className={styles.col}>
										{col}
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</>
		);
	},
);

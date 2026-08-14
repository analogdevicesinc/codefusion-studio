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

import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
import {
	Button,
	DropDown,
	JumpFirstIcon,
	JumpLastIcon,
	NextItemIcon,
	PreviousItemIcon
} from 'cfs-react-library';
import {type ChangeEvent, useEffect, useState} from 'react';
import {
	setPage,
	setPageSize
} from '../../state/slices/packages/packages.reducer';
import {
	usePackageListTotal,
	usePage,
	usePageSize
} from '../../state/slices/packages/packages.selector';
import {useAppDispatch} from '../../state/store';
import styles from './pagination.module.scss';

const PAGE_SIZE_OPTIONS = [
	{value: '10', label: '10'},
	{value: '20', label: '20'},
	{value: '50', label: '50'}
];

export default function Pagination() {
	const dispatch = useAppDispatch();
	const page = usePage();
	const pageSize = usePageSize();
	const total = usePackageListTotal();

	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(Math.max(1, page), pageCount);

	const rangeStart =
		total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const rangeEnd = Math.min(currentPage * pageSize, total);

	const isFirstPage = currentPage <= 1;
	const isLastPage = currentPage >= pageCount;

	// Local state for the editable page field; committed on Enter / blur.
	const [pageInput, setPageInput] = useState(String(currentPage));

	useEffect(() => {
		setPageInput(String(currentPage));
	}, [currentPage]);

	const goToPage = (next: number) => {
		const clamped = Math.min(Math.max(1, next), pageCount);
		dispatch(setPage(clamped));
	};

	const handleItemsPerPageChange = (value: string) => {
		dispatch(setPageSize(Number(value)));
	};

	const commitPageInput = () => {
		const parsed = Number(pageInput);

		if (Number.isInteger(parsed) && parsed >= 1) {
			goToPage(parsed);
		} else {
			setPageInput(String(currentPage));
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.rowContainer}>
				<p className={styles.itemsPerPageText}>Items per page</p>

				<DropDown
					className={styles.shortDropdown}
					currentControlValue={String(pageSize)}
					controlId='itemsPerPage'
					options={PAGE_SIZE_OPTIONS}
					onHandleDropdown={handleItemsPerPageChange}
				/>
				<p className={styles.itemsPerPageText}>
					{rangeStart}-{rangeEnd} of {total}
				</p>
			</div>
			<div className={styles.rowContainer}>
				<Button
					appearance='icon'
					disabled={isFirstPage}
					onClick={() => {
						goToPage(1);
					}}
				>
					<JumpFirstIcon />
				</Button>
				<Button
					appearance='icon'
					disabled={isFirstPage}
					onClick={() => {
						goToPage(currentPage - 1);
					}}
				>
					<PreviousItemIcon />
				</Button>
				<div className={styles.rowContainer}>
					<VSCodeTextField
						className={styles.shortInput}
						value={pageInput}
						onInput={e => {
							setPageInput(
								(e as ChangeEvent<HTMLInputElement>).target.value
							);
						}}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								commitPageInput();
							}
						}}
						onBlur={commitPageInput}
					/>{' '}
					<p className={styles.itemsPerPageText}> of {pageCount}</p>
				</div>
				<Button
					appearance='icon'
					disabled={isLastPage}
					onClick={() => {
						goToPage(currentPage + 1);
					}}
				>
					<NextItemIcon />
				</Button>
				<Button
					appearance='icon'
					disabled={isLastPage}
					onClick={() => {
						goToPage(pageCount);
					}}
				>
					<JumpLastIcon />
				</Button>
			</div>
		</div>
	);
}

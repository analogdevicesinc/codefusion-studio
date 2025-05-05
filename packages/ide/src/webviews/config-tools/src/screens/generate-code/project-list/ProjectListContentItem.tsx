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

import {useCallback} from 'react';
import DownCarret from '@common/icons/DownCarret';
import type {navigationItems} from '@common/constants/navigation';
import {
	setActiveFilter,
	setActiveScreen
} from '../../../state/slices/app-context/appContext.reducer';
import {useAppDispatch} from '../../../state/store';

import styles from './ProjectListContentItem.module.scss';

export default function ProjectListContentItem({
	error,
	path,
	label
}: Readonly<{
	error: number;
	path: (typeof navigationItems)[keyof typeof navigationItems];
	label: string;
}>) {
	const dispatch = useAppDispatch();

	const handleGoToView = useCallback(
		(id: (typeof navigationItems)[keyof typeof navigationItems]) => {
			dispatch(setActiveScreen(id));

			if (id === 'pinmux') dispatch(setActiveFilter('conflict'));
		},
		[dispatch]
	);

	return (
		<div className={styles.issueContent}>
			<span className={styles.item}>
				{error} <span>errors in </span>
				{label}
			</span>
			<span
				className={styles.icon}
				onClick={() => {
					handleGoToView(path);
				}}
			>
				<DownCarret />
			</span>
		</div>
	);
}

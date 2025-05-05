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

import {useCallback} from 'react';
import {openVSCodeFileExplorer} from '../../../../utils/api';
import {TextField, Button} from 'cfs-react-library';

import styles from './BrowseFile.module.scss';

export default function BrowseFile({
	mode,
	path,
	error,
	placeholder,
	dataTest = '',
	isDisabled = false,
	onPathChange
}: Readonly<{
	mode: 'file' | 'folder';
	path: string;
	placeholder?: string;
	dataTest?: string;
	isDisabled?: boolean;
	error?: string;
	onPathChange: (path: string) => void;
}>) {
	const openFileExplorer = useCallback(() => {
		void openVSCodeFileExplorer(mode).then((path: string) => {
			onPathChange?.(path);

			if (onPathChange) onPathChange(path);
		});
	}, [mode, onPathChange]);

	return (
		<div className={styles.browseFileContainer}>
			<TextField
				dataTest={dataTest}
				inputVal={path}
				isDisabled={isDisabled}
				error={error}
				placeholder={placeholder}
				onInputChange={onPathChange}
			/>
			<div className={styles.browseButton}>
				<Button
					disabled={isDisabled}
					appearance='primary'
					onClick={openFileExplorer}
				>
					Browse
				</Button>
			</div>
		</div>
	);
}

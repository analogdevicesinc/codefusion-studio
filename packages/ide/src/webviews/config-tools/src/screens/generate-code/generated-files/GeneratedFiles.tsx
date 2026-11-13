/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {ProgressRing} from 'cfs-react-library';
import FileItem from '../file-item/FileItem';
import {memo} from 'react';
import {useCodeGenState} from '../../../state/slices/app-context/appContext.selector';
import styles from './GeneratedFile.module.scss';

function GeneratedFiles() {
	const codeGenState = useCodeGenState();

	if (codeGenState.status === 'running') {
		return (
			<div
				data-test='generated-files:loading'
				className={styles.loader}
			>
				<ProgressRing />
			</div>
		);
	}

	if (codeGenState.status === 'error') {
		return (
			<p data-test='generated-files:error'>
				An error occurred while generating the code files, please try
				again.
			</p>
		);
	}

	if (codeGenState.status === 'idle') {
		return null;
	}

	return (
		<ul
			data-test='generated-files:list-container'
			className={styles.list}
		>
			{codeGenState.files.map(item => (
				<FileItem key={item} item={item} />
			))}
		</ul>
	);
}

export default memo(GeneratedFiles);

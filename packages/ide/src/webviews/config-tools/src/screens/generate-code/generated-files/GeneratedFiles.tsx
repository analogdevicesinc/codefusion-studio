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

import {use} from 'cfs-react-library';
import FileItem from '../file-item/FileItem';
import {memo} from 'react';
import styles from './GeneratedFile.module.scss';
import type {CodeGenerationResult} from 'cfs-lib/dist/types/code-generation';

function GeneratedFiles({
	promise
}: Readonly<{
	promise: Promise<CodeGenerationResult | string>;
}>) {
	const generatedCodeFiles = use(promise);

	if (typeof generatedCodeFiles === 'string') {
		return (
			<p>
				An error occurred while generating the code files, please try
				again.
			</p>
		);
	}

	return (
		<ul
			data-test='generated-files:list-container'
			className={styles.list}
		>
			{(Array.isArray(generatedCodeFiles)
				? generatedCodeFiles
				: []
			).map(item => (
				<FileItem
					key={typeof item === 'string' ? item : item.name}
					item={item}
				/>
			))}
		</ul>
	);
}

export default memo(GeneratedFiles);

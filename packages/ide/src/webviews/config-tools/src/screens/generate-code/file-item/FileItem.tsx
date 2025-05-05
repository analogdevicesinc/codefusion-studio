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

import styles from './FileItem.module.scss';

export default function FileItem({name}: Readonly<{name: string}>) {
	return (
		<li className={styles.itemContainer}>
			<span className={styles.generating}>Generating</span>

			<span className={styles.content}>
				<span
					data-test='generated-files:file'
					className={styles.fileName}
				>
					{name}
				</span>
				<span className={styles.loading} />
			</span>

			<span className={styles.done}>OK</span>
		</li>
	);
}

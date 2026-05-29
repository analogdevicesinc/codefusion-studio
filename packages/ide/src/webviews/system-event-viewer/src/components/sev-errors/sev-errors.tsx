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

import {EmptyState} from 'cfs-react-library';

import styles from './sev-errors.module.scss';

export default function SevErrors({
	errors
}: Readonly<{errors: string[]}>) {
	return (
		<EmptyState type='error'>
			<ol slot='body'>
				{errors.map((error, index) => (
					<li
						key={`json-error:${error}`}
						data-test={`json-error:${index}`}
						className={styles.errorMessage}
					>
						{error}
					</li>
				))}
			</ol>
		</EmptyState>
	);
}

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
import styles from './skeleton-rows.module.scss';

export default function SkeletonRows({
	columns = 1
}: {
	readonly columns?: number;
}) {
	return (
		<>
			<tr className={styles.shimmer}>
				<td colSpan={columns} />
			</tr>
			<tr className={styles.shimmer}>
				<td colSpan={columns} />
			</tr>
			<tr className={styles.shimmer}>
				<td colSpan={columns} />
			</tr>
		</>
	);
}

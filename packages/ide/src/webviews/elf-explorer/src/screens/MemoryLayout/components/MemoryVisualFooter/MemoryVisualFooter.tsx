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
import styles from './MemoryVisualFooter.module.scss';

export default function MemoryVisualFooter() {
	return (
		<div className={styles.footer}>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles['read-write']}`} />
				<span className={styles.label}>Read / Write</span>
			</div>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles['read-only']}`} />
				<span className={styles.label}>Read only</span>
			</div>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles.unused}`} />
				<span className={styles.label}>Unused</span>
			</div>
		</div>
	);
}

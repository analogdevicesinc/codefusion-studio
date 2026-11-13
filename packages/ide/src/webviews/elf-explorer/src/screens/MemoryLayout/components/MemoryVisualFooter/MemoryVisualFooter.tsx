/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {useLocaleContext} from '../../../../../../common/contexts/LocaleContext';

export default function MemoryVisualFooter() {
	const l10n = useLocaleContext()?.memoryLayout as
		| Record<string, string>
		| undefined;

	return (
		<div className={styles.footer}>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles['read-write']}`} />
				<span className={styles.label}>
					{l10n?.readWrite ?? 'Read / Write'}
				</span>
			</div>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles['read-only']}`} />
				<span className={styles.label}>
					{l10n?.readOnly ?? 'Read only'}
				</span>
			</div>
			<div className={styles['footer-container']}>
				<div className={`${styles.square} ${styles.unused}`} />
				<span className={styles.label}>
					{l10n?.unused ?? 'Unused'}
				</span>
			</div>
		</div>
	);
}

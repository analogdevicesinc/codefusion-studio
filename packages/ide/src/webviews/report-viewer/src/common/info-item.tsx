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
import {type ReactNode} from 'react';
import styles from './info-item.module.scss';
import {TruncatedText, type TruncationSide} from 'cfs-react-library';

export function InfoItem({
	label,
	value,
	truncationSide = 'right',
	dataTest,
	action
}: {
	readonly label: string;
	readonly value: string | number | ReactNode;
	readonly truncationSide?: TruncationSide;
	readonly dataTest?: string;
	readonly action?: ReactNode;
}) {
	return (
		<div className={styles.infoItem}>
			<h6 className={styles.label}>{label}</h6>
			{typeof value === 'number' || typeof value === 'string' ? (
				<span className={styles.valueRow}>
					<TruncatedText
						side={truncationSide}
						className={styles.value}
						title={value.toString()}
						dataTest={dataTest}
					>
						{value}
					</TruncatedText>
					{action}
				</span>
			) : (
				value
			)}
		</div>
	);
}

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

import type {ReactNode} from 'react';

import CircledCheckmarkIcon from '../icons/circled-checkmark-icon';
import ConflictIcon from '../icons/conflict-icon';
import InfoIcon from '../icons/info-icon';
import WarningIcon from '../icons/warning-icon';

import styles from './inline-message.module.scss';

type InlineMessageProps = Readonly<{
	children?: ReactNode;
	type?: 'info' | 'warning' | 'error' | 'success';
	dataTest?: string;
}>;

const iconMap = {
	info: <InfoIcon width={16} height={16} />,
	warning: <WarningIcon width={16} height={16} />,
	error: <ConflictIcon width={16} height={16} />,
	success: (
		<div className={styles.success}>
			<CircledCheckmarkIcon width={16} height={16} />
		</div>
	)
};

export default function InlineMessage({
	children,
	type = 'info',
	dataTest
}: InlineMessageProps) {
	return (
		<div className={styles.inlineMessage} data-test={dataTest}>
			<div className={styles.icon}>{iconMap[type]}</div>
			<div className={styles.message}>{children}</div>
		</div>
	);
}

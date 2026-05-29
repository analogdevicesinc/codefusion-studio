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

import Lock from '../../../../common/icons/Lock';
import styles from './config-unavailable.module.scss';

type ConfigUnavailableProps = Readonly<{
	message: string;
	showLockIcon?: boolean;
	dataTest?: string;
}>;

export default function ConfigUnavailable({
	message,
	showLockIcon = true,
	dataTest = 'config-unavailable:message'
}: ConfigUnavailableProps) {
	return (
		<div className={styles.container}>
			<div data-test={dataTest} className={styles.unavailableText}>
				{message}
			</div>
			{showLockIcon && (
				<div>
					<Lock />
				</div>
			)}
		</div>
	);
}

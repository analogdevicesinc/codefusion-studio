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

import CfsNotification from '../../../../common/components/cfs-notification/CfsNotification';
import {ERROR_MESSAGES} from '../../common/constants/validation-errors';
import type {Errors} from '../../common/types/state';
import styles from './NotificationError.module.scss';

export default function NotificationError({
	error,
	testId
	// eslint-disable-next-line @typescript-eslint/ban-types
}: Readonly<{error: Errors; testId?: string}>): JSX.Element | null {
	if (!error?.notifications?.length) return null;

	return (
		<section className={styles.notificationErrorContainer}>
			{error.notifications.map(errMessageKey => (
				<div
					key={`notification-error-${testId}--${errMessageKey}`}
					data-test={`${testId}--${errMessageKey}`}
					className={styles.item}
				>
					<CfsNotification
						message={ERROR_MESSAGES[errMessageKey]}
						type='error'
						testId={testId ?? ''}
					/>
				</div>
			))}
		</section>
	);
}

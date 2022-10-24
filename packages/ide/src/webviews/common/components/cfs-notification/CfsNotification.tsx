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
import ConflictIcon from '../../icons/Conflict';
import styles from './CfsNotification.module.scss';

type CfsNotificationProps = {
	readonly message: string;
	readonly type?: 'error' | undefined;
	readonly testId?: string;
};

function CfsNotification({
	message,
	type,
	testId
}: CfsNotificationProps) {
	return (
		<div data-test={testId} className={styles.notificationContainer}>
			{type === 'error' ? (
				<div data-test='notification:icon:conflict'>
					<ConflictIcon />
				</div>
			) : (
				''
			)}
			<span data-test='notification:message'>{message}</span>
		</div>
	);
}

export default CfsNotification;

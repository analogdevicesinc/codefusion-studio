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

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

import {useState} from 'react';
import styles from './onboarding.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import {signInRequest} from '../../../../../constants/messages/package-manager-messages';
import {useIsLoggedIn} from '../../state/slices/packages/packages.selector';
import {Button, CloseIcon} from 'cfs-react-library';

export default function Onboarding() {
	const l10n = useLocaleContext()?.onboarding;
	const messenger = useMessenger();
	const [isDismissed, setIsDismissed] = useState(false);
	const isLoggedIn = useIsLoggedIn();

	const isVisible = !isLoggedIn && !isDismissed;

	if (!isVisible) {
		return null;
	}

	const onDismiss = () => {
		setIsDismissed(true);
	};

	const handleSignIn = async () => {
		await messenger.sendRequest(signInRequest, {type: 'extension'});
	};

	return (
		<div className={styles.container}>
			<div className={styles.frame}>
				<div className={styles.textFrame}>
					<span className={styles.signInHeader}>{l10n?.title}</span>
					<span className={styles.signInDesc}>
						{l10n?.description}
					</span>
				</div>
				<Button appearance='primary' onClick={handleSignIn}>
					{l10n?.signIn}
				</Button>
			</div>

			<Button
				appearance='icon'
				ariaLabel={l10n?.dismiss ?? 'Dismiss'}
				className={styles.dismissButton}
				onClick={onDismiss}
			>
				<CloseIcon />
			</Button>
		</div>
	);
}

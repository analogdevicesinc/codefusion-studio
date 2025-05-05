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

import Lock from '@common/icons/Lock';
import styles from './SignalConfig.module.scss';

type SignalConfigProps = {
	readonly isMissingPinAssignement: boolean;
	readonly signal: string;
};

function SignalConfig({
	isMissingPinAssignement,
	signal
}: SignalConfigProps) {
	return (
		<div>
			{isMissingPinAssignement && (
				<div className={styles.unassignedPin}>
					<p data-test='config-unavailable:signal'>
						Configuration unavailable until {signal} is assigned to a
						pin.
					</p>
					<div className={styles.lockIcon}>
						<Lock />
					</div>
				</div>
			)}
		</div>
	);
}

export default SignalConfig;

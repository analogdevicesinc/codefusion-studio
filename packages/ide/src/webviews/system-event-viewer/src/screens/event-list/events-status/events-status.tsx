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

import CircledCheckmarkIcon from '@common/icons/CircledCheckmark';

import styles from '../event-list.module.scss';

export default function EventsStatus() {
	return (
		<>
			<div className={styles.statusItem}>
				<CircledCheckmarkIcon />
				<span>{'<Device name>'}</span>
			</div>
			<div className={styles.statusItem}>
				<CircledCheckmarkIcon />
				<span>Config applied</span>
			</div>
			<div className={styles.statusItem}>
				<CircledCheckmarkIcon />
				<span>Triggered</span>
			</div>
		</>
	);
}

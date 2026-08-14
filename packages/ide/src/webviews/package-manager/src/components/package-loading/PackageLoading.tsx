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

import {CheckBox} from 'cfs-react-library';
import styles from './package-loading.module.scss';

export default function PackageLoading() {
	return (
		<div className={styles.packageLoading}>
			<div className={styles.checkbox}>
				<CheckBox isDisabled checked={false} />
			</div>
			<div className={styles.content}>
				<div className={styles.contentHeader}>
					<div className={styles.skeletonTextSm} />
					<div
						className={styles.skeletonTextSm}
						style={{width: '33px'}}
					/>
				</div>
				<div className={styles.contentBody}>
					<div className={styles.skeletonTextLg} />
				</div>
			</div>
		</div>
	);
}

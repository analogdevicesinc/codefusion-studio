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
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import CfsNavigation from '@common/components/cfs-navigation/CfsNavigation';
import {availableIcons} from '../../constants/navigation-icons';
import styles from './screen-loader.module.scss';

export default function ScreenLoader() {
	return (
		<div className={styles.loadingContainer}>
			<CfsTopBar>
				<div slot='center'>...</div>
			</CfsTopBar>
			<div className={styles.mainContentLoading}>
				<CfsNavigation
					activeScreen=''
					availableIcons={availableIcons}
					onNavItemClick={() => {
						void 0;
					}}
				/>
				<div className={styles.shimmerBody}>
					<div className={styles.shimmer} />
				</div>
			</div>
		</div>
	);
}

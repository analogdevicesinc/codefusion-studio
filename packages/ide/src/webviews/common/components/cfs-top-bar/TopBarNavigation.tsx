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
import LeftArrowIcon from '../../icons/LeftArrow';
import RightArrowIcon from '../../icons/RightArrow';
import TopbarButton from './TopbarButton';
import styles from './TopbarNavigation.module.scss';

function TopbarNavigation({
	navigateBackHandler,
	navigateForwardHandler
}: {
	readonly navigateBackHandler: () => void;
	readonly navigateForwardHandler: () => void;
}) {
	return (
		<div className={styles.navButtons}>
			<TopbarButton
				title='Back'
				icon={<LeftArrowIcon />}
				clickHandler={navigateBackHandler}
			/>
			<TopbarButton
				title='Forward'
				icon={<RightArrowIcon />}
				clickHandler={navigateForwardHandler}
			/>
		</div>
	);
}

export default TopbarNavigation;

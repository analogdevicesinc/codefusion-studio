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

import { useActiveScreen, useActiveScreenSubscreen, useActiveScreenSubScreens } from '../../state/slices/app-context/appContext.selector';
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import { Modal } from '@common/components/modal/Modal';
import Help from '@common/icons/Help';
import { type NavigationItem } from '@common/types/navigation';
import { LocalizedMessage as t } from '@common/components/l10n/LocalizedMessage';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import { Direction } from '@common/components/tooltip/Tooltip';
import { useState } from 'react';
import { useAppDispatch } from '../../state/store';
import { setActiveScreenSubscreen } from '../../state/slices/app-context/appContext.reducer';
import styles from './CfgtoolsTopbar.module.scss';

export default function CfgtoolsHeader() {
	const dispatch = useAppDispatch();
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	const id = useActiveScreen() as NavigationItem;
	const activeScreenSubScreens = useActiveScreenSubScreens();
	const activeScreenSubscreen = useActiveScreenSubscreen();

	const changeActiveSubscreen = (subscreen: NavigationItem) => {
		dispatch(setActiveScreenSubscreen(subscreen));
	}

	return (
		<CfsTopBar>
			<div slot='end'>
				<TopbarButton
					title={t({ id: `${id}.help.title` })}
					icon={<Help />}
					tooltipType='long'
					tooltipDirection={Direction.Left}
					clickHandler={onToggleHelpModal}
				/>
			</div>
			<div slot='center'>
				{activeScreenSubScreens && activeScreenSubScreens.length > 0 ?
					<div data-test='subscreen-buttons-container' className={styles.subscreenButtonsContainer}>
						<div className={styles.subscreenButtons}>
							{activeScreenSubScreens.map(subscreen => (
								<div key={subscreen} data-test={`subscreen-button:${subscreen}`} className={`${styles.subscreenButton} ${subscreen === activeScreenSubscreen ? styles.active : ''}`} onClick={() => { changeActiveSubscreen(subscreen) }}>
									{t({ id: `${subscreen}.title` })}
								</div>
							))}
						</div>
					</div>
					:
					<>
						{t({ id: `${id}.title` })}
					</>}
			</div>

			<div slot='modal'>
				<Modal
					isOpen={isHelpModalOpen}
					handleModalClose={onToggleHelpModal}
				>
					<div style={{ textAlign: 'left' }}>
						<h1>{t({ id: `${id}.help.title` })}</h1>
						{t({
							parseHtml: true,
							id: `${id}.description`
						})}
					</div>
				</Modal>
			</div>
		</CfsTopBar>
	);
}
